package com.example.smart_home_system.enums;

/**
 * Device Status Enum
 * 
 * - ONLINE: Thiết bị đang kết nối với hệ thống (connected)
 * - OFFLINE: Thiết bị mất kết nối (disconnected)
 * - ON: Thiết bị đang hoạt động (power on)
 * - OFF: Thiết bị tắt nhưng vẫn kết nối (power off, connected)
 * - ERROR: Thiết bị gặp lỗi
 * - ACTIVE/INACTIVE: Trạng thái kích hoạt
 * - UNKNOWN: Không xác định
 */
public enum DeviceStatus {
    ONLINE,
    OFFLINE,
    ON,
    OFF,
    ERROR,
    ACTIVE,
    INACTIVE,
    UNKNOWN
}
