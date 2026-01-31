package com.example.smart_home_system.dto.response.MCU;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for MCU Gateway pairing response.
 * 
 * <p>This DTO is returned after a successful pairing operation and contains
 * the API key that the ESP32 must use for all subsequent API requests.
 * 
 * <p><b>Important Security Notes:</b>
 * <ul>
 *   <li>The API key is only returned once during pairing</li>
 *   <li>The API key has no expiration date</li>
 *   <li>If the API key is lost, the device must be unpaired and re-paired</li>
 *   <li>The ESP32 should store the API key securely in non-volatile memory</li>
 * </ul>
 * 
 * <p><b>Response Scenarios:</b>
 * <ul>
 *   <li><b>Init Pairing:</b> apiKey is null, mcuGatewayId is set</li>
 *   <li><b>Confirm Pairing:</b> apiKey is set with the generated key</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUPairingInitResponse
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUPairingResponse {
    
    /**
     * API Key để ESP32 authenticate
     */
    private String apiKey;
    
    /**
     * MCU Gateway ID
     */
    private Long mcuGatewayId;
    
    /**
     * Home ID đã được pair
     */
    private Long homeId;
    
    /**
     * Thông báo
     */
    private String message;
}
