package com.example.smart_home_system.dto.request.MCU;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for sending API Key to ESP32 via proxy.
 * 
 * <p>This DTO is used when frontend wants to send API Key to ESP32.
 * Backend will proxy the request to ESP32 to avoid CORS issues.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUSendApiKeyRequest {
    
    /**
     * IP Address của ESP32
     */
    @NotBlank(message = "IP Address không được để trống")
    @Pattern(regexp = "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$", 
             message = "IP Address không hợp lệ")
    private String esp32IpAddress;
    
    /**
     * API Key cần gửi đến ESP32
     */
    @NotBlank(message = "API Key không được để trống")
    private String apiKey;
    
    /**
     * MCU Gateway ID
     */
    @NotNull(message = "MCU Gateway ID không được để trống")
    private Long mcuGatewayId;
    
    /**
     * Home ID
     */
    @NotNull(message = "Home ID không được để trống")
    private Long homeId;
}
