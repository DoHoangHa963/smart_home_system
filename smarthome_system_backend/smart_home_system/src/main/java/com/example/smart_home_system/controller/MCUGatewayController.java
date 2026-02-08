package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.MCU.MCUAutoPairRequest;
import com.example.smart_home_system.dto.request.MCU.MCUEmergencyNotificationRequest;
import com.example.smart_home_system.dto.request.MCU.MCUEmergencyNotificationRequest;
import com.example.smart_home_system.dto.request.MCU.MCUHeartbeatRequest;
import com.example.smart_home_system.dto.request.MCU.MCUPairingRequest;
import com.example.smart_home_system.dto.request.MCU.MCUSendApiKeyRequest;
import com.example.smart_home_system.dto.request.RFID.RFIDAccessLogRequest;
import com.example.smart_home_system.dto.request.RFID.RFIDCardUpdateRequest;
import com.example.smart_home_system.dto.request.RFID.RFIDLearnRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.DashboardDataResponse;
import com.example.smart_home_system.dto.response.MCU.MCUGatewayResponse;
import com.example.smart_home_system.dto.response.MCU.MCUPairingInitResponse;
import com.example.smart_home_system.dto.response.MCU.MCUPairingResponse;
import com.example.smart_home_system.dto.response.MCU.MCUSensorDataResponse;
import com.example.smart_home_system.dto.response.MCU.MCUCommandsResponse;
import com.example.smart_home_system.dto.response.RFID.RFIDAccessLogResponse;
import com.example.smart_home_system.dto.response.RFID.RFIDAccessStatsResponse;
import com.example.smart_home_system.dto.response.RFID.RFIDCardsListResponse;
import com.example.smart_home_system.dto.response.RFID.RFIDLearnStatusResponse;
import com.example.smart_home_system.entity.MCUGateway;
import com.example.smart_home_system.service.MCUGatewayService;
import com.example.smart_home_system.service.HomeService;
import com.example.smart_home_system.service.MqttResponseStore;
import com.example.smart_home_system.service.MqttService;
import com.example.smart_home_system.service.NotificationService;
import com.example.smart_home_system.service.RFIDService;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.enums.MCUStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for managing ESP32 MCU Gateway operations.
 * 
 * <p>
 * This controller provides endpoints for:
 * <ul>
 * <li>Initializing MCU Gateway pairing process</li>
 * <li>Manual pairing with specific home</li>
 * <li>Confirming pairing after user selection</li>
 * <li>Processing heartbeat signals from ESP32</li>
 * <li>Retrieving MCU Gateway information</li>
 * <li>Unpairing MCU Gateway from home</li>
 * </ul>
 * 
 * <p>
 * <b>Authentication:</b>
 * <ul>
 * <li>Most endpoints require JWT Bearer token authentication</li>
 * <li>Heartbeat endpoint uses X-MCU-API-Key header for ESP32
 * authentication</li>
 * </ul>
 * 
 * <p>
 * <b>Pairing Flow:</b>
 * <ol>
 * <li>ESP32 sends init-pairing request with serial number</li>
 * <li>Backend creates MCU Gateway in PAIRING state</li>
 * <li>Frontend displays available homes for user selection</li>
 * <li>User confirms pairing with selected home</li>
 * <li>Backend generates API Key and returns to ESP32</li>
 * </ol>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUGatewayService
 * @see MCUGateway
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(RequestApi.MCU_GATEWAY)
@Tag(name = "MCU Gateway Management", description = "APIs for managing ESP32 MCU Gateways")
@SecurityRequirement(name = "bearerAuth")
public class MCUGatewayController {

        private final MCUGatewayService mcuGatewayService;
        private final HomeService homeService;
        private final MqttService mqttService;
        private final MqttResponseStore mqttResponseStore;
        private final NotificationService notificationService;

        /**
         * Init pairing - Tạo MCU Gateway với status PAIRING và trả về danh sách homes
         * available
         * User sẽ chọn home từ danh sách này và confirm pairing
         */
        @Operation(summary = "Init MCU Gateway Pairing", description = "Initialize pairing process. Creates MCU Gateway in PAIRING state "
                        +
                        "and returns available homes for user to select.")
        @PostMapping("/init-pairing")
        @PreAuthorize("isAuthenticated()")
        public ResponseEntity<ApiResponse<MCUPairingInitResponse>> initPairing(
                        @Valid @RequestBody MCUAutoPairRequest request) {
                log.info("Initializing MCU Gateway pairing: serialNumber={}", request.getSerialNumber());
                MCUPairingInitResponse response = mcuGatewayService.initPairing(request);
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.success("MCU Gateway pairing initialized. Please select a home.",
                                                response));
        }

        /**
         * Pair ESP32 với Home (manual - với homeId cụ thể)
         * Endpoint này được gọi từ ESP32 hoặc frontend khi cần chọn home cụ thể
         */
        @Operation(summary = "Pair MCU Gateway with Home (Manual)", description = "Manually pair ESP32 MCU Gateway with a specific Home. "
                        +
                        "Requires confirmation from frontend.")
        @PostMapping("/pair/{homeId}")
        @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'HOME_UPDATE')")
        public ResponseEntity<ApiResponse<MCUPairingResponse>> pairMCU(
                        @PathVariable("homeId") Long homeId,
                        @Valid @RequestBody MCUPairingRequest request) {
                log.info("Pairing MCU Gateway: serialNumber={}, homeId={}", request.getSerialNumber(), homeId);
                MCUPairingResponse response = mcuGatewayService.pairMCU(homeId, request);
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.success("MCU Gateway pairing initiated", response));
        }

        /**
         * Confirm pairing với home đã chọn (từ frontend sau khi user xác nhận)
         */
        @Operation(summary = "Confirm MCU Gateway Pairing", description = "Confirm pairing with selected home. Generates API Key and pairs MCU with home.")
        @PostMapping("/confirm/{mcuGatewayId}/home/{homeId}")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<MCUPairingResponse>> confirmPairing(
                        @PathVariable("mcuGatewayId") Long mcuGatewayId,
                        @PathVariable("homeId") Long homeId) {
                log.info("Confirming MCU Gateway pairing: mcuGatewayId={}, homeId={}", mcuGatewayId, homeId);
                MCUPairingResponse response = mcuGatewayService.confirmPairing(mcuGatewayId, homeId);
                return ResponseEntity.ok(ApiResponse.success("MCU Gateway paired successfully", response));
        }

        /**
         * ESP32 gửi heartbeat
         * Endpoint này được gọi từ ESP32 với API Key authentication
         */
        @Operation(summary = "MCU Gateway Heartbeat", description = "ESP32 sends heartbeat to indicate it's online")
        @PostMapping("/heartbeat")
        public ResponseEntity<ApiResponse<Void>> heartbeat(
                        @RequestHeader("X-MCU-API-Key") String apiKey,
                        @Valid @RequestBody MCUHeartbeatRequest request) {
                // Giảm log level để tránh quá nhiều log
                log.trace("Heartbeat received from MCU: apiKey={}", apiKey);
                mcuGatewayService.processHeartbeat(apiKey, request);
                return ResponseEntity.ok(ApiResponse.success("Heartbeat received"));
        }

        /**
         * ESP32 gửi emergency notification
         * Endpoint này được gọi từ ESP32 khi phát hiện tình huống khẩn cấp (lửa, rò rỉ
         * gas)
         */
        @Operation(summary = "MCU Emergency Notification", description = "ESP32 sends emergency notification when fire or gas leak is detected")
        @PostMapping("/emergency")
        public ResponseEntity<ApiResponse<Void>> emergencyNotification(
                        @RequestHeader("X-MCU-API-Key") String apiKey,
                        @Valid @RequestBody MCUEmergencyNotificationRequest request) {
                log.warn("Emergency notification received from MCU: type={}, isActive={}, deviceCode={}",
                                request.getEmergencyType(), request.getIsActive(), request.getDeviceCode());

                notificationService.createEmergencyNotification(
                                apiKey,
                                request.getEmergencyType(),
                                request.getIsActive(),
                                request.getDeviceCode(),
                                request.getMetadata());

                return ResponseEntity.ok(ApiResponse.success("Emergency notification received"));
        }

        /**
         * Trigger ESP32 gửi heartbeat ngay lập tức
         * Backend sẽ gửi HTTP request đến ESP32 để yêu cầu gửi heartbeat
         */
        @Operation(summary = "Trigger MCU Gateway Heartbeat", description = "Request ESP32 to send heartbeat immediately. Backend will send HTTP request to ESP32.")
        @PostMapping("/home/{homeId}/trigger-heartbeat")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<String>> triggerHeartbeat(
                        @PathVariable("homeId") Long homeId) {
                log.info("Trigger heartbeat requested for homeId={}", homeId);

                try {
                        String result = mcuGatewayService.triggerHeartbeat(homeId);
                        return ResponseEntity.ok(ApiResponse.success("Heartbeat triggered successfully", result));
                } catch (Exception e) {
                        log.error("Failed to trigger heartbeat for homeId={}: {}", homeId, e.getMessage());
                        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                                        .body(ApiResponse.<String>error(
                                                        "Không thể kết nối với ESP32. Đảm bảo ESP32 đang online và trong cùng mạng WiFi.",
                                                        null));
                }
        }

        /**
         * Lấy tất cả data cho dashboard: trigger heartbeat và trả về full dashboard
         * data
         * Bao gồm sensor data và device statistics
         */
        @Operation(summary = "Get Full Dashboard Data", description = "Trigger heartbeat and get all dashboard data including sensor data and device statistics.")
        @PostMapping("/home/{homeId}/dashboard-data")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<DashboardDataResponse>> getDashboardData(
                        @PathVariable("homeId") Long homeId) {
                log.info("Dashboard data requested for homeId={}", homeId);

                try {
                        mcuGatewayService.triggerHeartbeat(homeId);
                        Thread.sleep(500);
                        DashboardDataResponse dashboardData = mcuGatewayService.getDashboardData(homeId);
                        return ResponseEntity.ok(ApiResponse.success("Dashboard data retrieved", dashboardData));
                } catch (com.example.smart_home_system.exception.AppException appEx) {
                        if (appEx.getErrorCode() == com.example.smart_home_system.exception.ErrorCode.MCU_OFFLINE) {
                                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                                .body(ApiResponse.<DashboardDataResponse>error(
                                                                "MCU Gateway đang offline. Không thể lấy dữ liệu từ thiết bị.", null));
                        }
                        throw appEx;
                } catch (Exception e) {
                        log.error("Failed to get dashboard data for homeId={}: {}", homeId, e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(ApiResponse.<DashboardDataResponse>error(
                                                        "Failed to retrieve dashboard data: " + e.getMessage(), null));
                }
        }

        /**
         * Lấy thông tin MCU Gateway của Home
         * Chỉ owner hoặc admin hệ thống mới có thể xem MCU
         */
        @Operation(summary = "Get MCU Gateway by Home ID", description = "Get MCU Gateway information for a specific Home. Only owner or system admin can view MCU.")
        @GetMapping("/home/{homeId}")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<MCUGatewayResponse>> getByHomeId(
                        @PathVariable("homeId") Long homeId) {
                MCUGatewayResponse response = mcuGatewayService.getByHomeId(homeId);
                return ResponseEntity.ok(ApiResponse.success("MCU Gateway retrieved", response));
        }

        /**
         * Unpair MCU Gateway
         * Chỉ owner của home hoặc admin hệ thống mới có thể unpair
         * Permission check được thực hiện trong service method
         */
        @Operation(summary = "Unpair MCU Gateway", description = "Remove MCU Gateway from Home. Only owner or system admin can unpair.")
        @DeleteMapping("/{mcuGatewayId}")
        @PreAuthorize("isAuthenticated()")
        public ResponseEntity<ApiResponse<Void>> unpairMCU(
                        @PathVariable("mcuGatewayId") Long mcuGatewayId) {
                log.info("Unpairing MCU Gateway: id={}", mcuGatewayId);
                mcuGatewayService.unpairMCU(mcuGatewayId);
                return ResponseEntity.ok(ApiResponse.success("MCU Gateway unpaired successfully"));
        }

        /**
         * Update MCU Gateway IP Address
         * Only owner of home or admin can update IP address
         */
        @Operation(summary = "Update MCU Gateway IP Address", description = "Update IP address of MCU Gateway. Only owner or system admin can update.")
        @PutMapping("/{mcuGatewayId}/ip-address")
        @PreAuthorize("isAuthenticated()")
        public ResponseEntity<ApiResponse<MCUGatewayResponse>> updateIPAddress(
                        @PathVariable("mcuGatewayId") Long mcuGatewayId,
                        @RequestBody java.util.Map<String, String> request) {
                log.info("Updating MCU Gateway IP address: id={}, newIP={}", mcuGatewayId, request.get("ipAddress"));

                String ipAddress = request.get("ipAddress");
                if (ipAddress == null || ipAddress.trim().isEmpty()) {
                        return ResponseEntity.badRequest()
                                        .body(ApiResponse.<MCUGatewayResponse>error("IP address is required", null));
                }

                MCUGatewayResponse response = mcuGatewayService.updateIPAddress(mcuGatewayId, ipAddress.trim());
                return ResponseEntity.ok(ApiResponse.success("IP address updated successfully", response));
        }

        /**
         * Lấy sensor data từ MCU Gateway của Home
         */
        @Operation(summary = "Get MCU Sensor Data by Home ID", description = "Get sensor data from MCU Gateway for a specific Home. Only owner or system admin can view.")
        @GetMapping("/home/{homeId}/sensor-data")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<MCUSensorDataResponse>> getSensorDataByHomeId(
                        @PathVariable("homeId") Long homeId) {
                MCUSensorDataResponse response = mcuGatewayService.getSensorDataByHomeId(homeId);
                return ResponseEntity.ok(ApiResponse.success("Sensor data retrieved", response));
        }

        /**
         * Send API Key to ESP32 via MQTT (MQTT-only mode)
         * Backend publishes to smarthome/pairing/{serialNumber}, ESP32 subscribes when in pairing mode
         */
        @Operation(summary = "Send API Key to ESP32 via MQTT", description = "Publish API Key to ESP32 via MQTT pairing topic. ESP32 must be connected to MQTT broker and in pairing mode.")
        @PostMapping("/send-api-key")
        @PreAuthorize("isAuthenticated()")
        public ResponseEntity<ApiResponse<String>> sendApiKeyToESP32(
                        @Valid @RequestBody MCUSendApiKeyRequest request) {
                log.info("Sending API Key to ESP32 via MQTT: mcuGatewayId={}, homeId={}",
                                request.getMcuGatewayId(), request.getHomeId());

                try {
                        // Lấy serial number từ MCU Gateway
                        MCUGatewayResponse mcuGateway = mcuGatewayService.getById(request.getMcuGatewayId());
                        if (mcuGateway == null || mcuGateway.getSerialNumber() == null) {
                                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                                .body(ApiResponse.<String>error("MCU Gateway not found or serial number missing", null));
                        }

                        mqttService.publishPairingCredentials(
                                        mcuGateway.getSerialNumber(),
                                        request.getApiKey(),
                                        request.getMcuGatewayId(),
                                        request.getHomeId());

                        log.info("Successfully published API Key to ESP32 via MQTT: serialNumber={}",
                                        mcuGateway.getSerialNumber());
                        return ResponseEntity.ok(ApiResponse.success(
                                        "API Key sent to ESP32 successfully via MQTT",
                                        "success"));

                } catch (Exception e) {
                        log.error("Failed to send API Key to ESP32 via MQTT: {}", e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(ApiResponse.<String>error(
                                                        "Lỗi khi gửi API Key đến ESP32: " + e.getMessage(), null));
                }
        }

        /**
         * Lấy danh sách GPIO pins available từ ESP32
         * Frontend sẽ gọi endpoint này khi user muốn thêm device mới
         * để hiển thị dropdown chọn GPIO pin (giống như Virtual Pin trong Blynk)
         */
        @Operation(summary = "Get Available GPIO Pins from ESP32", description = "Get list of available GPIO pins from ESP32 MCU Gateway. "
                        +
                        "Frontend uses this to display GPIO pin selection when adding devices. " +
                        "Similar to Virtual Pins in Blynk.")
        @GetMapping("/home/{homeId}/gpio-pins")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeMember(#homeId)")
        public ResponseEntity<ApiResponse<Object>> getAvailableGPIOPins(
                        @PathVariable("homeId") Long homeId) {
                log.info("Getting available GPIO pins for homeId={}", homeId);

                try {
                        mcuGatewayService.getByHomeId(homeId);

                        String requestId = mqttResponseStore.generateRequestId();
                        java.util.concurrent.CompletableFuture<String> future = mqttResponseStore.createRequest(requestId);
                        mqttService.requestGPIOAvailable(homeId, requestId);

                        String response = mqttResponseStore.getWithTimeout(
                                        future, 5, java.util.concurrent.TimeUnit.SECONDS);

                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        Object gpioPins = mapper.readValue(response, Object.class);

                        log.info("Successfully retrieved GPIO pins from ESP32 via MQTT for homeId={}", homeId);
                        return ResponseEntity.ok(ApiResponse.success("GPIO pins retrieved successfully", gpioPins));

                } catch (java.util.concurrent.TimeoutException e) {
                        log.error("MQTT timeout getting GPIO pins for homeId={}", homeId);
                        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                                        .body(ApiResponse.error(
                                                        "Không thể kết nối với ESP32. Đảm bảo ESP32 đang online và kết nối MQTT.",
                                                        null));
                } catch (Exception e) {
                        log.error("Error getting GPIO pins for homeId={}: {}", homeId, e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(ApiResponse.error("Lỗi khi lấy danh sách GPIO pins: " + e.getMessage(),
                                                        null));
                }
        }

        // ============ AUTOMATION CONTROL ENDPOINTS ============

        /**
         * Toggle automation setting on ESP32 via MQTT
         * Sends AUTOMATION_CONTROL command to ESP32
         */
        @Operation(summary = "Toggle Automation Setting", description = "Toggle automation setting (AUTO_LIGHT, AUTO_FAN, AUTO_CLOSE_DOOR) on ESP32 via MQTT")
        @PostMapping("/home/{homeId}/automation/toggle")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<String>> toggleAutomation(
                        @PathVariable("homeId") Long homeId,
                        @RequestBody java.util.Map<String, Object> request) {
                log.info("Toggle automation for homeId={}: {}", homeId, request);

                try {
                        String automationType = (String) request.get("automationType");
                        Boolean enabled = (Boolean) request.get("enabled");

                        if (automationType == null || enabled == null) {
                                return ResponseEntity.badRequest()
                                                .body(ApiResponse.<String>error(
                                                                "Missing automationType or enabled field", null));
                        }

                        // Validate automation type
                        if (!automationType.equals("AUTO_LIGHT") &&
                                        !automationType.equals("AUTO_FAN") &&
                                        !automationType.equals("AUTO_CLOSE_DOOR")) {
                                return ResponseEntity.badRequest()
                                                .body(ApiResponse.<String>error(
                                                                "Invalid automationType. Must be AUTO_LIGHT, AUTO_FAN, or AUTO_CLOSE_DOOR",
                                                                null));
                        }

                        // Send MQTT command to ESP32
                        mcuGatewayService.sendAutomationCommand(homeId, automationType, enabled);

                        return ResponseEntity.ok(ApiResponse.success(
                                        String.format("Automation %s set to %s", automationType,
                                                        enabled ? "ON" : "OFF"),
                                        "success"));
                } catch (Exception e) {
                        log.error("Failed to toggle automation for homeId={}: {}", homeId, e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(ApiResponse.<String>error(
                                                        "Failed to toggle automation: " + e.getMessage(), null));
                }
        }

        /**
         * Set automation thresholds on ESP32 via MQTT
         * Sends AUTOMATION_CONFIG command to ESP32
         */
        @Operation(summary = "Set Automation Thresholds", description = "Set automation thresholds (lightThreshold, tempThreshold, gasThreshold) on ESP32 via MQTT. Use -1 to skip updating a threshold.")
        @PostMapping("/home/{homeId}/automation/config")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<String>> setAutomationConfig(
                        @PathVariable("homeId") Long homeId,
                        @RequestBody java.util.Map<String, Object> request) {
                log.info("Set automation config for homeId={}: {}", homeId, request);

                try {
                        Integer lightThreshold = request.get("lightThreshold") != null
                                        ? ((Number) request.get("lightThreshold")).intValue()
                                        : null;
                        Integer tempThreshold = request.get("tempThreshold") != null
                                        ? ((Number) request.get("tempThreshold")).intValue()
                                        : null;
                        Integer gasThreshold = request.get("gasThreshold") != null
                                        ? ((Number) request.get("gasThreshold")).intValue()
                                        : null;

                        // Validate at least one threshold is provided
                        if (lightThreshold == null && tempThreshold == null && gasThreshold == null) {
                                return ResponseEntity.badRequest()
                                                .body(ApiResponse.<String>error(
                                                                "At least one threshold must be provided", null));
                        }

                        // Send MQTT command to ESP32
                        mcuGatewayService.sendAutomationConfig(homeId, lightThreshold, tempThreshold, gasThreshold);

                        return ResponseEntity.ok(ApiResponse.success(
                                        "Automation thresholds updated successfully",
                                        "success"));
                } catch (Exception e) {
                        log.error("Failed to set automation config for homeId={}: {}", homeId, e.getMessage(), e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(ApiResponse.<String>error(
                                                        "Failed to set automation config: " + e.getMessage(), null));
                }
        }

        // ============ RFID MANAGEMENT ENDPOINTS ============

        @Autowired
        private RFIDService rfidService;

        /**
         * Lấy danh sách thẻ RFID từ ESP32
         */
        @Operation(summary = "Get RFID Cards List", description = "Get list of RFID cards registered on ESP32 MCU Gateway")
        @GetMapping("/home/{homeId}/rfid/cards")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<RFIDCardsListResponse>> getRFIDCards(
                        @PathVariable("homeId") Long homeId) {
                log.info("Getting RFID cards for homeId={}", homeId);
                RFIDCardsListResponse response = rfidService.getCardsList(homeId);
                return ResponseEntity.ok(ApiResponse.success("RFID cards retrieved", response));
        }

        /**
         * Bắt đầu chế độ học thẻ RFID mới
         */
        @Operation(summary = "Start RFID Learning Mode", description = "Start learning mode on ESP32 to register a new RFID card")
        @PostMapping("/home/{homeId}/rfid/learn")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<RFIDLearnStatusResponse>> startRFIDLearning(
                        @PathVariable("homeId") Long homeId,
                        @RequestBody(required = false) RFIDLearnRequest request) {
                log.info("Starting RFID learning mode for homeId={}", homeId);
                RFIDLearnStatusResponse response = rfidService.startLearning(homeId, request);
                return ResponseEntity.ok(ApiResponse.success("RFID learning mode started", response));
        }

        /**
         * Kiểm tra trạng thái learning mode
         */
        @Operation(summary = "Get RFID Learning Status", description = "Check the status of RFID learning mode")
        @GetMapping("/home/{homeId}/rfid/learn/status")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<RFIDLearnStatusResponse>> getRFIDLearningStatus(
                        @PathVariable("homeId") Long homeId) {
                log.debug("Getting RFID learning status for homeId={}", homeId);
                RFIDLearnStatusResponse response = rfidService.getLearningStatus(homeId);
                return ResponseEntity.ok(ApiResponse.success("RFID learning status retrieved", response));
        }

        /**
         * Cập nhật thông tin thẻ RFID (tên, enabled)
         */
        @Operation(summary = "Update RFID Card", description = "Update RFID card information (name, enabled status)")
        @PutMapping("/home/{homeId}/rfid/cards")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<Void>> updateRFIDCard(
                        @PathVariable("homeId") Long homeId,
                        @Valid @RequestBody RFIDCardUpdateRequest request) {
                log.info("Updating RFID card for homeId={}, index={}", homeId, request.getIndex());
                rfidService.updateCard(homeId, request);
                return ResponseEntity.ok(ApiResponse.success("RFID card updated"));
        }

        /**
         * Xóa thẻ RFID theo index
         */
        @Operation(summary = "Delete RFID Card", description = "Delete an RFID card by its index")
        @DeleteMapping("/home/{homeId}/rfid/cards/{index}")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<Void>> deleteRFIDCard(
                        @PathVariable("homeId") Long homeId,
                        @PathVariable("index") int index) {
                log.info("Deleting RFID card for homeId={}, index={}", homeId, index);
                rfidService.deleteCard(homeId, index);
                return ResponseEntity.ok(ApiResponse.success("RFID card deleted"));
        }

        /**
         * Xóa tất cả thẻ RFID
         */
        @Operation(summary = "Clear All RFID Cards", description = "Delete all RFID cards from ESP32")
        @PostMapping("/home/{homeId}/rfid/clear")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<Void>> clearAllRFIDCards(
                        @PathVariable("homeId") Long homeId) {
                log.info("Clearing all RFID cards for homeId={}", homeId);
                rfidService.clearAllCards(homeId);
                return ResponseEntity.ok(ApiResponse.success("All RFID cards cleared"));
        }

        /**
         * ESP32 gửi log truy cập RFID
         * Endpoint này được gọi từ ESP32 với API Key authentication
         */
        @Operation(summary = "Record RFID Access Log", description = "ESP32 sends RFID access log to backend")
        @PostMapping("/rfid-access")
        public ResponseEntity<ApiResponse<Void>> recordRFIDAccess(
                        @RequestHeader("X-MCU-API-Key") String apiKey,
                        @Valid @RequestBody RFIDAccessLogRequest request) {
                log.debug("RFID access log received: cardUid={}, authorized={}",
                                request.getCardUid(), request.getAuthorized());
                rfidService.recordAccessLog(apiKey, request);
                return ResponseEntity.ok(ApiResponse.success("RFID access log recorded"));
        }

        /**
         * Lấy danh sách access logs của Home
         */
        @Operation(summary = "Get RFID Access Logs", description = "Get paginated RFID access logs for a home")
        @GetMapping("/home/{homeId}/rfid/access-logs")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<Page<RFIDAccessLogResponse>>> getRFIDAccessLogs(
                        @PathVariable("homeId") Long homeId,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                log.debug("Getting RFID access logs for homeId={}, page={}, size={}", homeId, page, size);
                Page<RFIDAccessLogResponse> response = rfidService.getAccessLogs(homeId,
                                org.springframework.data.domain.PageRequest.of(page, size));
                return ResponseEntity.ok(ApiResponse.success("RFID access logs retrieved", response));
        }

        /**
         * Lấy 10 access logs gần nhất
         */
        @Operation(summary = "Get Recent RFID Access Logs", description = "Get 10 most recent RFID access logs for a home")
        @GetMapping("/home/{homeId}/rfid/access-logs/recent")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<java.util.List<RFIDAccessLogResponse>>> getRecentRFIDAccessLogs(
                        @PathVariable("homeId") Long homeId) {
                log.debug("Getting recent RFID access logs for homeId={}", homeId);
                java.util.List<RFIDAccessLogResponse> response = rfidService.getRecentAccessLogs(homeId);
                return ResponseEntity.ok(ApiResponse.success("Recent RFID access logs retrieved", response));
        }

        /**
         * Lấy thống kê access logs
         */
        @Operation(summary = "Get RFID Access Statistics", description = "Get RFID access statistics for a home")
        @GetMapping("/home/{homeId}/rfid/stats")
        @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId)")
        public ResponseEntity<ApiResponse<RFIDAccessStatsResponse>> getRFIDAccessStats(
                        @PathVariable("homeId") Long homeId) {
                log.debug("Getting RFID access stats for homeId={}", homeId);
                RFIDAccessStatsResponse response = rfidService.getAccessStats(homeId);
                return ResponseEntity.ok(ApiResponse.success("RFID access stats retrieved", response));
        }
}
