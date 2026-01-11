package com.example.smart_home_system.enums;

public enum HomePermission {
    // ========== HOME LEVEL PERMISSIONS ==========
    HOME_VIEW,              // Xem thông tin nhà
    HOME_MANAGE,            // Quản lý nhà (chung)
    HOME_DELETE,            // Xóa nhà
    HOME_DASHBOARD_VIEW,    // Xem dashboard

    // ========== DEVICE PERMISSIONS ==========
    DEVICE_VIEW,            // Xem thiết bị
    DEVICE_CONTROL,         // Điều khiển thiết bị
    DEVICE_CREATE,          // Tạo thiết bị
    DEVICE_UPDATE,          // Cập nhật thiết bị
    DEVICE_DELETE,          // Xóa thiết bị

    // ========== ROOM PERMISSIONS ==========
    ROOM_VIEW,              // Xem phòng
    ROOM_CREATE,            // Tạo phòng
    ROOM_UPDATE,            // Cập nhật phòng
    ROOM_DELETE,            // Xóa phòng

    // ========== AUTOMATION PERMISSIONS ==========
    AUTOMATION_VIEW,
    AUTOMATION_CREATE,
    AUTOMATION_UPDATE,
    AUTOMATION_DELETE,
    AUTOMATION_EXECUTE,

    // ========== SCENE PERMISSIONS ==========
    SCENE_VIEW,
    SCENE_CREATE,
    SCENE_UPDATE,
    SCENE_DELETE,
    SCENE_EXECUTE,

    // ========== MEMBER PERMISSIONS ==========
    MEMBER_VIEW,
    MEMBER_INVITE,
    MEMBER_UPDATE,
    MEMBER_REMOVE,

    // ========== HOME SETTINGS ==========
    HOME_SETTINGS_VIEW,
    HOME_SETTINGS_UPDATE,

    // ========== LOGS ==========
    HOME_LOGS_VIEW
}