package com.example.smart_home_system.service;

/**
 * Service interface for MQTT messaging operations.
 * 
 * <p>Provides methods to publish messages to ESP32 devices and
 * handle incoming messages from devices.
 */
public interface MqttService {

    /**
     * Publish a command to a specific home's ESP32 device
     * 
     * @param homeId Home ID
     * @param command JSON command string
     */
    void publishCommand(Long homeId, String command);

    /**
     * Publish a device control command
     * 
     * @param homeId Home ID
     * @param deviceCode Device code
     * @param gpioPin GPIO pin number
     * @param action Action to perform (TURN_ON, TURN_OFF, TOGGLE)
     */
    void publishDeviceCommand(Long homeId, String deviceCode, Integer gpioPin, String action);

    /**
     * Publish a message to a specific topic
     * 
     * @param topic MQTT topic
     * @param payload Message payload
     */
    void publish(String topic, String payload);

    /**
     * Publish a retained message to a specific topic
     * 
     * @param topic MQTT topic
     * @param payload Message payload
     * @param retained Whether to retain the message
     */
    void publish(String topic, String payload, boolean retained);

    /**
     * Request sensor data from ESP32 (ESP32 will respond via MQTT)
     * 
     * @param homeId Home ID
     */
    void requestSensorData(Long homeId);

    /**
     * Start RFID learning mode on ESP32
     * 
     * @param homeId Home ID
     * @param cardName Optional name for the new card
     */
    void startRFIDLearning(Long homeId, String cardName);

    /**
     * Clear all RFID cards on ESP32
     * 
     * @param homeId Home ID
     */
    void clearRFIDCards(Long homeId);

    /**
     * Delete a specific RFID card on ESP32
     * 
     * @param homeId Home ID
     * @param cardIndex Card index to delete
     */
    void deleteRFIDCard(Long homeId, int cardIndex);

    /**
     * Update RFID card information on ESP32
     * 
     * @param homeId Home ID
     * @param cardIndex Card index
     * @param name New card name (null to keep current)
     * @param enabled Enable/disable card (null to keep current)
     */
    void updateRFIDCard(Long homeId, int cardIndex, String name, Boolean enabled);
}
