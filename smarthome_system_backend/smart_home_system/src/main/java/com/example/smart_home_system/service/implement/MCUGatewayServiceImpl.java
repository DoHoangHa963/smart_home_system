package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.MCU.MCUAutoPairRequest;
import com.example.smart_home_system.dto.request.MCU.MCUHeartbeatRequest;
import com.example.smart_home_system.dto.request.MCU.MCUPairingRequest;
import com.example.smart_home_system.dto.response.DashboardDataResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.dto.response.MCU.MCUGatewayResponse;
import com.example.smart_home_system.dto.response.MCU.MCUPairingInitResponse;
import com.example.smart_home_system.dto.response.MCU.MCUPairingResponse;
import com.example.smart_home_system.dto.response.MCU.MCUSensorDataResponse;
import com.example.smart_home_system.dto.response.MCU.MCUCommandsResponse;
import com.example.smart_home_system.dto.response.MCU.MCUDeviceCommandResponse;
import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.mapper.DeviceMapper;
import com.example.smart_home_system.mapper.HomeMapper;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.entity.Home;
import com.example.smart_home_system.entity.MCUGateway;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.MCUStatus;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.DeviceMetric;
import com.example.smart_home_system.entity.MCUDeviceCommand;
import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.repository.DeviceMetricRepository;
import com.example.smart_home_system.repository.DeviceRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.MCUGatewayRepository;
import com.example.smart_home_system.repository.MCUDeviceCommandRepository;
import com.example.smart_home_system.repository.RFIDAccessLogRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.MCUGatewayService;
import com.example.smart_home_system.service.MqttService;
import com.example.smart_home_system.util.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Implementation of {@link MCUGatewayService} for managing ESP32 MCU Gateway
 * operations.
 * 
 * <p>
 * This service provides the core business logic for:
 * <ul>
 * <li><b>Pairing Management:</b> Initialize, confirm, and unpair MCU
 * Gateways</li>
 * <li><b>Heartbeat Processing:</b> Track online status and update gateway
 * information</li>
 * <li><b>API Key Generation:</b> Secure key generation for MCU
 * authentication</li>
 * <li><b>Home Association:</b> Link MCU Gateways with specific homes</li>
 * </ul>
 * 
 * <p>
 * <b>Pairing Flow:</b>
 * 
 * <pre>
 * 1. initPairing() - Creates MCU in PAIRING state, returns available homes
 * 2. confirmPairing() - User confirms home selection, generates API Key
 * 3. MCU receives API Key and starts sending heartbeats
 * </pre>
 * 
 * <p>
 * <b>Thread Safety:</b> This service is transactional and thread-safe.
 * All methods are executed within Spring-managed transactions.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUGatewayService
 * @see MCUGateway
 */
@Service("mcuGatewayService")
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MCUGatewayServiceImpl implements MCUGatewayService {

    private final MCUGatewayRepository mcuGatewayRepository;
    private final HomeRepository homeRepository;
    private final HomeMemberRepository homeMemberRepository;
    private final UserRepository userRepository;
    private final HomeMapper homeMapper;
    private final DeviceMapper deviceMapper;
    private final DeviceRepository deviceRepository;
    private final DeviceMetricRepository deviceMetricRepository;
    private final MCUDeviceCommandRepository mcuDeviceCommandRepository;
    private final RFIDAccessLogRepository rfidAccessLogRepository;
    private final MqttService mqttService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public MCUPairingInitResponse initPairing(MCUAutoPairRequest request) {
        // Lấy user hiện tại
        String currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Kiểm tra Home có tồn tại không
        Home home = homeRepository.findById(request.getHomeId())
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));

        // Kiểm tra Home đã có MCU Gateway chưa
        if (mcuGatewayRepository.existsByHomeId(request.getHomeId())) {
            throw new AppException(ErrorCode.MCU_ALREADY_PAIRED);
        }

        // Kiểm tra Serial Number đã tồn tại chưa
        if (mcuGatewayRepository.findBySerialNumber(request.getSerialNumber()).isPresent()) {
            throw new AppException(ErrorCode.MCU_SERIAL_EXISTS);
        }

        // Tạo MCU Gateway với status PAIRING và home đã chọn
        String mcuName = request.getName() != null && !request.getName().isEmpty()
                ? request.getName()
                : "MCU Gateway - " + request.getSerialNumber();

        MCUGateway mcuGateway = MCUGateway.builder()
                .serialNumber(request.getSerialNumber())
                .name(mcuName)
                .ipAddress(request.getIpAddress())
                .firmwareVersion(request.getFirmwareVersion())
                .status(MCUStatus.PAIRING)
                .home(home) // Set home ngay từ đầu
                .pairedBy(currentUser)
                .pairedAt(LocalDateTime.now())
                .metadata(request.getMetadata())
                .build();

        mcuGateway = mcuGatewayRepository.save(mcuGateway);
        log.info("MCU Gateway pairing initiated: serialNumber={}, mcuGatewayId={}, homeId={}",
                request.getSerialNumber(), mcuGateway.getId(), home.getId());

        return MCUPairingInitResponse.builder()
                .mcuGatewayId(mcuGateway.getId())
                .serialNumber(mcuGateway.getSerialNumber())
                .name(mcuGateway.getName())
                .homeId(home.getId())
                .homeName(home.getName())
                .message("MCU Gateway pairing initiated for home: " + home.getName())
                .build();
    }

    @Override
    public MCUPairingResponse pairMCU(Long homeId, MCUPairingRequest request) {
        // Kiểm tra Home có tồn tại không
        Home home = homeRepository.findById(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));

        // Kiểm tra Home đã có MCU Gateway chưa
        if (mcuGatewayRepository.existsByHomeId(homeId)) {
            throw new AppException(ErrorCode.MCU_ALREADY_PAIRED);
        }

        // Kiểm tra Serial Number đã tồn tại chưa
        if (mcuGatewayRepository.findBySerialNumber(request.getSerialNumber()).isPresent()) {
            throw new AppException(ErrorCode.MCU_SERIAL_EXISTS);
        }

        // Lấy user hiện tại
        String currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Tạo MCU Gateway với status PAIRING
        MCUGateway mcuGateway = MCUGateway.builder()
                .serialNumber(request.getSerialNumber())
                .name(request.getName())
                .ipAddress(request.getIpAddress())
                .firmwareVersion(request.getFirmwareVersion())
                .status(MCUStatus.PAIRING)
                .home(home)
                .pairedBy(currentUser)
                .pairedAt(LocalDateTime.now())
                .metadata(request.getMetadata())
                .build();

        mcuGateway = mcuGatewayRepository.save(mcuGateway);
        log.info("MCU Gateway created with status PAIRING: serialNumber={}, homeId={}",
                request.getSerialNumber(), homeId);

        // Trả về response (chưa có API Key, cần confirm)
        return MCUPairingResponse.builder()
                .mcuGatewayId(mcuGateway.getId())
                .homeId(homeId)
                .message("MCU Gateway created. Please confirm pairing on the frontend.")
                .build();
    }

    @Override
    public MCUPairingResponse confirmPairing(Long mcuGatewayId, Long homeId) {
        MCUGateway mcuGateway = mcuGatewayRepository.findById(mcuGatewayId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        if (mcuGateway.getStatus() != MCUStatus.PAIRING) {
            throw new AppException(ErrorCode.MCU_NOT_IN_PAIRING_STATE);
        }

        // Kiểm tra Home có tồn tại không
        Home home = homeRepository.findById(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));

        // Kiểm tra Home đã có MCU Gateway khác chưa (loại trừ MCU đang được confirm)
        // Vì MCU đang confirm đã được tạo trong initPairing với home này, nên cần loại
        // trừ nó
        if (mcuGatewayRepository.existsByHomeIdExcludingMcu(homeId, mcuGatewayId)) {
            throw new AppException(ErrorCode.MCU_ALREADY_PAIRED);
        }

        // Kiểm tra user có quyền với home này không (phải là OWNER)
        String currentUserId = SecurityUtils.getCurrentUserId();
        if (!home.getOwner().getId().equals(currentUserId)) {
            throw new AppException(ErrorCode.HOME_ACCESS_DENIED);
        }

        // Pair MCU với home đã chọn
        String apiKey = generateApiKey(mcuGateway.getSerialNumber());
        mcuGateway.setApiKey(apiKey);
        mcuGateway.setStatus(MCUStatus.ONLINE);
        mcuGateway.setHome(home);
        mcuGateway.setLastHeartbeat(LocalDateTime.now());

        mcuGateway = mcuGatewayRepository.save(mcuGateway);
        log.info("MCU Gateway paired successfully: id={}, serialNumber={}, homeId={}, homeName={}",
                mcuGatewayId, mcuGateway.getSerialNumber(), homeId, home.getName());

        return MCUPairingResponse.builder()
                .apiKey(apiKey)
                .mcuGatewayId(mcuGateway.getId())
                .homeId(homeId)
                .message("MCU Gateway paired successfully with home: " + home.getName())
                .build();
    }

    @Override
    public void processHeartbeat(String apiKey, MCUHeartbeatRequest request) {
        MCUGateway mcuGateway = mcuGatewayRepository.findByApiKey(apiKey)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_INVALID_API_KEY));

        // Update heartbeat và thông tin
        MCUStatus oldStatus = mcuGateway.getStatus();
        mcuGateway.updateHeartbeat();
        MCUStatus newStatus = mcuGateway.getStatus();

        if (oldStatus != newStatus) {
            log.info("MCU Gateway status changed: {} -> {} (id={}, serialNumber={})",
                    oldStatus, newStatus, mcuGateway.getId(), mcuGateway.getSerialNumber());
        }

        if (request.getIpAddress() != null) {
            mcuGateway.setIpAddress(request.getIpAddress());
        }
        if (request.getFirmwareVersion() != null) {
            mcuGateway.setFirmwareVersion(request.getFirmwareVersion());
        }

        // Parse và lưu sensor data từ ESP32
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            try {
                // Lưu sensor data vào MCUGateway metadata để frontend có thể lấy ngay
                // Không cần phải có devices trước
                mcuGateway.setMetadata(request.getStatus());
                log.debug("Saved sensor data to metadata: {}",
                        request.getStatus().substring(0, Math.min(100, request.getStatus().length())));

                // Process sensor data để update devices nếu có
                processSensorData(mcuGateway, request.getStatus());

                // Sensor data đã được lưu vào metadata, frontend sẽ poll để lấy
                // Không cần SSE broadcast nữa - chỉ dùng polling
            } catch (Exception e) {
                log.warn("Failed to process sensor data from MCU Gateway: {}", e.getMessage(), e);
                // Không throw exception để không làm gián đoạn heartbeat
            }
        }

        mcuGatewayRepository.save(mcuGateway);
    }

    @Override
    @Transactional
    public void processSensorDataFromMQTT(Long homeId, String sensorDataJson) {
        Optional<MCUGateway> mcuOpt = mcuGatewayRepository.findByHomeId(homeId);
        if (mcuOpt.isPresent()) {
            MCUGateway mcuGateway = mcuOpt.get();

            // Save sensor data (including automation config) to metadata for frontend to
            // fetch
            mcuGateway.setMetadata(sensorDataJson);
            mcuGateway.setLastHeartbeat(java.time.LocalDateTime.now());
            mcuGatewayRepository.save(mcuGateway);

            log.debug("Saved sensor data to MCU Gateway metadata: homeId={}, dataLength={}",
                    homeId, sensorDataJson.length());

            // Process sensor data to update device states
            processSensorData(mcuGateway, sensorDataJson);
        } else {
            log.warn("MCU Gateway not found for homeId={}, cannot process sensor data", homeId);
        }
    }

    @Override
    @Transactional
    public void processDeviceStatusUpdate(Long homeId, String deviceStatusJson) {
        try {
            JsonNode data = objectMapper.readTree(deviceStatusJson);
            log.info("Processing device status update for homeId={}: {}", homeId, deviceStatusJson);

            // Lấy thông tin từ JSON
            Integer gpioPin = data.has("gpioPin") ? data.get("gpioPin").asInt() : null;
            String deviceCode = data.has("deviceCode") ? data.get("deviceCode").asText() : null;
            String statusStr = data.has("status") ? data.get("status").asText() : null;
            String stateValue = data.has("stateValue") ? data.get("stateValue").asText() : null;

            if (gpioPin == null && deviceCode == null) {
                log.warn("Device status update missing gpioPin and deviceCode, skipping");
                return;
            }

            // Tìm device theo GPIO pin hoặc deviceCode
            // Sử dụng findByRoomHomeId để hỗ trợ cả device có home.id trực tiếp và
            // room.home.id
            List<Device> devices = deviceRepository
                    .findByRoomHomeId(homeId, org.springframework.data.domain.Pageable.unpaged())
                    .getContent();

            Device device = devices.stream()
                    .filter(d -> {
                        // Ưu tiên tìm bằng GPIO pin
                        if (gpioPin != null && d.getGpioPin() != null && d.getGpioPin().equals(gpioPin)) {
                            return true;
                        }
                        // Fallback: tìm bằng deviceCode
                        if (deviceCode != null && d.getDeviceCode() != null &&
                                d.getDeviceCode().equalsIgnoreCase(deviceCode)) {
                            return true;
                        }
                        return false;
                    })
                    .findFirst()
                    .orElse(null);

            if (device == null) {
                log.warn("Device not found for gpioPin={}, deviceCode={}, homeId={}",
                        gpioPin, deviceCode, homeId);
                return;
            }

            // Cập nhật device status
            if (statusStr != null) {
                try {
                    DeviceStatus status = DeviceStatus.valueOf(statusStr.toUpperCase());
                    DeviceStatus oldStatus = device.getStatus();
                    device.setStatus(status);
                    log.info("Updated device {} status from {} to {}", device.getDeviceCode(), oldStatus, status);
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid device status: {}, skipping status update", statusStr);
                }
            }

            // Cập nhật stateValue nếu có
            if (stateValue != null) {
                String oldStateValue = device.getStateValue();
                device.setStateValue(stateValue);
                log.info("Updated device {} stateValue from {} to {}", device.getDeviceCode(), oldStateValue,
                        stateValue);
            }

            // Lưu vào database
            deviceRepository.save(device);
            log.info("✅ Device status updated in database: deviceCode={}, gpioPin={}, status={}, homeId={}",
                    device.getDeviceCode(), gpioPin, statusStr, homeId);

        } catch (Exception e) {
            log.error("Error processing device status update for homeId={}: {}", homeId, e.getMessage(), e);
        }
    }

    /**
     * Parse và lưu sensor data từ ESP32 vào DeviceMetric và update Device state
     * Sensor data format từ ESP32:
     * {
     * "tempIn": 25.5, "humIn": 60,
     * "tempOut": 28.0, "humOut": 55,
     * "gas": 500, "light": 300, "rain": 4095,
     * "flame": false, "motion": true,
     * "door": false, "lightStatus": true, "fanStatus": false,
     * "gasAlert": false, "emergency": false
     * }
     */
    private void processSensorData(MCUGateway mcuGateway, String sensorDataJson) {
        try {
            JsonNode sensorData = objectMapper.readTree(sensorDataJson);

            // Mapping sensor names từ ESP32 với GPIO pins (từ config.h)
            // GPIO pins: PIN_RELAY_LIGHT=42, PIN_RELAY_FAN=21, PIN_SERVO=18,
            // PIN_MQ2=4, PIN_LDR=5, PIN_RAIN=3, PIN_FLAME=6, PIN_PIR=41,
            // PIN_DHT_IN=7, PIN_DHT_OUT=16
            Map<String, Integer> sensorToGpioPin = new HashMap<>();
            sensorToGpioPin.put("lightStatus", 42); // PIN_RELAY_LIGHT
            sensorToGpioPin.put("fanStatus", 21); // PIN_RELAY_FAN
            sensorToGpioPin.put("door", 18); // PIN_SERVO
            sensorToGpioPin.put("gas", 4); // PIN_MQ2
            sensorToGpioPin.put("light", 5); // PIN_LDR
            sensorToGpioPin.put("rain", 3); // PIN_RAIN
            sensorToGpioPin.put("flame", 6); // PIN_FLAME
            sensorToGpioPin.put("motion", 41); // PIN_PIR
            sensorToGpioPin.put("tempIn", 7); // PIN_DHT_IN
            sensorToGpioPin.put("humIn", 7); // PIN_DHT_IN (same pin)
            sensorToGpioPin.put("tempOut", 16); // PIN_DHT_OUT
            sensorToGpioPin.put("humOut", 16); // PIN_DHT_OUT (same pin)

            // Lấy tất cả devices của home này được quản lý bởi MCU Gateway này
            Long homeId = mcuGateway.getHome() != null ? mcuGateway.getHome().getId() : null;
            if (homeId == null) {
                log.warn("MCU Gateway has no home associated, skipping sensor data processing");
                return;
            }

            List<Device> devices = deviceRepository
                    .findAllByRoom_Home_Id(homeId, org.springframework.data.domain.Pageable.unpaged()).getContent();

            // QUAN TRỌNG: Khi nhận được sensor data từ MCU, tất cả devices của home này
            // được coi là ONLINE (vì MCU đang hoạt động và gửi data)
            // Cập nhật status từ OFFLINE sang ONLINE cho tất cả devices
            // (Status ON/OFF sẽ được cập nhật sau khi process sensor values cụ thể)
            for (Device device : devices) {
                if (device.getStatus() == DeviceStatus.OFFLINE) {
                    // Set status = ONLINE khi MCU online và gửi data
                    // Status sẽ được cập nhật lại thành ON/OFF nếu có sensor value tương ứng
                    device.setStatus(DeviceStatus.ONLINE);
                    deviceRepository.save(device);
                    log.debug("Updated device {} status from OFFLINE to ONLINE (MCU online)", device.getDeviceCode());
                }
            }

            // Process từng sensor value để cập nhật state cụ thể
            for (Map.Entry<String, Integer> entry : sensorToGpioPin.entrySet()) {
                String sensorName = entry.getKey();
                Integer gpioPin = entry.getValue();

                if (!sensorData.has(sensorName)) {
                    continue;
                }

                // Tìm device có GPIO pin match (ưu tiên GPIO pin, fallback về deviceCode
                // prefix)
                Device device = devices.stream()
                        .filter(d -> {
                            // Ưu tiên tìm bằng GPIO pin (chính xác nhất)
                            if (d.getGpioPin() != null && d.getGpioPin().equals(gpioPin)) {
                                return true;
                            }
                            // Fallback: tìm bằng deviceCode prefix (cho backward compatibility)
                            String deviceCodePrefix = getDeviceCodePrefixFromGpio(gpioPin);
                            return d.getDeviceCode() != null && d.getDeviceCode().startsWith(deviceCodePrefix);
                        })
                        .findFirst()
                        .orElse(null);

                if (device == null) {
                    // Device chưa được tạo hoặc chưa được gán GPIO pin
                    log.debug("Device with GPIO pin {} not found for sensor {}", gpioPin, sensorName);
                    continue;
                }

                // Lấy giá trị sensor
                JsonNode valueNode = sensorData.get(sensorName);
                Object value = null;
                if (valueNode.isNumber()) {
                    value = valueNode.asDouble();
                } else if (valueNode.isBoolean()) {
                    value = valueNode.asBoolean();
                } else {
                    value = valueNode.asText();
                }

                // Update device state (sẽ set status = ONLINE/ON/OFF)
                updateDeviceState(device, sensorName, value);

                // Lưu vào DeviceMetric
                saveDeviceMetric(device, sensorName, value);
            }

            log.debug("Processed sensor data from MCU Gateway: {}", mcuGateway.getId());

        } catch (Exception e) {
            log.error("Error parsing sensor data JSON: {}", sensorDataJson, e);
            throw new RuntimeException("Failed to parse sensor data", e);
        }
    }

    /**
     * Helper method để lấy deviceCode prefix từ GPIO pin (cho backward
     * compatibility)
     */
    private String getDeviceCodePrefixFromGpio(Integer gpioPin) {
        switch (gpioPin) {
            case 42:
                return "LIGHT_RELAY";
            case 21:
                return "FAN_RELAY";
            case 18:
                return "DOOR_SERVO";
            case 4:
                return "GAS_SENSOR";
            case 5:
                return "LIGHT_SENSOR";
            case 3:
                return "RAIN_SENSOR";
            case 6:
                return "FLAME_SENSOR";
            case 41:
                return "MOTION_SENSOR";
            case 7:
                return "TEMP_HUMIDITY_IN";
            case 16:
                return "TEMP_HUMIDITY_OUT";
            default:
                return "";
        }
    }

    /**
     * Update device state từ sensor value
     * 
     * QUAN TRỌNG: Phân biệt rõ:
     * - DeviceStatus (ONLINE/OFFLINE): Thiết bị có kết nối với hệ thống hay không
     * - Device State (stateValue JSON): Trạng thái hoạt động của thiết bị (ON/OFF,
     * OPEN/CLOSE)
     * 
     * Khi nhận được sensor data từ ESP32, thiết bị luôn được coi là ONLINE (đã kết
     * nối),
     * còn giá trị sensor (door: false = cửa đóng) là STATE, không phải STATUS.
     */
    private void updateDeviceState(Device device, String sensorName, Object value) {
        try {
            Map<String, Object> stateMap = new HashMap<>();

            // Nếu device đã có stateValue, parse nó
            if (device.getStateValue() != null && !device.getStateValue().trim().isEmpty()) {
                try {
                    JsonNode existingState = objectMapper.readTree(device.getStateValue());
                    existingState.fields()
                            .forEachRemaining(entry -> stateMap.put(entry.getKey(), entry.getValue().asText()));
                } catch (Exception e) {
                    log.warn("Failed to parse existing stateValue for device {}", device.getDeviceCode());
                }
            }

            // Update với giá trị mới - lưu vào state, KHÔNG phải status
            stateMap.put(sensorName, value);

            // Logic update Status:
            // - Actuators (Light, Fan, Door): ON/OFF (để hiển thị màu Green/Gray trên FE)
            // - Sensors: ONLINE (để hiển thị màu Blue - Connected)
            if (sensorName.equals("lightStatus") || sensorName.equals("fanStatus") || sensorName.equals("door")) {
                boolean isOn = (Boolean) value;
                device.setStatus(isOn ? DeviceStatus.ON : DeviceStatus.OFF);
                stateMap.put("power", isOn ? "ON" : "OFF");
            } else {
                device.setStatus(DeviceStatus.ONLINE);
            }

            // Lưu stateValue dưới dạng JSON
            device.setStateValue(objectMapper.writeValueAsString(stateMap));
            deviceRepository.save(device);

            log.debug("Updated device {} state: sensorName={}, value={}, status=ONLINE",
                    device.getDeviceCode(), sensorName, value);

        } catch (Exception e) {
            log.error("Error updating device state for device {}: {}", device.getDeviceCode(), e.getMessage());
        }
    }

    /**
     * Lưu sensor data vào DeviceMetric
     */
    private void saveDeviceMetric(Device device, String sensorName, Object value) {
        try {
            Map<String, Object> metricData = new HashMap<>();
            metricData.put("sensor", sensorName);
            metricData.put("value", value);
            metricData.put("timestamp", LocalDateTime.now().toString());

            DeviceMetric metric = DeviceMetric.builder()
                    .device(device)
                    .metricsData(objectMapper.writeValueAsString(metricData))
                    .build();

            deviceMetricRepository.save(metric);

        } catch (Exception e) {
            log.error("Error saving device metric for device {}: {}", device.getDeviceCode(), e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true, timeout = 5) // Thêm timeout để tránh giữ connection quá lâu
    public MCUGatewayResponse getByHomeId(Long homeId) {
        MCUGateway mcuGateway = mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));
        return toResponse(mcuGateway);
    }

    @Override
    @Transactional(readOnly = true)
    public MCUGatewayResponse getById(Long mcuGatewayId) {
        MCUGateway mcuGateway = mcuGatewayRepository.findById(mcuGatewayId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));
        return toResponse(mcuGateway);
    }

    @Override
    public void unpairMCU(Long mcuGatewayId) {
        MCUGateway mcuGateway = mcuGatewayRepository.findById(mcuGatewayId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        Long homeId = mcuGateway.getHome() != null ? mcuGateway.getHome().getId() : null;
        String serialNumber = mcuGateway.getSerialNumber();

        // Kiểm tra permission: chỉ owner hoặc admin mới có thể unpair
        if (homeId != null) {
            String currentUserId = SecurityUtils.getCurrentUserId();

            // Check xem user có phải admin hệ thống không
            boolean isAdmin = SecurityUtils.getCurrentUserPrincipal().getAuthorities().stream()
                    .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));

            // Nếu không phải admin, check xem có phải owner của home không
            if (!isAdmin) {
                boolean isOwner = homeMemberRepository.findByHomeIdAndUserIdAndRole(
                        homeId,
                        currentUserId,
                        HomeMemberRole.OWNER).isPresent();

                if (!isOwner) {
                    throw new AppException(ErrorCode.HOME_ACCESS_DENIED);
                }
            }
        }

        // Xóa tất cả dữ liệu liên quan đến MCU Gateway trước khi xóa MCU Gateway
        // Điều này cần thiết để tránh lỗi foreign key constraint

        // 1. Xóa tất cả device commands
        int deletedCommands = mcuDeviceCommandRepository.deleteByMcuGatewayId(mcuGatewayId);
        log.debug("Deleted {} commands for MCU Gateway: id={}", deletedCommands, mcuGatewayId);

        // 2. Xóa tất cả RFID access logs
        int deletedLogs = rfidAccessLogRepository.deleteByMcuGatewayId(mcuGatewayId);
        log.debug("Deleted {} RFID access logs for MCU Gateway: id={}", deletedLogs, mcuGatewayId);

        // 3. Cập nhật devices: set mcuGateway = null cho tất cả devices được quản lý
        // bởi MCU này
        int updatedDevices = deviceRepository.clearMcuGatewayFromDevices(mcuGatewayId);
        log.debug("Cleared MCU Gateway reference from {} devices: id={}", updatedDevices, mcuGatewayId);

        // 4. Xóa hoàn toàn MCU Gateway khỏi database
        // ESP32 sẽ không thể authenticate nữa vì API Key bị xóa
        // User có thể pair lại MCU mới cho home này
        mcuGatewayRepository.delete(mcuGateway);

        log.info(
                "MCU Gateway deleted: id={}, serialNumber={}, homeId={}, deletedCommands={}, deletedLogs={}, updatedDevices={}",
                mcuGatewayId, serialNumber, homeId, deletedCommands, deletedLogs, updatedDevices);
    }

    @Override
    public MCUGatewayResponse updateIPAddress(Long mcuGatewayId, String ipAddress) {
        MCUGateway mcuGateway = mcuGatewayRepository.findById(mcuGatewayId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        Long homeId = mcuGateway.getHome() != null ? mcuGateway.getHome().getId() : null;

        // Kiểm tra permission: chỉ owner hoặc admin mới có thể update
        if (homeId != null) {
            String currentUserId = SecurityUtils.getCurrentUserId();

            // Check xem user có phải admin hệ thống không
            boolean isAdmin = SecurityUtils.getCurrentUserPrincipal().getAuthorities().stream()
                    .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));

            // Nếu không phải admin, check xem có phải owner của home không
            if (!isAdmin) {
                boolean isOwner = homeMemberRepository.findByHomeIdAndUserIdAndRole(
                        homeId,
                        currentUserId,
                        HomeMemberRole.OWNER).isPresent();

                if (!isOwner) {
                    throw new AppException(ErrorCode.HOME_ACCESS_DENIED);
                }
            }
        }

        // Update IP address
        mcuGateway.setIpAddress(ipAddress);
        mcuGateway = mcuGatewayRepository.save(mcuGateway);

        log.info("MCU Gateway IP address updated: id={}, newIP={}", mcuGatewayId, ipAddress);

        return toResponse(mcuGateway);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean verifyApiKey(String apiKey) {
        return mcuGatewayRepository.findByApiKey(apiKey).isPresent();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canUnpairMCU(Long mcuGatewayId) {
        MCUGateway mcuGateway = mcuGatewayRepository.findById(mcuGatewayId)
                .orElse(null);

        if (mcuGateway == null || mcuGateway.getHome() == null) {
            return false;
        }

        Long homeId = mcuGateway.getHome().getId();
        // Check xem user có phải owner của home không
        // Method này sẽ được gọi từ controller với @PreAuthorize check admin
        // Nên chỉ cần check owner ở đây
        String currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            return false;
        }

        return homeMemberRepository.findByHomeIdAndUserIdAndRole(
                homeId,
                currentUserId,
                HomeMemberRole.OWNER).isPresent();
    }

    /**
     * Generate API Key cho ESP32
     * Format: mcu_{serialNumber}_{randomBase64}
     * 
     * Note: API Key này được cung cấp một lần duy nhất khi pairing và không có thời
     * gian hết hạn.
     * API Key sẽ tồn tại vĩnh viễn cho đến khi MCU Gateway bị unpair hoặc bị xóa.
     * Không có cơ chế refresh token hoặc token expiration cho MCU Gateway.
     */
    private String generateApiKey(String serialNumber) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String randomPart = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        return "mcu_" + serialNumber + "_" + randomPart;
    }

    @Override
    @Transactional(readOnly = true)
    public MCUSensorDataResponse getSensorDataByHomeId(Long homeId) {
        MCUGateway mcuGateway = mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        MCUSensorDataResponse.MCUSensorDataResponseBuilder builder = MCUSensorDataResponse.builder()
                .mcuGatewayId(mcuGateway.getId())
                .serialNumber(mcuGateway.getSerialNumber())
                .lastUpdate(mcuGateway.getLastHeartbeat());

        Map<String, Object> rawData = new HashMap<>();

        // Ưu tiên lấy sensor data từ MCUGateway metadata (từ heartbeat mới nhất)
        if (mcuGateway.getMetadata() != null && !mcuGateway.getMetadata().trim().isEmpty()) {
            try {
                log.debug("Parsing sensor data from metadata: {}",
                        mcuGateway.getMetadata().substring(0, Math.min(200, mcuGateway.getMetadata().length())));
                JsonNode sensorData = objectMapper.readTree(mcuGateway.getMetadata());
                log.debug("Parsed sensor data successfully, fields: {}", sensorData.size());
                sensorData.fields().forEachRemaining(entry -> {
                    String key = entry.getKey();
                    JsonNode value = entry.getValue();

                    Object valueObj = value.isNumber() ? value.asDouble()
                            : value.isBoolean() ? value.asBoolean() : value.asText();
                    rawData.put(key, valueObj);

                    // Map to response fields
                    switch (key) {
                        case "tempIn":
                            builder.tempIn(value.asDouble());
                            break;
                        case "humIn":
                            builder.humIn(value.asDouble());
                            break;
                        case "tempOut":
                            builder.tempOut(value.asDouble());
                            break;
                        case "humOut":
                            builder.humOut(value.asDouble());
                            break;
                        case "gas":
                            builder.gas(value.asInt());
                            break;
                        case "light":
                            builder.light(value.asInt());
                            break;
                        case "rain":
                            builder.rain(value.asInt());
                            break;
                        case "flame":
                            builder.flame(value.asBoolean());
                            break;
                        case "motion":
                            builder.motion(value.asBoolean());
                            break;
                        case "door":
                            builder.door(value.asBoolean());
                            break;
                        case "lightStatus":
                            builder.lightStatus(value.asBoolean());
                            break;
                        case "fanStatus":
                            builder.fanStatus(value.asBoolean());
                            break;
                        case "gasAlert":
                            builder.gasAlert(value.asBoolean());
                            break;
                        case "emergency":
                            builder.emergency(value.asBoolean());
                            break;
                        // Automation configuration fields
                        case "autoLight":
                            builder.autoLight(value.asBoolean());
                            break;
                        case "autoFan":
                            builder.autoFan(value.asBoolean());
                            break;
                        case "autoCloseDoor":
                            builder.autoCloseDoor(value.asBoolean());
                            break;
                        case "autoLightThreshold":
                            builder.autoLightThreshold(value.asInt());
                            break;
                        case "autoFanThreshold":
                            builder.autoFanThreshold(value.asInt());
                            break;
                        case "gasAlertThreshold":
                            builder.gasAlertThreshold(value.asInt());
                            break;
                    }
                });
            } catch (Exception e) {
                log.warn("Failed to parse metadata sensor data: {}", e.getMessage(), e);
                log.warn("Metadata content: {}", mcuGateway.getMetadata());
            }
        }

        // Fallback: Lấy sensor data từ devices nếu metadata không có
        if (rawData.isEmpty()) {
            List<Device> devices = deviceRepository
                    .findAllByRoom_Home_Id(homeId, org.springframework.data.domain.Pageable.unpaged()).getContent();

            for (Device device : devices) {
                if (device.getStateValue() == null || device.getStateValue().trim().isEmpty()) {
                    continue;
                }

                try {
                    JsonNode stateData = objectMapper.readTree(device.getStateValue());
                    stateData.fields().forEachRemaining(entry -> {
                        String key = entry.getKey();
                        JsonNode value = entry.getValue();

                        if (!rawData.containsKey(key)) { // Chỉ thêm nếu chưa có từ metadata
                            Object valueObj = value.isNumber() ? value.asDouble()
                                    : value.isBoolean() ? value.asBoolean() : value.asText();
                            rawData.put(key, valueObj);

                            // Map to response fields (chỉ set nếu chưa có)
                            switch (key) {
                                case "tempIn":
                                    if (builder.build().getTempIn() == null)
                                        builder.tempIn(value.asDouble());
                                    break;
                                case "humIn":
                                    if (builder.build().getHumIn() == null)
                                        builder.humIn(value.asDouble());
                                    break;
                                case "tempOut":
                                    if (builder.build().getTempOut() == null)
                                        builder.tempOut(value.asDouble());
                                    break;
                                case "humOut":
                                    if (builder.build().getHumOut() == null)
                                        builder.humOut(value.asDouble());
                                    break;
                                case "gas":
                                    if (builder.build().getGas() == null)
                                        builder.gas(value.asInt());
                                    break;
                                case "light":
                                    if (builder.build().getLight() == null)
                                        builder.light(value.asInt());
                                    break;
                                case "rain":
                                    if (builder.build().getRain() == null)
                                        builder.rain(value.asInt());
                                    break;
                                case "flame":
                                    if (builder.build().getFlame() == null)
                                        builder.flame(value.asBoolean());
                                    break;
                                case "motion":
                                    if (builder.build().getMotion() == null)
                                        builder.motion(value.asBoolean());
                                    break;
                                case "door":
                                    if (builder.build().getDoor() == null)
                                        builder.door(value.asBoolean());
                                    break;
                                case "lightStatus":
                                    if (builder.build().getLightStatus() == null)
                                        builder.lightStatus(value.asBoolean());
                                    break;
                                case "fanStatus":
                                    if (builder.build().getFanStatus() == null)
                                        builder.fanStatus(value.asBoolean());
                                    break;
                                case "gasAlert":
                                    if (builder.build().getGasAlert() == null)
                                        builder.gasAlert(value.asBoolean());
                                    break;
                                case "emergency":
                                    if (builder.build().getEmergency() == null)
                                        builder.emergency(value.asBoolean());
                                    break;
                            }
                        }
                    });
                } catch (Exception e) {
                    log.warn("Failed to parse stateValue for device {}: {}", device.getDeviceCode(), e.getMessage());
                }
            }
        }

        builder.rawData(rawData);
        return builder.build();
    }

    /**
     * Convert MCUGateway entity to DTO
     */
    private MCUGatewayResponse toResponse(MCUGateway mcuGateway) {
        boolean isOnline = mcuGateway.isOnline();
        log.debug("Converting MCU Gateway to response: id={}, status={}, lastHeartbeat={}, isOnline={}",
                mcuGateway.getId(), mcuGateway.getStatus(), mcuGateway.getLastHeartbeat(), isOnline);

        return MCUGatewayResponse.builder()
                .id(mcuGateway.getId())
                .serialNumber(mcuGateway.getSerialNumber())
                .name(mcuGateway.getName())
                .ipAddress(mcuGateway.getIpAddress())
                .firmwareVersion(mcuGateway.getFirmwareVersion())
                .status(mcuGateway.getStatus())
                .lastHeartbeat(mcuGateway.getLastHeartbeat())
                .pairedAt(mcuGateway.getPairedAt())
                .pairedByUsername(mcuGateway.getPairedBy() != null ? mcuGateway.getPairedBy().getUsername() : null)
                .homeId(mcuGateway.getHome() != null ? mcuGateway.getHome().getId() : null)
                .homeName(mcuGateway.getHome() != null ? mcuGateway.getHome().getName() : null)
                .metadata(mcuGateway.getMetadata())
                .isOnline(isOnline)
                .build();
    }

    @Override
    public String triggerHeartbeat(Long homeId) {
        MCUGateway mcuGateway = mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        if (!mcuGateway.isOnline()) {
            throw new AppException(ErrorCode.MCU_OFFLINE);
        }

        try {
            // Gửi MQTT command REQUEST_SENSOR_DATA đến ESP32
            // ESP32 sẽ phản hồi bằng cách publish sensor data lên smarthome/{homeId}/sensors
            mqttService.requestSensorData(homeId);
            log.debug("Trigger heartbeat (MQTT) successful for homeId={}", homeId);
            return "Heartbeat triggered successfully. ESP32 will send sensor data shortly.";
        } catch (Exception e) {
            log.error("Failed to trigger heartbeat for homeId={}: {}", homeId, e.getMessage(), e);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDataResponse getDashboardData(Long homeId) {
        // Lấy sensor data
        MCUSensorDataResponse sensorData = getSensorDataByHomeId(homeId);

        // Lấy tất cả devices của home
        List<Device> devices = deviceRepository
                .findAllByRoom_Home_Id(homeId, org.springframework.data.domain.Pageable.unpaged()).getContent();

        // Tính toán statistics
        int totalDevices = devices.size();
        int onlineDevices = (int) devices.stream()
                .filter(d -> d.getStatus() == DeviceStatus.ONLINE || d.getStatus() == DeviceStatus.ACTIVE)
                .count();
        int offlineDevices = (int) devices.stream()
                .filter(d -> d.getStatus() == DeviceStatus.OFFLINE || d.getStatus() == DeviceStatus.INACTIVE)
                .count();

        // Count by type
        Map<String, Integer> devicesByType = new HashMap<>();
        devices.forEach(device -> {
            String type = device.getType() != null ? device.getType().name() : "UNKNOWN";
            devicesByType.put(type, devicesByType.getOrDefault(type, 0) + 1);
        });

        // Count by status
        Map<String, Integer> devicesByStatus = new HashMap<>();
        devices.forEach(device -> {
            String status = device.getStatus() != null ? device.getStatus().name() : "UNKNOWN";
            devicesByStatus.put(status, devicesByStatus.getOrDefault(status, 0) + 1);
        });

        // Top devices (sorted by last update)
        List<DeviceResponse> topDevices = devices.stream()
                .sorted((a, b) -> {
                    LocalDateTime dateA = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
                    LocalDateTime dateB = b.getUpdatedAt() != null ? b.getUpdatedAt() : b.getCreatedAt();
                    if (dateA == null && dateB == null)
                        return 0;
                    if (dateA == null)
                        return 1;
                    if (dateB == null)
                        return -1;
                    return dateB.compareTo(dateA);
                })
                .limit(5)
                .map(deviceMapper::toDeviceResponse)
                .collect(Collectors.toList());

        // Build statistics
        DashboardDataResponse.DeviceStatistics statistics = DashboardDataResponse.DeviceStatistics.builder()
                .totalDevices(totalDevices)
                .onlineDevices(onlineDevices)
                .offlineDevices(offlineDevices)
                .devicesByType(devicesByType)
                .devicesByStatus(devicesByStatus)
                .topDevices(topDevices)
                .build();

        return DashboardDataResponse.builder()
                .sensorData(sensorData)
                .statistics(statistics)
                .build();
    }

    @Transactional(readOnly = true)
    public MCUCommandsResponse getPendingCommands(String apiKey) {
        // Verify API Key và lấy MCU Gateway
        MCUGateway mcuGateway = mcuGatewayRepository.findByApiKey(apiKey)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Invalid API Key"));

        // Lấy tất cả commands PENDING
        List<MCUDeviceCommand> pendingCommands = mcuDeviceCommandRepository
                .findByMcuGatewayAndStatusOrderByCreatedAtAsc(mcuGateway, "PENDING");

        // Convert sang DTO
        List<MCUDeviceCommandResponse> commandResponses = pendingCommands.stream()
                .map(cmd -> MCUDeviceCommandResponse.builder()
                        .id(cmd.getId())
                        .deviceCode(cmd.getDeviceCode())
                        .gpioPin(cmd.getGpioPin())
                        .command(cmd.getCommand())
                        .payload(cmd.getPayload())
                        .build())
                .collect(Collectors.toList());

        return MCUCommandsResponse.builder()
                .commands(commandResponses)
                .build();
    }

    @Transactional
    public void acknowledgeCommand(String apiKey, Long commandId) {
        // Verify API Key và lấy MCU Gateway
        MCUGateway mcuGateway = mcuGatewayRepository.findByApiKey(apiKey)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Invalid API Key"));

        // Tìm command
        MCUDeviceCommand command = mcuDeviceCommandRepository
                .findByIdAndMcuGateway(commandId, mcuGateway)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Command not found"));

        // Đánh dấu đã xử lý
        mcuDeviceCommandRepository.markAsProcessed(commandId, LocalDateTime.now());

        log.debug("Command {} acknowledged by MCU Gateway {}", commandId, mcuGateway.getId());
    }

    @Override
    public void sendAutomationCommand(Long homeId, String automationType, boolean enabled) {
        // Verify home exists and has MCU
        MCUGateway mcuGateway = mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        if (!mcuGateway.isOnline()) {
            throw new AppException(ErrorCode.MCU_OFFLINE, "MCU Gateway is offline. Cannot change automation settings.");
        }

        try {
            // Build MQTT command payload
            Map<String, Object> commandPayload = new java.util.HashMap<>();
            commandPayload.put("type", "AUTOMATION_CONTROL");
            commandPayload.put("automationType", automationType);
            commandPayload.put("enabled", enabled);
            commandPayload.put("timestamp", System.currentTimeMillis());

            String commandJson = objectMapper.writeValueAsString(commandPayload);

            // Publish to ESP32's command topic (must match ESP32's MQTT_TOPIC_COMMANDS)
            String topic = String.format("smarthome/%d/commands", homeId);
            mqttService.publish(topic, commandJson);

            log.info("Sent automation command to homeId={}: type={}, enabled={}",
                    homeId, automationType, enabled);

        } catch (Exception e) {
            log.error("Failed to send automation command to homeId={}: {}", homeId, e.getMessage(), e);
            throw new RuntimeException("Failed to send automation command: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void sendAutomationConfig(Long homeId, Integer lightThreshold, Integer tempThreshold, Integer gasThreshold) {
        // Verify home exists and has MCU
        MCUGateway mcuGateway = mcuGatewayRepository.findByHomeId(homeId)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));

        if (!mcuGateway.isOnline()) {
            throw new AppException(ErrorCode.MCU_OFFLINE, "MCU Gateway is offline. Cannot change automation settings.");
        }

        try {
            // Build MQTT command payload
            Map<String, Object> commandPayload = new java.util.HashMap<>();
            commandPayload.put("type", "AUTOMATION_CONFIG");
            commandPayload.put("lightThreshold", lightThreshold != null ? lightThreshold : -1);
            commandPayload.put("tempThreshold", tempThreshold != null ? tempThreshold : -1);
            commandPayload.put("gasThreshold", gasThreshold != null ? gasThreshold : -1);
            commandPayload.put("timestamp", System.currentTimeMillis());

            String commandJson = objectMapper.writeValueAsString(commandPayload);

            // Publish to ESP32's command topic (must match ESP32's MQTT_TOPIC_COMMANDS)
            String topic = String.format("smarthome/%d/commands", homeId);
            mqttService.publish(topic, commandJson);

            log.info("Sent automation config to homeId={}: light={}, temp={}, gas={}",
                    homeId, lightThreshold, tempThreshold, gasThreshold);

            // Update metadata immediately so getSensorDataByHomeId returns new values on refresh
            // (otherwise frontend would see old values until ESP32 sends next heartbeat)
            String metadata = mcuGateway.getMetadata();
            Map<String, Object> metaMap;
            if (metadata != null && !metadata.trim().isEmpty()) {
                try {
                    metaMap = objectMapper.readValue(metadata, Map.class);
                } catch (Exception e) {
                    log.warn("Could not parse metadata for merge, creating new: {}", e.getMessage());
                    metaMap = new HashMap<>();
                }
            } else {
                metaMap = new HashMap<>();
            }
            if (lightThreshold != null) metaMap.put("autoLightThreshold", lightThreshold);
            if (tempThreshold != null) metaMap.put("autoFanThreshold", tempThreshold);
            if (gasThreshold != null) metaMap.put("gasAlertThreshold", gasThreshold);
            mcuGateway.setMetadata(objectMapper.writeValueAsString(metaMap));
            mcuGatewayRepository.save(mcuGateway);

        } catch (Exception e) {
            log.error("Failed to send automation config to homeId={}: {}", homeId, e.getMessage(), e);
            throw new RuntimeException("Failed to send automation config: " + e.getMessage(), e);
        }
    }
}
