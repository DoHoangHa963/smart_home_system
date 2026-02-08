package com.example.smart_home_system.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * In-memory store for MQTT request-response correlation.
 * Used when backend publishes a request to ESP32 and needs to wait for the response.
 */
@Component
@Slf4j
public class MqttResponseStore {

    private final Map<String, CompletableFuture<String>> pendingRequests = new ConcurrentHashMap<>();

    /**
     * Create a pending request and return a CompletableFuture for the response.
     */
    public CompletableFuture<String> createRequest(String requestId) {
        CompletableFuture<String> future = new CompletableFuture<>();
        pendingRequests.put(requestId, future);
        return future;
    }

    /**
     * Complete a pending request with the response payload.
     */
    public void complete(String requestId, String payload) {
        CompletableFuture<String> future = pendingRequests.remove(requestId);
        if (future != null) {
            future.complete(payload);
            log.debug("Completed MQTT request response: requestId={}", requestId);
        }
    }

    /**
     * Generate a unique request ID.
     */
    public String generateRequestId() {
        return UUID.randomUUID().toString();
    }

    /**
     * Get result with timeout. Removes the pending request on timeout.
     */
    public String getWithTimeout(CompletableFuture<String> future, long timeout, TimeUnit unit) throws Exception {
        return future.get(timeout, unit);
    }
}
