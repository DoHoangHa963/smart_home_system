package com.example.smart_home_system.dto.request.MCU;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for auto-pairing MCU Gateway request.
 * 
 * <p>This DTO is used for the simplified pairing flow where the ESP32 sends
 * its information and the backend returns a list of available homes for
 * the user to choose from.
 * 
 * <p><b>Pairing Flow:</b>
 * <ol>
 *   <li>ESP32 sends this request with device information</li>
 *   <li>Backend creates MCU Gateway in PAIRING state</li>
 *   <li>Backend returns list of homes user owns (without existing MCU)</li>
 *   <li>User selects home on frontend</li>
 *   <li>Frontend calls confirm-pairing endpoint</li>
 * </ol>
 * 
 * <p><b>Required Fields:</b>
 * <ul>
 *   <li>serialNumber - Unique hardware identifier (MAC address or chip ID)</li>
 * </ul>
 * 
 * <p><b>Optional Fields:</b>
 * <ul>
 *   <li>name - Display name (defaults to "MCU Gateway - {serialNumber}")</li>
 *   <li>ipAddress - Current network IP address</li>
 *   <li>firmwareVersion - Current firmware version</li>
 *   <li>metadata - Additional info like WiFi SSID in JSON format</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUPairingRequest
 * @see MCUPairingInitResponse
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUAutoPairRequest {
    
    /**
     * Serial number của ESP32 (MAC address hoặc chip ID)
     */
    @NotBlank(message = "Serial number is required")
    private String serialNumber;

    /**
     * Home ID mà MCU sẽ được pair với
     * Required - lấy từ home đang được truy cập
     */
    @NotNull(message = "Home ID is required")
    private Long homeId;

    /**
     * Tên hiển thị của MCU (optional, sẽ dùng default nếu null)
     */
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
     * Có thể chứa WiFi SSID để match với home
     */
    private String metadata;
}
