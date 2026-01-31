package com.example.smart_home_system.dto.request.MCU;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for MCU Gateway heartbeat request.
 * 
 * <p>This DTO is sent periodically by the ESP32 MCU Gateway to indicate that
 * the device is online and functioning properly. It also allows the device
 * to update its network information.
 * 
 * <p><b>Heartbeat Behavior:</b>
 * <ul>
 *   <li>Should be sent every 1-5 minutes to maintain online status</li>
 *   <li>Device is considered offline if no heartbeat received for 5 minutes</li>
 *   <li>Requires X-MCU-API-Key header for authentication</li>
 * </ul>
 * 
 * <p><b>All fields are optional:</b>
 * <ul>
 *   <li>serialNumber - Device identifier (for logging purposes)</li>
 *   <li>ipAddress - Updated IP address if changed</li>
 *   <li>firmwareVersion - Updated firmware version if changed</li>
 *   <li>status - Optional status message from device</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUGatewayService#processHeartbeat(String, MCUHeartbeatRequest)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUHeartbeatRequest {
    
    /**
     * Serial number của ESP32
     */
    private String serialNumber;

    /**
     * IP Address hiện tại
     */
    private String ipAddress;

    /**
     * Firmware version
     */
    private String firmwareVersion;

    /**
     * Trạng thái (optional) - JSON string chứa sensor data từ ESP32
     * Format: {"tempIn": 25.5, "humIn": 60, "gas": 500, "light": 300, ...}
     */
    private String status;
    
    /**
     * Trạng thái của các devices (optional) - JSON string chứa device states từ ESP32
     * Format: [{"deviceCode": "LIGHT_01", "state": {"power": "ON"}}, ...]
     * MCU có thể gửi trạng thái của từng device với deviceCode cụ thể
     * Nếu có field này, backend sẽ ưu tiên dùng để cập nhật device states
     */
    private String devices;
}
