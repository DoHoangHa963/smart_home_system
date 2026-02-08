package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.service.MqttService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.integration.support.MessageBuilder;
import org.springframework.messaging.MessageChannel;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Implementation of MqttService for handling MQTT messaging.
 * 
 * <p>Topic structure:
 * <ul>
 *   <li>smarthome/{homeId}/commands - Commands to ESP32</li>
 *   <li>smarthome/{homeId}/rfid/commands - RFID specific commands</li>
 * </ul>
 */
@Service("mqttService")
@RequiredArgsConstructor
@Slf4j
public class MqttServiceImpl implements MqttService {

    private final MessageChannel mqttOutboundChannel;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void publishCommand(Long homeId, String command) {
        String topic = String.format("smarthome/%d/commands", homeId);
        publish(topic, command);
    }

    @Override
    public void publishDeviceCommand(Long homeId, String deviceCode, Integer gpioPin, String action) {
        try {
            // Generate unique command ID using timestamp (ensures uniqueness)
            long commandId = System.currentTimeMillis();
            
            Map<String, Object> command = new HashMap<>();
            command.put("id", commandId);
            command.put("type", "DEVICE_CONTROL");
            command.put("deviceCode", deviceCode);
            command.put("gpioPin", gpioPin);
            command.put("action", action);
            command.put("timestamp", commandId);
            
            String payload = objectMapper.writeValueAsString(command);
            String topic = String.format("smarthome/%d/commands", homeId);
            
            log.info("[MQTT] Publishing device command to {}: id={}, deviceCode={}, gpio={}, action={}", 
                    topic, commandId, deviceCode, gpioPin, action);
            publish(topic, payload);
        } catch (Exception e) {
            log.error("[MQTT] Failed to publish device command: {}", e.getMessage(), e);
        }
    }

    @Override
    public void publish(String topic, String payload) {
        publish(topic, payload, false);
    }

    @Override
    public void publish(String topic, String payload, boolean retained) {
        try {
            mqttOutboundChannel.send(
                MessageBuilder.withPayload(payload)
                    .setHeader(MqttHeaders.TOPIC, topic)
                    .setHeader(MqttHeaders.RETAINED, retained)
                    .setHeader(MqttHeaders.QOS, 1)
                    .build()
            );
            log.debug("[MQTT] Published to {}: {}", topic, 
                    payload.length() > 100 ? payload.substring(0, 100) + "..." : payload);
        } catch (Exception e) {
            log.error("[MQTT] Failed to publish to {}: {}", topic, e.getMessage(), e);
        }
    }

    @Override
    public void requestSensorData(Long homeId) {
        try {
            Map<String, Object> command = new HashMap<>();
            command.put("type", "REQUEST_SENSOR_DATA");
            command.put("timestamp", System.currentTimeMillis());
            
            String payload = objectMapper.writeValueAsString(command);
            String topic = String.format("smarthome/%d/commands", homeId);
            
            log.info("[MQTT] Requesting sensor data from homeId={}", homeId);
            publish(topic, payload);
        } catch (Exception e) {
            log.error("[MQTT] Failed to request sensor data: {}", e.getMessage(), e);
        }
    }

    @Override
    public void startRFIDLearning(Long homeId, String cardName) {
        try {
            Map<String, Object> command = new HashMap<>();
            command.put("type", "RFID_LEARN_START");
            if (cardName != null && !cardName.isEmpty()) {
                command.put("cardName", cardName);
            }
            command.put("timestamp", System.currentTimeMillis());
            
            String payload = objectMapper.writeValueAsString(command);
            String topic = String.format("smarthome/%d/rfid/commands", homeId);
            
            log.info("[MQTT] Starting RFID learning for homeId={}, cardName={}", homeId, cardName);
            publish(topic, payload);
        } catch (Exception e) {
            log.error("[MQTT] Failed to start RFID learning: {}", e.getMessage(), e);
        }
    }

    @Override
    public void clearRFIDCards(Long homeId) {
        try {
            Map<String, Object> command = new HashMap<>();
            command.put("type", "RFID_CLEAR_ALL");
            command.put("timestamp", System.currentTimeMillis());
            
            String payload = objectMapper.writeValueAsString(command);
            String topic = String.format("smarthome/%d/rfid/commands", homeId);
            
            log.info("[MQTT] Clearing all RFID cards for homeId={}", homeId);
            publish(topic, payload);
        } catch (Exception e) {
            log.error("[MQTT] Failed to clear RFID cards: {}", e.getMessage(), e);
        }
    }

    @Override
    public void deleteRFIDCard(Long homeId, int cardIndex) {
        try {
            Map<String, Object> command = new HashMap<>();
            command.put("type", "RFID_DELETE_CARD");
            command.put("cardIndex", cardIndex);
            command.put("timestamp", System.currentTimeMillis());
            
            String payload = objectMapper.writeValueAsString(command);
            String topic = String.format("smarthome/%d/rfid/commands", homeId);
            
            log.info("[MQTT] Deleting RFID card at index {} for homeId={}", cardIndex, homeId);
            publish(topic, payload);
        } catch (Exception e) {
            log.error("[MQTT] Failed to delete RFID card: {}", e.getMessage(), e);
        }
    }

    @Override
    public void updateRFIDCard(Long homeId, int cardIndex, String name, Boolean enabled) {
        try {
            Map<String, Object> command = new HashMap<>();
            command.put("type", "RFID_UPDATE_CARD");
            command.put("cardIndex", cardIndex);
            if (name != null) {
                command.put("name", name);
            }
            if (enabled != null) {
                command.put("enabled", enabled);
            }
            command.put("timestamp", System.currentTimeMillis());
            
            String payload = objectMapper.writeValueAsString(command);
            String topic = String.format("smarthome/%d/rfid/commands", homeId);
            
            log.info("[MQTT] Updating RFID card at index {} for homeId={}", cardIndex, homeId);
            publish(topic, payload);
        } catch (Exception e) {
            log.error("[MQTT] Failed to update RFID card: {}", e.getMessage(), e);
        }
    }

    @Override
    public void publishPairingCredentials(String serialNumber, String apiKey, long mcuGatewayId, long homeId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "PAIRING_CREDENTIALS");
            payload.put("apiKey", apiKey);
            payload.put("mcuGatewayId", mcuGatewayId);
            payload.put("homeId", homeId);
            payload.put("timestamp", System.currentTimeMillis());
            
            String topic = "smarthome/pairing/" + serialNumber;
            String jsonPayload = objectMapper.writeValueAsString(payload);
            
            log.info("[MQTT] Publishing pairing credentials to topic={} for serialNumber={}", topic, serialNumber);
            publish(topic, jsonPayload);
        } catch (Exception e) {
            log.error("[MQTT] Failed to publish pairing credentials: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to publish pairing credentials: " + e.getMessage(), e);
        }
    }

    @Override
    public void requestRFIDCards(Long homeId, String requestId) {
        try {
            Map<String, Object> command = new HashMap<>();
            command.put("type", "RFID_REQUEST_CARDS");
            command.put("requestId", requestId);
            command.put("timestamp", System.currentTimeMillis());
            String topic = String.format("smarthome/%d/rfid/commands", homeId);
            publish(topic, objectMapper.writeValueAsString(command));
            log.debug("[MQTT] Requested RFID cards for homeId={}, requestId={}", homeId, requestId);
        } catch (Exception e) {
            log.error("[MQTT] Failed to request RFID cards: {}", e.getMessage(), e);
        }
    }

    @Override
    public void requestRFIDLearnStatus(Long homeId, String requestId) {
        try {
            Map<String, Object> command = new HashMap<>();
            command.put("type", "RFID_REQUEST_LEARN_STATUS");
            command.put("requestId", requestId);
            command.put("timestamp", System.currentTimeMillis());
            String topic = String.format("smarthome/%d/rfid/commands", homeId);
            publish(topic, objectMapper.writeValueAsString(command));
            log.debug("[MQTT] Requested RFID learn status for homeId={}, requestId={}", homeId, requestId);
        } catch (Exception e) {
            log.error("[MQTT] Failed to request RFID learn status: {}", e.getMessage(), e);
        }
    }

    @Override
    public void requestGPIOAvailable(Long homeId, String requestId) {
        try {
            Map<String, Object> command = new HashMap<>();
            command.put("type", "REQUEST_GPIO_AVAILABLE");
            command.put("requestId", requestId);
            command.put("timestamp", System.currentTimeMillis());
            String topic = String.format("smarthome/%d/commands", homeId);
            publish(topic, objectMapper.writeValueAsString(command));
            log.debug("[MQTT] Requested GPIO available for homeId={}, requestId={}", homeId, requestId);
        } catch (Exception e) {
            log.error("[MQTT] Failed to request GPIO available: {}", e.getMessage(), e);
        }
    }
}
