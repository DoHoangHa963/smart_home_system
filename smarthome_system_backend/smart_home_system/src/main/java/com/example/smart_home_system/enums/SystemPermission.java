package com.example.smart_home_system.enums;

public enum SystemPermission {
    // User management
    SYSTEM_USER_VIEW,
    SYSTEM_USER_CREATE,
    SYSTEM_USER_UPDATE,
    SYSTEM_USER_DELETE,
    SYSTEM_USER_MANAGE,

    // Home management (system level)
    SYSTEM_HOME_VIEW,
    SYSTEM_HOME_MANAGE,
    SYSTEM_HOME_DELETE,

    // System settings
    SYSTEM_SETTINGS_VIEW,
    SYSTEM_SETTINGS_MANAGE,

    // Logs & Analytics
    SYSTEM_LOGS_VIEW,
    SYSTEM_ANALYTICS_VIEW
}
