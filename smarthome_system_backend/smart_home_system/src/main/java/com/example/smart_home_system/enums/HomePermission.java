package com.example.smart_home_system.enums;

public enum HomePermission {
    // ========== HOME LEVEL PERMISSIONS ==========
    HOME_VIEW,              // Xem thông tin cơ bản của nhà
    HOME_UPDATE,            // [NEW] Cập nhật thông tin nhà (Tên, địa chỉ...)
    HOME_DELETE,            // Xóa nhà
    HOME_TRANSFER_OWNERSHIP,// [NEW] Chuyển quyền sở hữu nhà
    HOME_DASHBOARD_VIEW,    // Xem dashboard tổng quan

    // ========== HOME SETTINGS (Cấu hình nâng cao) ==========
    HOME_SETTINGS_VIEW,     // Xem cài đặt
    HOME_SETTINGS_UPDATE,   // Sửa cài đặt (Timezone, Policy...)

    // ========== DEVICE PERMISSIONS ==========
    DEVICE_VIEW,            // Xem danh sách/chi tiết thiết bị
    DEVICE_CONTROL,         // Điều khiển (Bật/Tắt)
    DEVICE_CREATE,          // Thêm thiết bị mới
    DEVICE_UPDATE,          // Sửa tên, metadata thiết bị
    DEVICE_DELETE,          // Xóa thiết bị

    // ========== ROOM PERMISSIONS ==========
    ROOM_VIEW,
    ROOM_CREATE,
    ROOM_UPDATE,
    ROOM_DELETE,

    // ========== AUTOMATION PERMISSIONS ==========
    AUTOMATION_VIEW,
    AUTOMATION_CREATE,
    AUTOMATION_UPDATE,
    AUTOMATION_DELETE,
    AUTOMATION_EXECUTE,     // Chạy automation thủ công (nếu có)

    // ========== SCENE PERMISSIONS ==========
    SCENE_VIEW,
    SCENE_CREATE,
    SCENE_UPDATE,
    SCENE_DELETE,
    SCENE_EXECUTE,          // Kích hoạt ngữ cảnh

    // ========== MEMBER PERMISSIONS ==========
    MEMBER_VIEW,            // Xem danh sách thành viên
    MEMBER_INVITE,          // Mời thành viên mới
    MEMBER_UPDATE,          // Cập nhật quyền/role của thành viên
    MEMBER_REMOVE,          // Xóa thành viên khỏi nhà

    // ========== LOGS ==========
    HOME_LOGS_VIEW          // Xem lịch sử hoạt động
}