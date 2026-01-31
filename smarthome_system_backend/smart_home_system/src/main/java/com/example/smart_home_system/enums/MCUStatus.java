package com.example.smart_home_system.enums;

import com.example.smart_home_system.entity.MCUGateway;

/**
 * Enumeration representing the possible states of an MCU Gateway (ESP32).
 * 
 * <p>The MCU Gateway lifecycle transitions through these states:
 * <pre>
 *   [New Device] → PAIRING → ONLINE ↔ OFFLINE
 *                              ↓
 *                           ERROR
 * </pre>
 * 
 * <p><b>State Transitions:</b>
 * <ul>
 *   <li>PAIRING → ONLINE: When pairing is confirmed and API key is generated</li>
 *   <li>ONLINE → OFFLINE: When no heartbeat received for 5 minutes</li>
 *   <li>OFFLINE → ONLINE: When heartbeat is received</li>
 *   <li>* → ERROR: When device reports an error condition</li>
 *   <li>ERROR → ONLINE: When heartbeat is received (auto-recovery)</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUGateway
 */
public enum MCUStatus {
    /**
     * Đang trong quá trình pairing (chờ user xác nhận)
     */
    PAIRING,
    
    /**
     * MCU đang online và hoạt động bình thường
     */
    ONLINE,
    
    /**
     * MCU offline (không nhận được heartbeat)
     */
    OFFLINE,
    
    /**
     * MCU có lỗi (cần kiểm tra)
     */
    ERROR
}
