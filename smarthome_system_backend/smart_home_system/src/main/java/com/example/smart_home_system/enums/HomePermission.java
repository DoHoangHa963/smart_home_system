package com.example.smart_home_system.enums;

public enum HomePermission {
    // Dashboard
    HOME_DASHBOARD_VIEW,

    // Device permissions
    DEVICE_VIEW,
    DEVICE_CONTROL,
    DEVICE_CREATE,
    DEVICE_UPDATE,
    DEVICE_DELETE,

    // Room permissions
    ROOM_VIEW,
    ROOM_CREATE,
    ROOM_UPDATE,
    ROOM_DELETE,

    // Automation permissions
    AUTOMATION_VIEW,
    AUTOMATION_CREATE,
    AUTOMATION_UPDATE,
    AUTOMATION_DELETE,
    AUTOMATION_EXECUTE,

    // Scene permissions
    SCENE_VIEW,
    SCENE_CREATE,
    SCENE_UPDATE,
    SCENE_DELETE,
    SCENE_EXECUTE,

    // Member permissions
    MEMBER_VIEW,
    MEMBER_INVITE,
    MEMBER_UPDATE,
    MEMBER_REMOVE,

    // Home settings
    HOME_SETTINGS_VIEW,
    HOME_SETTINGS_UPDATE,

    // Logs
    HOME_LOGS_VIEW
}
