package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.response.MCU.MCUSensorDataResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing Server-Sent Events (SSE) connections for real-time sensor data streaming.
 * 
 * <p>This service manages SSE connections per home and broadcasts sensor data updates
 * to all connected clients when new data arrives from MCU Gateway.
 * 
 * <p><b>Features:</b>
 * <ul>
 *   <li>Manages multiple SSE connections per home</li>
 *   <li>Broadcasts sensor data updates in real-time</li>
 *   <li>Automatically cleans up disconnected clients</li>
 *   <li>Thread-safe connection management</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class SensorDataSSEService {

    private final ObjectMapper objectMapper;

    /**
     * Map of homeId -> Set of SSE emitters for that home
     * Thread-safe to handle concurrent connections
     */
    private final Map<Long, Map<String, SseEmitter>> homeConnections = new ConcurrentHashMap<>();
    
    /**
     * Default timeout for SSE connections (30 minutes)
     */
    private static final long SSE_TIMEOUT = 30 * 60 * 1000L;

    /**
     * Create a new SSE connection for a home
     * 
     * @param homeId Home ID to subscribe to sensor data
     * @return SseEmitter for the connection
     */
    public SseEmitter createConnection(Long homeId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        String connectionId = generateConnectionId();
        
        try {
            // Add to connections map
            homeConnections.computeIfAbsent(homeId, k -> new ConcurrentHashMap<>())
                          .put(connectionId, emitter);
            
            // Giảm log level từ debug xuống trace để giảm log
            log.trace("SSE connection created: homeId={}, connectionId={}, totalConnections={}", 
                    homeId, connectionId, getConnectionCount(homeId));
            
            // Handle completion and timeout
            emitter.onCompletion(() -> {
                removeConnection(homeId, connectionId);
                log.trace("SSE connection completed: homeId={}, connectionId={}", homeId, connectionId);
            });
            
            emitter.onTimeout(() -> {
                removeConnection(homeId, connectionId);
                log.trace("SSE connection timeout: homeId={}, connectionId={}", homeId, connectionId);
            });
            
            emitter.onError((ex) -> {
                removeConnection(homeId, connectionId);
                log.error("SSE connection error: homeId={}, connectionId={}", homeId, connectionId, ex);
            });
            
            // Send initial connection event
            try {
                emitter.send(SseEmitter.event()
                        .name("connected")
                        .data("{\"message\":\"Connected to sensor data stream\",\"homeId\":" + homeId + "}"));
            } catch (IOException e) {
                log.error("Failed to send initial connection event for homeId={}, connectionId={}", 
                         homeId, connectionId, e);
                removeConnection(homeId, connectionId);
                emitter.completeWithError(e);
            }
        } catch (Exception e) {
            log.error("Failed to create SSE connection for homeId={}: {}", homeId, e.getMessage(), e);
            removeConnection(homeId, connectionId);
            emitter.completeWithError(e);
        }
        
        return emitter;
    }

    /**
     * Broadcast sensor data to all connected clients for a home
     * 
     * @param homeId Home ID
     * @param sensorData Sensor data to broadcast
     */
    public void broadcastSensorData(Long homeId, MCUSensorDataResponse sensorData) {
        Map<String, SseEmitter> connections = homeConnections.get(homeId);
        if (connections == null || connections.isEmpty()) {
            log.debug("No SSE connections for homeId={}, skipping broadcast", homeId);
            return;
        }
        
        // Giảm log level - chỉ log khi có nhiều connections
        if (connections.size() > 5) {
            log.debug("Broadcasting sensor data to {} connections for homeId={}", 
                     connections.size(), homeId);
        }
        
        // Convert sensor data to JSON string
        String jsonData = convertToJson(sensorData);
        
        // Broadcast to all connections
        connections.entrySet().removeIf(entry -> {
            SseEmitter emitter = entry.getValue();
            try {
                emitter.send(SseEmitter.event()
                        .name("sensor-data")
                        .data(jsonData));
                return false; // Keep connection
            } catch (IOException e) {
                log.debug("Failed to send sensor data to connection {}: {}", 
                         entry.getKey(), e.getMessage());
                return true; // Remove connection
            }
        });
        
        // Chỉ log khi có nhiều connections hoặc có vấn đề
        if (connections.size() > 5) {
            log.debug("Broadcast completed for homeId={}, activeConnections={}", 
                     homeId, connections.size());
        }
    }

    /**
     * Remove a connection from the map
     */
    private void removeConnection(Long homeId, String connectionId) {
        Map<String, SseEmitter> connections = homeConnections.get(homeId);
        if (connections != null) {
            connections.remove(connectionId);
            if (connections.isEmpty()) {
                homeConnections.remove(homeId);
            }
            log.debug("Removed SSE connection: homeId={}, connectionId={}, remainingConnections={}", 
                     homeId, connectionId, getConnectionCount(homeId));
        }
    }

    /**
     * Get connection count for a home
     */
    public int getConnectionCount(Long homeId) {
        Map<String, SseEmitter> connections = homeConnections.get(homeId);
        return connections != null ? connections.size() : 0;
    }

    /**
     * Get total connection count across all homes
     */
    public int getTotalConnectionCount() {
        return homeConnections.values().stream()
                .mapToInt(Map::size)
                .sum();
    }

    /**
     * Generate unique connection ID
     */
    private String generateConnectionId() {
        return "conn_" + System.currentTimeMillis() + "_" + 
               Thread.currentThread().threadId() + "_" +
               (int)(Math.random() * 10000);
    }

    /**
     * Convert MCUSensorDataResponse to JSON string using ObjectMapper
     */
    private String convertToJson(MCUSensorDataResponse sensorData) {
        try {
            return objectMapper.writeValueAsString(sensorData);
        } catch (Exception e) {
            log.error("Failed to convert sensor data to JSON", e);
            return "{}";
        }
    }

    /**
     * Broadcast sensor data from MQTT (raw JSON string)
     * 
     * @param homeId Home ID
     * @param jsonData Raw JSON sensor data from MQTT
     */
    public void broadcastSensorData(Long homeId, String jsonData) {
        broadcast(homeId, "sensor-data", jsonData);
    }

    /**
     * Broadcast RFID access event to all connected clients
     * 
     * @param homeId Home ID
     * @param jsonData Raw JSON RFID access data
     */
    public void broadcastRFIDEvent(Long homeId, String jsonData) {
        broadcast(homeId, "rfid-access", jsonData);
        log.debug("Broadcasted RFID event to homeId={}", homeId);
    }

    /**
     * Broadcast RFID learning status to all connected clients
     * 
     * @param homeId Home ID
     * @param jsonData Raw JSON RFID learning status
     */
    public void broadcastRFIDLearnStatus(Long homeId, String jsonData) {
        broadcast(homeId, "rfid-learn-status", jsonData);
        log.debug("Broadcasted RFID learn status to homeId={}", homeId);
    }

    /**
     * Broadcast RFID cards list to all connected clients
     * 
     * @param homeId Home ID
     * @param jsonData Raw JSON RFID cards list
     */
    public void broadcastRFIDCardsList(Long homeId, String jsonData) {
        broadcast(homeId, "rfid-cards", jsonData);
        log.debug("Broadcasted RFID cards list to homeId={}", homeId);
    }

    /**
     * Generic broadcast method
     * 
     * @param homeId Home ID
     * @param eventName SSE event name
     * @param jsonData JSON data to send
     */
    private void broadcast(Long homeId, String eventName, String jsonData) {
        Map<String, SseEmitter> connections = homeConnections.get(homeId);
        if (connections == null || connections.isEmpty()) {
            log.trace("No SSE connections for homeId={}, skipping broadcast", homeId);
            return;
        }

        log.trace("Broadcasting {} to {} connections for homeId={}", 
                eventName, connections.size(), homeId);

        connections.entrySet().removeIf(entry -> {
            SseEmitter emitter = entry.getValue();
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(jsonData));
                return false; // Keep connection
            } catch (IOException e) {
                log.debug("Failed to send {} to connection {}: {}", 
                        eventName, entry.getKey(), e.getMessage());
                return true; // Remove connection
            }
        });
    }
}
