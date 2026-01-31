package com.example.smart_home_system.config;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.channel.PublishSubscribeChannel;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.outbound.MqttPahoMessageHandler;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

/**
 * MQTT Configuration for Smart Home System.
 * 
 * <p>
 * Topic structure:
 * <ul>
 * <li>smarthome/{homeId}/sensors - ESP32 publishes sensor data</li>
 * <li>smarthome/{homeId}/commands - Backend publishes commands to ESP32</li>
 * <li>smarthome/{homeId}/rfid/access - ESP32 publishes RFID access logs</li>
 * <li>smarthome/{homeId}/rfid/learn/status - ESP32 publishes learning
 * status</li>
 * <li>smarthome/{homeId}/status - ESP32 publishes online/offline status
 * (LWT)</li>
 * </ul>
 */
@Configuration
@Slf4j
public class MqttConfig {

    @Value("${mqtt.broker-url:tcp://localhost:1883}")
    private String brokerUrl;

    @Value("${mqtt.client-id:smarthome-backend}")
    private String clientId;

    @Value("${mqtt.username:}")
    private String username;

    @Value("${mqtt.password:}")
    private String password;

    @Value("${mqtt.default-qos:1}")
    private int defaultQos;

    /**
     * MQTT Client Factory with connection options
     */
    @Bean
    public MqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        MqttConnectOptions options = new MqttConnectOptions();

        options.setServerURIs(new String[] { brokerUrl });
        options.setCleanSession(true);
        options.setAutomaticReconnect(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(60);

        // Set credentials if provided
        if (username != null && !username.isEmpty()) {
            options.setUserName(username);
        }
        if (password != null && !password.isEmpty()) {
            options.setPassword(password.toCharArray());
        }

        // Set Last Will and Testament (LWT) for backend
        options.setWill("smarthome/backend/status", "offline".getBytes(), 1, true);

        factory.setConnectionOptions(options);
        log.info("MQTT Client Factory configured for broker: {}", brokerUrl);
        return factory;
    }

    // ============ INBOUND (Receive from ESP32) ============

    /**
     * Channel for receiving messages from ESP32
     */
    @Bean
    public MessageChannel mqttInputChannel() {
        return new PublishSubscribeChannel();
    }

    /**
     * Inbound adapter subscribing to all ESP32 topics
     * Topics:
     * - smarthome/+/sensors - Sensor data updates
     * - smarthome/+/rfid/# - RFID access and learning
     * - smarthome/+/status - Device online/offline (LWT)
     * - smarthome/+/device-status - Device status changes (ON/OFF from local
     * control)
     * - smarthome/+/commands/ack - Command acknowledgments
     */
    @Bean
    public MessageProducer inboundAdapter() {
        MqttPahoMessageDrivenChannelAdapter adapter = new MqttPahoMessageDrivenChannelAdapter(
                clientId + "-inbound",
                mqttClientFactory(),
                "smarthome/+/sensors",
                "smarthome/+/rfid/#",
                "smarthome/+/status",
                "smarthome/+/device-status",
                "smarthome/+/commands/ack");
        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(defaultQos);
        adapter.setOutputChannel(mqttInputChannel());

        log.info("[MQTT] ✅ Inbound adapter configured for broker: {}", brokerUrl);
        log.info("[MQTT] 📡 Subscribing to topics:");
        log.info("[MQTT]    - smarthome/+/sensors");
        log.info("[MQTT]    - smarthome/+/rfid/#");
        log.info("[MQTT]    - smarthome/+/status");
        log.info("[MQTT]    - smarthome/+/device-status");
        log.info("[MQTT]    - smarthome/+/commands/ack");
        log.warn("[MQTT] ⚠️  If you don't see '[MQTT] ✅ Received message' logs, check:");
        log.warn("[MQTT]    1. MQTT broker is running (mosquitto on port 1883)");
        log.warn("[MQTT]    2. ESP32 is connected to MQTT broker");
        log.warn("[MQTT]    3. ESP32 is publishing to correct topics");

        return adapter;
    }

    // ============ OUTBOUND (Send to ESP32) ============

    /**
     * Channel for sending messages to ESP32
     */
    @Bean
    public MessageChannel mqttOutboundChannel() {
        return new DirectChannel();
    }

    /**
     * Outbound handler for publishing messages
     */
    @Bean
    @ServiceActivator(inputChannel = "mqttOutboundChannel")
    public MessageHandler mqttOutbound() {
        MqttPahoMessageHandler messageHandler = new MqttPahoMessageHandler(
                clientId + "-outbound",
                mqttClientFactory());
        messageHandler.setAsync(true);
        messageHandler.setDefaultTopic("smarthome/commands");
        messageHandler.setDefaultQos(defaultQos);
        messageHandler.setDefaultRetained(false);
        log.info("MQTT Outbound handler configured");
        return messageHandler;
    }
}
