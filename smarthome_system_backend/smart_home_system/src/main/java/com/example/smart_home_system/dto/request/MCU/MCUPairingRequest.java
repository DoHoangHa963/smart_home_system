package com.example.smart_home_system.dto.request.MCU;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for manual MCU Gateway pairing request.
 * 
 * <p>This DTO is used when pairing an ESP32 MCU Gateway with a specific Home.
 * It contains all necessary device information for the pairing process.
 * 
 * <p><b>Required Fields:</b>
 * <ul>
 *   <li>serialNumber - Unique hardware identifier</li>
 *   <li>name - Display name for the gateway</li>
 * </ul>
 * 
 * <p><b>Optional Fields:</b>
 * <ul>
 *   <li>ipAddress - Current network IP address</li>
 *   <li>firmwareVersion - Current firmware version</li>
 *   <li>metadata - Additional device information in JSON format</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUAutoPairRequest
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUPairingRequest {
    
    /**
     * Serial number của ESP32 (MAC address hoặc chip ID)
     */
    @NotBlank(message = "Serial number is required")
    private String serialNumber;

    /**
     * Tên hiển thị của MCU
     */
    @NotBlank(message = "Name is required")
    private String name;

    /**
     * IP Address hiện tại của ESP32
     */
    private String ipAddress;

    /**
     * Firmware version
     */
    private String firmwareVersion;

    /**
     * Metadata bổ sung (JSON string)
     */
    private String metadata;
}
