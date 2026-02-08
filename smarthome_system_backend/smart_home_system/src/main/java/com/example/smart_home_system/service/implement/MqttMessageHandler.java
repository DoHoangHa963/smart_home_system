package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.RFID.RFIDAccessLogRequest;
import com.example.smart_home_system.entity.MCUGateway;
import com.example.smart_home_system.enums.MCUStatus;
import com.example.smart_home_system.enums.NotificationType;
import com.example.smart_home_system.repository.MCUGatewayRepository;
import com.example.smart_home_system.repository.NotificationRepository;
import com.example.smart_home_system.service.RFIDService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handles incoming MQTT messages from ESP32 devices.
 * 
 * <p>
 * Processes messages from topics:
 * <ul>
 * <li>smarthome/{homeId}/sensors - Sensor data updates</li>
 * <li>smarthome/{homeId}/rfid/access - RFID access events</li>
 * <li>smarthome/{homeId}/rfid/learn/status - RFID learning status</li>
 * <li>smarthome/{homeId}/status - Device online/offline status</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MqttMessageHandler {

    private final MCUGatewayRepository mcuGatewayRepository;
    private final RFIDService rfidService;
    private final com.example.smart_home_system.service.MqttResponseStore mqttResponseStore;
    private final com.example.smart_home_system.service.MCUGatewayService mcuGatewayService;
    private final com.example.smart_home_system.service.NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // Time window to check for recent active emergency (5 minutes)
    private static final int RECENT_EMERGENCY_WINDOW_MINUTES = 5;

    // Pattern to extract homeId from topic: smarthome/{homeId}/...
    private static final Pattern TOPIC_PATTERN = Pattern.compile("smarthome/(\\d+)/(.+)");

    /**
     * Main message handler for all incoming MQTT messages
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) {
        try {
            String topic = (String) message.getHeaders().get("mqtt_receivedTopic");
            String payload = message.getPayload().toString();

            log.debug("[MQTT] Received message on topic {}: {}", topic,
                    payload.length() > 200 ? payload.substring(0, 200) + "..." : payload);

            Matcher matcher = TOPIC_PATTERN.matcher(topic);
            if (!matcher.matches()) {
                log.warn("[MQTT] Invalid topic format: {}", topic);
                return;
            }

            Long homeId = Long.parseLong(matcher.group(1));
            String subTopic = matcher.group(2);

            // Route to appropriate handler based on sub-topic
            switch (subTopic) {
                case "sensors":
                    handleSensorData(homeId, payload);
                    break;
                case "status":
                    handleDeviceStatus(homeId, payload);
                    break;
                case "device-status":
                    handleDeviceStatusUpdate(homeId, payload);
                    break;
                case "rfid/access":
                    handleRFIDAccess(homeId, payload);
                    break;
                case "rfid/learn/status":
                    handleRFIDLearnStatus(homeId, payload);
                    break;
                case "rfid/cards":
                    handleRFIDCardsList(homeId, payload);
                    break;
                case "gpio/available":
                    handleGPIOAvailable(homeId, payload);
                    break;
                default:
                    log.debug("[MQTT] Unhandled sub-topic: {}", subTopic);
            }
        } catch (Exception e) {
            log.error("[MQTT] Error handling message: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle sensor data from ESP32
     * Updates MCU heartbeat, stores sensor data in metadata, and updates device status
     */
    private void handleSensorData(Long homeId, String payload) {
        try {
            JsonNode data = objectMapper.readTree(payload);
            log.debug("[MQTT] Sensor data received for homeId={}", homeId);

            // Update MCU Gateway heartbeat
            Optional<MCUGateway> mcuOpt = mcuGatewayRepository.findByHomeId(homeId);
            if (mcuOpt.isPresent()) {
                MCUGateway mcu = mcuOpt.get();
                mcu.setLastHeartbeat(LocalDateTime.now());
                mcu.setStatus(MCUStatus.ONLINE);

                // Update IP if provided
                if (data.has("ipAddress")) {
                    mcu.setIpAddress(data.get("ipAddress").asText());
                }

                // Store sensor data as metadata
                mcu.setMetadata(payload);
                mcuGatewayRepository.save(mcu);

                // Process sensor data to update device status (ONLINE/ON/OFF)
                // This will update all devices based on their GPIO pins and sensor values
                try {
                    mcuGatewayService.processSensorDataFromMQTT(homeId, payload);
                    log.debug("[MQTT] Device status updated from sensor data for homeId={}", homeId);
                } catch (Exception e) {
                    log.warn("[MQTT] Failed to process sensor data for device status update: {}", e.getMessage());
                    // Don't fail the whole handler if device update fails
                }

                // Check for emergency conditions and create notifications
                try {
                    checkAndHandleEmergency(homeId, mcu, data);
                } catch (Exception e) {
                    log.warn("[MQTT] Failed to process emergency: {}", e.getMessage());
                    // Don't fail the whole handler if emergency processing fails
                }

                // Broadcast to WebSocket: /topic/home/{homeId}/sensors
                messagingTemplate.convertAndSend("/topic/home/" + homeId + "/sensors", payload);
            }

        } catch (Exception e) {
            log.error("[MQTT] Error handling sensor data: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle device status updates (online/offline via LWT)
     */
    private void handleDeviceStatus(Long homeId, String payload) {
        try {
            log.info("[MQTT] Device status update for homeId={}: {}", homeId, payload);

            Optional<MCUGateway> mcuOpt = mcuGatewayRepository.findByHomeId(homeId);
            if (mcuOpt.isPresent()) {
                MCUGateway mcu = mcuOpt.get();

                if ("online".equalsIgnoreCase(payload)) {
                    mcu.setStatus(MCUStatus.ONLINE);
                    mcu.setLastHeartbeat(LocalDateTime.now());
                } else if ("offline".equalsIgnoreCase(payload)) {
                    mcu.setStatus(MCUStatus.OFFLINE);
                }

                mcuGatewayRepository.save(mcu);

                // Broadcast to WebSocket: /topic/home/{homeId}/status
                messagingTemplate.convertAndSend("/topic/home/" + homeId + "/status", payload);
            }
        } catch (Exception e) {
            log.error("[MQTT] Error handling device status: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle RFID access events from ESP32
     */
    private void handleRFIDAccess(Long homeId, String payload) {
        try {
            JsonNode data = objectMapper.readTree(payload);
            log.info("[MQTT] RFID access event for homeId={}: cardUid={}, authorized={}",
                    homeId,
                    data.has("cardUid") ? data.get("cardUid").asText() : "unknown",
                    data.has("authorized") ? data.get("authorized").asBoolean() : "unknown");

            // Find MCU Gateway to get API key for recording
            Optional<MCUGateway> mcuOpt = mcuGatewayRepository.findByHomeId(homeId);
            if (mcuOpt.isPresent() && mcuOpt.get().getApiKey() != null) {
                RFIDAccessLogRequest request = RFIDAccessLogRequest.builder()
                        .serialNumber(data.has("serialNumber") ? data.get("serialNumber").asText() : null)
                        .cardUid(data.get("cardUid").asText())
                        .authorized(data.get("authorized").asBoolean())
                        .cardName(data.has("cardName") ? data.get("cardName").asText() : null)
                        .status(data.has("status") ? data.get("status").asText() : null)
                        .timestamp(data.has("timestamp") ? data.get("timestamp").asLong() : null)
                        .build();

                rfidService.recordAccessLog(mcuOpt.get().getApiKey(), request);
            }

            // Broadcast to WebSocket: /topic/home/{homeId}/rfid/access
            messagingTemplate.convertAndSend("/topic/home/" + homeId + "/rfid/access", payload);

        } catch (Exception e) {
            log.error("[MQTT] Error handling RFID access: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle RFID learning status updates from ESP32
     */
    private void handleRFIDLearnStatus(Long homeId, String payload) {
        try {
            log.info("[MQTT] RFID learn status for homeId={}: {}", homeId, payload);

            // If response to request (has requestId), complete the pending future
            try {
                JsonNode node = objectMapper.readTree(payload);
                if (node.has("requestId")) {
                    String requestId = node.get("requestId").asText();
                    mqttResponseStore.complete(requestId, payload);
                    return;
                }
            } catch (Exception ignored) {
            }

            // Broadcast to WebSocket: /topic/home/{homeId}/rfid/learn/status
            messagingTemplate.convertAndSend("/topic/home/" + homeId + "/rfid/learn/status", payload);

        } catch (Exception e) {
            log.error("[MQTT] Error handling RFID learn status: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle RFID cards list response from ESP32
     */
    private void handleRFIDCardsList(Long homeId, String payload) {
        try {
            log.debug("[MQTT] RFID cards list for homeId={}", homeId);

            // If response to request (has requestId), complete the pending future
            try {
                JsonNode node = objectMapper.readTree(payload);
                if (node.has("requestId")) {
                    String requestId = node.get("requestId").asText();
                    mqttResponseStore.complete(requestId, payload);
                    return;
                }
            } catch (Exception ignored) {
            }

            // Broadcast to WebSocket: /topic/home/{homeId}/rfid/cards
            messagingTemplate.convertAndSend("/topic/home/" + homeId + "/rfid/cards", payload);

        } catch (Exception e) {
            log.error("[MQTT] Error handling RFID cards list: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle GPIO available pins response from ESP32
     */
    private void handleGPIOAvailable(Long homeId, String payload) {
        try {
            log.debug("[MQTT] GPIO available for homeId={}", homeId);

            // If response to request (has requestId), complete the pending future
            try {
                JsonNode node = objectMapper.readTree(payload);
                if (node.has("requestId")) {
                    String requestId = node.get("requestId").asText();
                    mqttResponseStore.complete(requestId, payload);
                    return;
                }
            } catch (Exception ignored) {
            }

            // Broadcast to WebSocket if no requestId
            messagingTemplate.convertAndSend("/topic/home/" + homeId + "/gpio/available", payload);

        } catch (Exception e) {
            log.error("[MQTT] Error handling GPIO available: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle device status update from ESP32 (immediate status change)
     * Called when MCU changes device state (e.g., door auto-closes, sensor triggers)
     * Updates device status in database immediately
     */
    private void handleDeviceStatusUpdate(Long homeId, String payload) {
        try {
            JsonNode data = objectMapper.readTree(payload);
            log.info("[MQTT] Device status update received for homeId={}: {}", homeId, payload);

            // Process device status update through MCUGatewayService
            // This will update the device status in database immediately
            try {
                mcuGatewayService.processDeviceStatusUpdate(homeId, payload);
                log.info("[MQTT] Device status updated from MCU for homeId={}, payload={}", homeId, payload);
            } catch (Exception e) {
                log.warn("[MQTT] Failed to process device status update: {}", e.getMessage(), e);
                // Don't fail the whole handler if device update fails
            }

            // Broadcast to WebSocket: /topic/home/{homeId}/device-status
            String wsTopic = "/topic/home/" + homeId + "/device-status";
            messagingTemplate.convertAndSend(wsTopic, payload);
            log.info("[MQTT] Broadcast device status to WebSocket topic: {}", wsTopic);

        } catch (Exception e) {
            log.error("[MQTT] Error handling device status update: {}", e.getMessage(), e);
        }
    }

    /**
     * Check for emergency conditions in sensor data and create notifications
     */
    private void checkAndHandleEmergency(Long homeId, MCUGateway mcu, JsonNode sensorData) {
        try {
            boolean hasEmergency = false;
            boolean emergencyFire = false;
            boolean emergencyGas = false;
            String emergencyType = null;

            // Check emergency flags from sensor data
            if (sensorData.has("emergency") && sensorData.get("emergency").asBoolean()) {
                hasEmergency = true;
                
                // Check specific emergency types
                if (sensorData.has("emergencyFire") && sensorData.get("emergencyFire").asBoolean()) {
                    emergencyFire = true;
                }
                if (sensorData.has("emergencyGas") && sensorData.get("emergencyGas").asBoolean()) {
                    emergencyGas = true;
                }
                
                // Determine emergency type
                if (emergencyFire && emergencyGas) {
                    emergencyType = "BOTH";
                } else if (emergencyFire) {
                    emergencyType = "FIRE";
                } else if (emergencyGas) {
                    emergencyType = "GAS";
                } else {
                    emergencyType = "UNKNOWN";
                }
            } else {
                // Check individual flags if emergency flag is not present
                if (sensorData.has("emergencyFire") && sensorData.get("emergencyFire").asBoolean()) {
                    hasEmergency = true;
                    emergencyFire = true;
                    emergencyType = "FIRE";
                }
                if (sensorData.has("emergencyGas") && sensorData.get("emergencyGas").asBoolean()) {
                    hasEmergency = true;
                    emergencyGas = true;
                    emergencyType = emergencyType != null ? "BOTH" : "GAS";
                }
            }

            // Also check gasAlert as a warning
            boolean gasAlert = sensorData.has("gasAlert") && sensorData.get("gasAlert").asBoolean();
            
            if (hasEmergency && emergencyType != null && mcu.getApiKey() != null) {
                log.warn("[MQTT] Emergency detected for homeId={}: type={}, fire={}, gas={}", 
                        homeId, emergencyType, emergencyFire, emergencyGas);
                
                // Create emergency notification
                String metadata = sensorData.toString();
                notificationService.createEmergencyNotification(
                        mcu.getApiKey(),
                        emergencyType,
                        true, // isActive
                        null, // deviceCode - could be extracted from sensor data if needed
                        metadata
                );
                
                // Broadcast emergency to WebSocket
                String emergencyPayload = String.format(
                    "{\"type\":\"%s\",\"isActive\":true,\"fire\":%s,\"gas\":%s,\"timestamp\":%d}",
                    emergencyType, emergencyFire, emergencyGas, System.currentTimeMillis()
                );
                messagingTemplate.convertAndSend("/topic/home/" + homeId + "/emergency", emergencyPayload);
                log.info("[MQTT] Emergency notification created and broadcast for homeId={}", homeId);
            } else if (!hasEmergency && (sensorData.has("emergency") && !sensorData.get("emergency").asBoolean())) {
                // Emergency cleared - only create notification if there was a recent active emergency
                // This prevents creating CLEARED notifications when system is already in cleared state
                LocalDateTime since = LocalDateTime.now().minusMinutes(RECENT_EMERGENCY_WINDOW_MINUTES);
                boolean hadRecentEmergency = notificationRepository.existsRecentEmergencyByHomeId(
                        homeId, NotificationType.EMERGENCY, since);
                
                if (hadRecentEmergency) {
                    // Tránh tạo trùng: nếu đã tạo CLEARED gần đây (2 phút), bỏ qua
                    LocalDateTime clearedSince = LocalDateTime.now().minusMinutes(2);
                    boolean alreadyCleared = notificationRepository.existsRecentClearedByHomeId(
                            homeId, "%giải quyết%", clearedSince);
                    if (alreadyCleared) {
                        log.debug("[MQTT] Skipping CLEARED - already created recently for homeId={}", homeId);
                    } else if (mcu.getApiKey() != null) {
                        log.info("[MQTT] Emergency cleared for homeId={} (had recent active emergency)", homeId);

                        String resolvedTypeLabel = notificationService.getResolvedEmergencyTypeLabel(homeId);

                        notificationService.createEmergencyNotification(
                                mcu.getApiKey(),
                                "CLEARED",
                                false, // isActive
                                null,
                                sensorData.toString()
                        );

                        // Broadcast emergency cleared với mô tả cụ thể
                        String clearedPayload = String.format(
                            "{\"type\":\"CLEARED\",\"isActive\":false,\"resolvedTypeLabel\":\"%s\",\"timestamp\":%d}",
                            resolvedTypeLabel.replace("\"", "\\\""),
                            System.currentTimeMillis()
                        );
                        messagingTemplate.convertAndSend("/topic/home/" + homeId + "/emergency", clearedPayload);
                    }
                } else {
                    log.debug("[MQTT] Emergency cleared for homeId={} but no recent active emergency - skipping notification", homeId);
                }
            }
            
            // Handle gas alert as warning (not emergency but still important)
            if (gasAlert && !hasEmergency) {
                log.warn("[MQTT] Gas alert (warning) for homeId={}", homeId);
                // Could create a WARNING notification here if needed
            }
            
        } catch (Exception e) {
            log.error("[MQTT] Error checking emergency conditions: {}", e.getMessage(), e);
        }
    }
}
