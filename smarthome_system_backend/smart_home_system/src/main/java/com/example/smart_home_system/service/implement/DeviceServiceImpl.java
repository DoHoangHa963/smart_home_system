package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.DeviceCreateRequest;
import com.example.smart_home_system.dto.request.DeviceUpdateRequest;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.Home;
import com.example.smart_home_system.entity.Room;
import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.exception.GlobalExceptionHandler;
import com.example.smart_home_system.exception.ResourceNotFoundException;
import com.example.smart_home_system.mapper.DeviceMapper;
import com.example.smart_home_system.entity.MCUDeviceCommand;
import com.example.smart_home_system.entity.MCUGateway;
import com.example.smart_home_system.repository.DeviceRepository;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.repository.HomeRepository;
import com.example.smart_home_system.repository.MCUDeviceCommandRepository;
import com.example.smart_home_system.repository.MCUGatewayRepository;
import com.example.smart_home_system.repository.RoomRepository;
import com.example.smart_home_system.service.DeviceService;
import com.example.smart_home_system.service.EventLogService;
import com.example.smart_home_system.service.MqttService;
import com.example.smart_home_system.util.GPIOMapping;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.client.RestClient;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.smart_home_system.exception.DeviceOfflineException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringEscapeUtils.escapeJson;

/**
 * Implementation of {@link DeviceService} for managing IoT Device entities.
 * 
 * <p>
 * This service provides the core business logic for device management
 * including:
 * <ul>
 * <li>Device registration with unique code validation</li>
 * <li>Device status and state management</li>
 * <li>Command sending to devices (TURN_ON, TURN_OFF, TOGGLE)</li>
 * <li>Device search and filtering</li>
 * <li>Device statistics aggregation</li>
 * </ul>
 * 
 * <p>
 * <b>Device Code:</b>
 * Each device must have a unique device code that serves as an identifier
 * for device communication and command routing.
 * 
 * <p>
 * <b>State Management:</b>
 * Device state is stored as JSON string in the stateValue field, allowing
 * flexible state representation for different device types.
 * 
 * <p>
 * <b>Command Protocol:</b>
 * <ul>
 * <li>TURN_ON - Sets power to ON, status to ONLINE</li>
 * <li>TURN_OFF - Sets power to OFF, status to OFFLINE</li>
 * <li>TOGGLE - Toggles current power state</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see DeviceService
 */
@Service("deviceService")
@RequiredArgsConstructor
@Slf4j
public class DeviceServiceImpl implements DeviceService {

    private final DeviceRepository deviceRepository;
    private final RoomRepository roomRepository;
    private final HomeRepository homeRepository;
    private final DeviceMapper deviceMapper;
    private final HomeMemberRepository homeMemberRepository;
    private final MCUDeviceCommandRepository mcuDeviceCommandRepository;
    private final MCUGatewayRepository mcuGatewayRepository;
    private final MqttService mqttService;
    private final EventLogService eventLogService;

    @Override
    @Transactional
    public DeviceResponse createDevice(DeviceCreateRequest request) {
        // Kiểm tra device code đã tồn tại chưa (chỉ tính các device chưa bị xóa)
        if (deviceRepository.existsByDeviceCode(request.getDeviceCode())) {
            throw new AppException(ErrorCode.DEVICE_ALREADY_EXISTS,
                    "Device code already exists: " + request.getDeviceCode());
        }

        // Validate and get Home entity (required)
        Home home = homeRepository.findById(request.getHomeId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.HOME_NOT_FOUND.getMessage()));

        // Room ID is optional - some devices like main door don't belong to a specific room
        Room room = null;
        if (request.getRoomId() != null) {
            room = roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCode.ROOM_NOT_FOUND.getMessage()));

            if (!room.getHome().getId().equals(request.getHomeId())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Room does not belong to the specified Home");
            }
        }

        Device device = deviceMapper.toDevice(request);

        String metadata = device.getMetadata();
        if (metadata == null || metadata.trim().isEmpty()) {
            device.setMetadata("{}");
        } else {
            String trimmedMeta = metadata.trim();
            if (!isValidJson(trimmedMeta)) {
                device.setMetadata("{\"description\": \"" + escapeJson(trimmedMeta) + "\"}");
            }
        }

        device.setHome(home); // Set home (required)
        device.setRoom(room); // Can be null if roomId was not provided
        device.setStatus(DeviceStatus.OFFLINE);

        Device savedDevice = deviceRepository.save(device);

        // Ghi log tạo device
        String eventValue;
        if (room != null) {
            eventValue = String.format(
                    "{\"deviceCode\":\"%s\",\"deviceName\":\"%s\",\"deviceType\":\"%s\",\"roomId\":%d,\"roomName\":\"%s\"}",
                    savedDevice.getDeviceCode(), savedDevice.getName(),
                    savedDevice.getType() != null ? savedDevice.getType().name() : null,
                    room.getId(), room.getName());
        } else {
            eventValue = String.format(
                    "{\"deviceCode\":\"%s\",\"deviceName\":\"%s\",\"deviceType\":\"%s\",\"roomId\":null,\"roomName\":null}",
                    savedDevice.getDeviceCode(), savedDevice.getName(),
                    savedDevice.getType() != null ? savedDevice.getType().name() : null);
        }
        eventLogService.logDeviceEvent(savedDevice, "DEVICE_CREATE", eventValue, "WEB");

        return deviceMapper.toDeviceResponse(savedDevice);
    }

    private boolean isValidJson(String json) {
        if (json == null)
            return false;
        return (json.startsWith("{") && json.endsWith("}")) ||
                (json.startsWith("[") && json.endsWith("]"));
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceResponse getDeviceById(Long id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage()));
        return deviceMapper.toDeviceResponse(device);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceResponse getDeviceByCode(String code) {
        // Sử dụng findActiveByDeviceCode để tránh lỗi "multiple results" khi có device đã bị soft delete
        Device device = deviceRepository.findActiveByDeviceCode(code)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage()));
        return deviceMapper.toDeviceResponse(device);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceListResponse> getDevicesByRoom(Long roomId, Pageable pageable) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Room not found with id: " + roomId);
        }

        Page<Device> devices = deviceRepository.findByRoomIdAndDeletedAtIsNull(roomId, pageable);
        return devices.map(deviceMapper::toListResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceListResponse> getAllDevices(Pageable pageable) {
        Page<Device> devicePage = deviceRepository.findAllActiveDevices(pageable);
        return devicePage.map(deviceMapper::toListResponse);
    }

    @Override
    @Transactional
    public DeviceResponse updateDevice(Long deviceId, DeviceUpdateRequest request) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage() + ": " + deviceId));

        if (request.getRoomId() != null) {
            Room newRoom = roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Room not found with id: " + request.getRoomId()));
            device.setRoom(newRoom);
        }

        deviceMapper.updateDevice(device, request);
        Device updatedDevice = deviceRepository.save(device);

        // Ghi log cập nhật device
        String eventValue = String.format("{\"deviceCode\":\"%s\",\"deviceName\":\"%s\"}",
                updatedDevice.getDeviceCode(), updatedDevice.getName());
        eventLogService.logDeviceEvent(updatedDevice, "DEVICE_UPDATE", eventValue, "WEB");

        return deviceMapper.toDeviceResponse(updatedDevice);
    }

    @Override
    @Transactional
    public DeviceResponse updateDevice(DeviceUpdateRequest request) {
        // Implementation for overloaded method (if needed)
        throw new UnsupportedOperationException("Use updateDevice(Long deviceId, DeviceUpdateRequest request) instead");
    }

    @Override
    @Transactional
    public void deleteDevice(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage() + ": " + deviceId));

        // Ghi log trước khi xóa
        String eventValue = String.format("{\"deviceCode\":\"%s\",\"deviceName\":\"%s\",\"deviceType\":\"%s\"}",
                device.getDeviceCode(), device.getName(),
                device.getType() != null ? device.getType().name() : null);
        eventLogService.logDeviceEvent(device, "DEVICE_DELETE", eventValue, "WEB");

        device.softDelete();
        deviceRepository.save(device);
    }

    @Override
    @Transactional
    public DeviceResponse updateDeviceStatus(Long id, DeviceStatus status) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Device not found with id: " + id));

        DeviceStatus oldStatus = device.getStatus();
        device.setStatus(status);

        if (status == DeviceStatus.ONLINE || status == DeviceStatus.OFFLINE) {
            device.setStateValue("{\"status\":\"" + status + "\"}");
        }

        Device updatedDevice = deviceRepository.save(device);
        // Ghi log trạng thái
        // deviceLogService.logStatusChange(device, oldStatus, status);

        return deviceMapper.toDeviceResponse(updatedDevice);
    }

    @Override
    @Transactional
    public void sendCommandToDevice(String deviceCode, String command, Object payload) {
        // Sử dụng findActiveByDeviceCode để tránh lỗi "multiple results" khi có device đã bị soft delete
        Device device = deviceRepository.findActiveByDeviceCode(deviceCode)
                .orElseThrow(() -> {
                    return new ResourceNotFoundException("Device not found with code: " + deviceCode);
                });

        // Lấy MCU Gateway quản lý device này
        MCUGateway mcuGateway = device.getMcuGateway();
        if (mcuGateway == null) {
            // Tìm MCU Gateway từ home của device (nếu có)
            Long homeId = device.getHomeId();
            if (homeId != null) {
                mcuGateway = mcuGatewayRepository.findByHomeId(homeId).orElse(null);
            }

            if (mcuGateway == null) {
                // Nếu device vẫn chưa có MCU Gateway, chỉ cập nhật database
                updateDeviceStateInDatabase(device, command);
                // Ghi log điều khiển device (không có MCU Gateway)
                eventLogService.logDeviceControl(device, command, "WEB");
                return;
            }
        }

        // Lấy GPIO pin từ device (đã được user chọn khi tạo device)
        Integer gpioPin = device.getGpioPin();
        if (gpioPin == null) {
            // Fallback: Sử dụng mapping mặc định
            gpioPin = GPIOMapping.getGPIOFromDeviceCode(deviceCode);
        }

        if (gpioPin == null) {
            log.warn("No GPIO pin configured for device: {}. Only updating database.", deviceCode);
            updateDeviceStateInDatabase(device, command);
            // Ghi log điều khiển device (không có GPIO pin)
            eventLogService.logDeviceControl(device, command, "WEB");
            return;
        }

        // Sử dụng MQTT để gửi command đến ESP32 (thay vì HTTP polling)
        Long homeId = device.getHomeId();
        if (homeId == null) {
            homeId = mcuGateway.getHome() != null ? mcuGateway.getHome().getId() : null;
        }

        if (homeId != null) {
            // Gửi command qua MQTT - instant delivery, không cần polling
            log.info("📤 Sending command via MQTT: homeId={}, deviceCode={}, gpio={}, command={}",
                    homeId, deviceCode, gpioPin, command);
            mqttService.publishDeviceCommand(homeId, deviceCode, gpioPin, command);

            // Cập nhật database ngay lập tức (optimistic update)
            updateDeviceStateInDatabase(device, command);
            log.info("✅ Device {} command sent via MQTT (GPIO {})", deviceCode, gpioPin);

            // Ghi log điều khiển device
            eventLogService.logDeviceControl(device, command, "MQTT");
        } else {
            // Fallback: Nếu không có homeId, thử gọi HTTP trực tiếp
            String esp32Ip = mcuGateway.getIpAddress();
            if (esp32Ip != null && !esp32Ip.isEmpty()) {
                boolean success = callESP32GpioControlHTTP(esp32Ip, gpioPin, command);
                if (success) {
                    updateDeviceStateInDatabase(device, command);
                    log.info("✅ Device {} controlled via HTTP fallback (GPIO {})", deviceCode, gpioPin);
                    // Ghi log điều khiển device
                    eventLogService.logDeviceControl(device, command, "HTTP");
                } else {
                    log.warn("⚠️ HTTP fallback failed for device {}", deviceCode);
                    updateDeviceStateInDatabase(device, command);
                    // Vẫn ghi log dù HTTP fail (device state đã được update)
                    eventLogService.logDeviceControl(device, command, "HTTP");
                }
            } else {
                log.warn("⚠️ No MQTT homeId and no ESP32 IP for device {}", deviceCode);
                updateDeviceStateInDatabase(device, command);
                // Ghi log điều khiển device (fallback)
                eventLogService.logDeviceControl(device, command, "WEB");
            }
        }
    }

    /**
     * HTTP fallback - Gọi ESP32 endpoint thống nhất: POST /api/gpio/control
     * Chỉ dùng khi MQTT không khả dụng
     */
    private boolean callESP32GpioControlHTTP(String esp32Ip, Integer gpioPin, String command) {
        try {
            String url = "http://" + esp32Ip + "/api/gpio/control";
            String requestBody = String.format("{\"gpio\":%d,\"command\":\"%s\"}", gpioPin, command);

            log.debug("📤 HTTP Fallback: POST {} with body: {}", url, requestBody);

            RestClient restClient = RestClient.create();
            String response = restClient.post()
                    .uri(url)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            log.debug("📥 ESP32 response: {}", response);
            return response != null && response.contains("ok");
        } catch (Exception e) {
            log.error("❌ HTTP fallback failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Lưu command vào queue để ESP32 poll (fallback mechanism)
     */
    private void saveCommandToQueue(MCUGateway mcuGateway, String deviceCode,
            Integer gpioPin, String command, Object payload) {
        String payloadJson = convertToJson(payload);
        MCUDeviceCommand deviceCommand = MCUDeviceCommand.builder()
                .mcuGateway(mcuGateway)
                .deviceCode(deviceCode)
                .gpioPin(gpioPin)
                .command(command)
                .payload(payloadJson)
                .status("PENDING")
                .build();

        mcuDeviceCommandRepository.save(deviceCommand);
        log.info("💾 Command saved to queue: {} -> {} (GPIO {})", deviceCode, command, gpioPin);
    }

    /**
     * Cập nhật device state trong database (không gửi đến ESP32)
     * 
     * QUAN TRỌNG: Phân biệt rõ:
     * - DeviceStatus (ONLINE/OFFLINE): Thiết bị có kết nối với hệ thống hay không
     * - Device State (stateValue JSON): Trạng thái hoạt động của thiết bị (ON/OFF)
     * 
     * Khi gửi command TURN_ON/TURN_OFF, thiết bị vẫn ONLINE (kết nối OK),
     * chỉ là trạng thái hoạt động thay đổi (power: ON/OFF)
     */
    private void updateDeviceStateInDatabase(Device device, String command) {
        // Default to ONLINE (connected)
        device.setStatus(DeviceStatus.ONLINE);

        switch (command) {
            case "TURN_ON":
                device.setStateValue("{\"power\": \"ON\"}");
                device.setStatus(DeviceStatus.ON);
                break;
            case "TURN_OFF":
                device.setStateValue("{\"power\": \"OFF\"}");
                device.setStatus(DeviceStatus.OFF);
                break;
            case "TOGGLE":
                String currentState = device.getStateValue();
                if (currentState != null && currentState.contains("ON")) {
                    device.setStateValue("{\"power\": \"OFF\"}");
                    device.setStatus(DeviceStatus.OFF);
                } else {
                    device.setStateValue("{\"power\": \"ON\"}");
                    device.setStatus(DeviceStatus.ON);
                }
                break;
            default:
                // Các lệnh khác không cập nhật state
                return;
        }
        deviceRepository.save(device);
    }

    private void logCommandSent(String deviceCode, String command, String payload) {
        // Log command sending for debugging/monitoring
        System.out.println("Command sent to device " + deviceCode +
                ": " + command + ", payload: " + payload);
    }

    private String convertToJson(Object payload) {
        if (payload == null) {
            return "{}";
        }

        if (payload instanceof String) {
            return (String) payload;
        }

        if (payload instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) payload;
            StringBuilder json = new StringBuilder("{");
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                json.append("\"").append(entry.getKey()).append("\":");
                if (entry.getValue() instanceof String) {
                    json.append("\"").append(entry.getValue()).append("\"");
                } else {
                    json.append(entry.getValue());
                }
                json.append(",");
            }
            if (json.length() > 1) {
                json.deleteCharAt(json.length() - 1);
            }
            json.append("}");
            return json.toString();
        }

        return "{\"value\":\"" + payload.toString() + "\"}";
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceListResponse> getDevicesByStatus(DeviceStatus status, Pageable pageable) {
        Page<Device> devices = deviceRepository.findByStatusAndDeletedAtIsNull(status, pageable);
        return devices.map(deviceMapper::toListResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceListResponse> getDevicesByHome(Long homeId, Pageable pageable) {
        Page<Device> devices = deviceRepository.findByRoomHomeId(homeId, pageable);
        return devices.map(deviceMapper::toListResponse);
    }

    @Override
    @Transactional
    public void updateDeviceState(String deviceCode, Map<String, Object> state) {
        // Sử dụng findActiveByDeviceCode để tránh lỗi "multiple results" khi có device đã bị soft delete
        Device device = deviceRepository.findActiveByDeviceCode(deviceCode)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Device not found with code: " + deviceCode));

        String stateJson = convertToJson(state);
        device.setStateValue(stateJson);

        // Update status based on state if needed
        if (state.containsKey("status")) {
            try {
                DeviceStatus newStatus = DeviceStatus.valueOf(state.get("status").toString());
                device.setStatus(newStatus);
            } catch (IllegalArgumentException e) {
                // Ignore invalid status values
            }
        }

        deviceRepository.save(device);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeviceListResponse> searchDevices(String query, String deviceType, Long roomId) {
        // Implement actual search logic based on your requirements
        // This is a simplified implementation
        List<Device> devices;

        if (roomId != null) {
            devices = deviceRepository.findActiveDevicesByRoomId(roomId);
        } else {
            devices = deviceRepository.findAll();
        }

        // Filter by query and deviceType
        return devices.stream()
                .filter(device -> device.getDeletedAt() == null)
                .filter(device -> query == null ||
                        device.getName().contains(query) ||
                        device.getDeviceCode().contains(query))
                .filter(device -> deviceType == null ||
                        device.getType().equals(deviceType))
                .map(deviceMapper::toListResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDeviceStatistics(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage()));

        // Implement actual statistics calculation
        // This is a placeholder implementation
        return Map.of(
                "deviceId", deviceId,
                "name", device.getName(),
                "status", device.getStatus().name(),
                "createdAt", device.getCreatedAt(),
                "lastUpdated", device.getUpdatedAt(),
                "message", "Statistics functionality will be implemented");
    }

    // Thêm phương thức còn thiếu từ interface
    @Override
    public void updateDeviceState(String deviceCode, String stateValue) {
        // Convert string state to map if needed, or implement as needed
        // This is a simplified implementation
        // Sử dụng findActiveByDeviceCode để tránh lỗi "multiple results" khi có device đã bị soft delete
        Device device = deviceRepository.findActiveByDeviceCode(deviceCode)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Device not found with code: " + deviceCode));

        device.setStateValue(stateValue);
        deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    @Override
    public boolean isDeviceMember(Long deviceId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return deviceRepository.findById(deviceId)
                .map(device -> {
                    if (device.getRoom() == null || device.getRoom().getHome() == null) {
                        return false;
                    }
                    Long homeId = device.getRoom().getHome().getId();
                    // Chỉ cần tồn tại bản ghi trong bảng thành viên là được xem/điều khiển
                    return homeMemberRepository.existsByUserUsernameAndHomeId(username, homeId);
                })
                .orElse(false);
    }

    /**
     * Kiểm tra User hiện tại có phải là OWNER của nhà chứa thiết bị này không
     */
    @Transactional(readOnly = true)
    @Override
    public boolean isDeviceOwner(Long deviceId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return deviceRepository.findById(deviceId)
                .map(device -> {
                    // Lấy homeId từ device (ưu tiên từ home relationship, fallback về room.home)
                    Long homeId = device.getHomeId();
                    if (homeId == null) {
                        return false;
                    }
                    // Kiểm tra bản ghi phải có role là OWNER
                    return homeMemberRepository.existsByUserUsernameAndHomeIdAndRole(
                            username, homeId, HomeMemberRole.OWNER);
                })
                .orElse(false);
    }

}