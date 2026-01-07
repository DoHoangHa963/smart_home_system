package com.example.smart_home_system.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class RequestApi {
    // ==================== BASE API ====================
    public static final String API_VERSION = "/v1";

    // ==================== AUTHENTICATION ====================
    public static final String AUTH = API_VERSION + "/auth";
    public static final String AUTH_LOGIN = "/login";
    public static final String AUTH_REGISTER = "/register";
    public static final String AUTH_LOGOUT = "/logout";
    public static final String AUTH_REFRESH_TOKEN = "/refresh-token";
    public static final String AUTH_VERIFY_EMAIL = "/verify-email";
    public static final String AUTH_RESEND_VERIFICATION = "/resend-verification";
    public static final String AUTH_FORGOT_PASSWORD = "/forgot-password";
    public static final String AUTH_RESET_PASSWORD = "/reset-password";
    public static final String AUTH_CHANGE_PASSWORD = "/change-password";
    public static final String AUTH_VERIFY_OTP = "/verify-otp";

    // ==================== USER ====================
    public static final String USER = API_VERSION + "/users";
    public static final String USER_ME = "/me";
    public static final String USER_PROFILE = "/profile";
    public static final String USER_UPDATE_PROFILE = "/profile";
    public static final String USER_UPLOAD_AVATAR = "/avatar";
    public static final String USER_GET_BY_ID = "/{userId}";
    public static final String USER_UPDATE = "/{userId}";
    public static final String USER_DELETE = "/{userId}";
    public static final String USER_LIST = "";
    public static final String USER_SEARCH = "/search";
    public static final String USER_CHANGE_STATUS = "/{userId}/status";
    public static final String USER_ROLES = "/{userId}/roles";

    // ==================== HOME ====================
    public static final String HOME = API_VERSION + "/homes";
    public static final String HOME_CREATE = "";
    public static final String HOME_GET_BY_ID = "/{homeId}";
    public static final String HOME_WITH_MEMBERS = "/{homeId}/with-members";
    public static final String HOME_UPDATE = "/{homeId}";
    public static final String HOME_DELETE = "/{homeId}";
    public static final String HOME_LIST = "";
    public static final String HOME_MY_HOMES = "/my-homes";

    // Home Members
    public static final String HOME_MEMBERS = "/{homeId}/members";
    public static final String HOME_ADD_MEMBER = "/{homeId}/members";
    public static final String HOME_REMOVE_MEMBER = "/{homeId}/members/{userId}";
    public static final String HOME_UPDATE_MEMBER_ROLE = "/{homeId}/members/{userId}/role";
    public static final String HOME_MEMBER_PERMISSIONS = "/{homeId}/members/{userId}/permissions";
    public static final String HOME_LEAVE = "/{homeId}/leave";
    public static final String HOME_TRANSFER_OWNERSHIP = "/{homeId}/transfer-ownership";

    // ==================== ROLE & PERMISSION ====================
    public static final String ROLE = API_VERSION + "/roles";
    public static final String ROLE_CREATE = "";
    public static final String ROLE_GET_ALL = "";
    public static final String ROLE_GET_BY_ID = "/{id}";
    public static final String ROLE_UPDATE = "/{id}";
    public static final String ROLE_DELETE = "/{id}";

    // ==================== USER DEVICE PERMISSION ====================
    public static final String USER_DEVICE_PERMISSION = API_VERSION + "/device-permissions";
    public static final String DEVICE_PERMISSION_ASSIGN = "";
    public static final String DEVICE_PERMISSION_UPDATE = "/{permissionId}";
    public static final String DEVICE_PERMISSION_REVOKE = "/{permissionId}";
    public static final String DEVICE_PERMISSION_GET_BY_ID = "/{id}";
    public static final String DEVICE_PERMISSION_BY_USER = "/user/{userId}";
    public static final String DEVICE_PERMISSION_BY_DEVICE = "/device/{deviceId}";

    public static final String PERMISSION = API_VERSION + "/permissions";
    public static final String PERMISSION_CREATE = "";
    public static final String PERMISSION_GET_ALL = "";
    public static final String PERMISSION_GET_BY_ID = "/{id}";
    public static final String PERMISSION_DELETE = "/{id}";

    // ==================== ROOM ====================
    public static final String ROOM = API_VERSION + "/rooms";
    public static final String ROOM_CREATE = "";
    public static final String ROOM_GET_BY_ID = "/{roomId}";
    public static final String ROOM_UPDATE = "/{roomId}";
    public static final String ROOM_DELETE = "/{roomId}";
    public static final String ROOM_LIST_BY_HOME = "/home/{homeId}";
    public static final String ROOM_MOVE_DEVICE = "/{roomId}/devices/{deviceId}";

    // ==================== DEVICE ====================
    public static final String DEVICE = API_VERSION + "/devices";
    public static final String DEVICE_CREATE = "";
    public static final String DEVICE_GET_BY_ID = "/{deviceId}";
    public static final String DEVICE_GET_BY_CODE = "/{deviceCode}";
    public static final String DEVICE_UPDATE = "/{deviceId}";
    public static final String DEVICE_DELETE = "/{deviceId}";
    public static final String DEVICE_LIST = "";
    public static final String DEVICE_LIST_BY_HOME = "/home/{homeId}";
    public static final String DEVICE_LIST_BY_ROOM = "/room/{roomId}";
    public static final String DEVICE_UPDATE_STATUS = "/{deviceId}/status";
    public static final String DEVICE_SEARCH = "/search";

    // Device Control
    public static final String DEVICE_CONTROL = "/{deviceId}/control";
    public static final String DEVICE_TURN_ON = "/{deviceId}/turn-on";
    public static final String DEVICE_TURN_OFF = "/{deviceId}/turn-off";
    public static final String DEVICE_TOGGLE = "/{deviceId}/toggle";
    public static final String DEVICE_SET_STATE = "/{deviceId}/state";
    public static final String DEVICE_GET_STATE = "/{deviceId}/state";

    // Device Pairing
    public static final String DEVICE_PAIR = "/pair";
    public static final String DEVICE_UNPAIR = "/{deviceId}/unpair";
    public static final String DEVICE_SCAN = "/scan";

    // Device Logs & Statistics
    public static final String DEVICE_LOGS = "/{deviceId}/logs";
    public static final String DEVICE_STATISTICS = "/{deviceId}/statistics";
    public static final String DEVICE_ENERGY_CONSUMPTION = "/{deviceId}/energy-consumption";

    // Device Firmware
    public static final String DEVICE_FIRMWARE_VERSION = "/{deviceId}/firmware/version";
    public static final String DEVICE_FIRMWARE_UPDATE = "/{deviceId}/firmware/update";
    public static final String DEVICE_FIRMWARE_CHECK = "/{deviceId}/firmware/check-update";

    // ==================== SCENE ====================
    public static final String SCENE = API_VERSION + "/scenes";
    public static final String SCENE_CREATE = "";
    public static final String SCENE_GET_BY_ID = "/{sceneId}";
    public static final String SCENE_UPDATE = "/{sceneId}";
    public static final String SCENE_DELETE = "/{sceneId}";
    public static final String SCENE_LIST = "";
    public static final String SCENE_LIST_BY_HOME = "/home/{homeId}";
    public static final String SCENE_EXECUTE = "/{sceneId}/execute";
    public static final String SCENE_ACTIONS = "/{sceneId}/actions";
    public static final String SCENE_ADD_ACTION = "/{sceneId}/actions";
    public static final String SCENE_UPDATE_ACTION = "/{sceneId}/actions/{actionId}";
    public static final String SCENE_DELETE_ACTION = "/{sceneId}/actions/{actionId}";

    // ==================== AUTOMATION ====================
    public static final String AUTOMATION = API_VERSION + "/automations";
    public static final String AUTOMATION_CREATE = "";
    public static final String AUTOMATION_GET_BY_ID = "/{automationId}";
    public static final String AUTOMATION_UPDATE = "/{automationId}";
    public static final String AUTOMATION_DELETE = "/{automationId}";
    public static final String AUTOMATION_LIST = "";
    public static final String AUTOMATION_LIST_BY_HOME = "/home/{homeId}";
    public static final String AUTOMATION_ENABLE = "/{automationId}/enable";
    public static final String AUTOMATION_DISABLE = "/{automationId}/disable";
    public static final String AUTOMATION_TOGGLE = "/{automationId}/toggle";
    public static final String AUTOMATION_EXECUTE = "/{automationId}/execute";
    public static final String AUTOMATION_LOGS = "/{automationId}/logs";

    // Automation Conditions & Actions
    public static final String AUTOMATION_CONDITIONS = "/{automationId}/conditions";
    public static final String AUTOMATION_ADD_CONDITION = "/{automationId}/conditions";
    public static final String AUTOMATION_UPDATE_CONDITION = "/{automationId}/conditions/{conditionId}";
    public static final String AUTOMATION_DELETE_CONDITION = "/{automationId}/conditions/{conditionId}";
    public static final String AUTOMATION_ACTIONS = "/{automationId}/actions";
    public static final String AUTOMATION_ADD_ACTION = "/{automationId}/actions";
    public static final String AUTOMATION_UPDATE_ACTION = "/{automationId}/actions/{actionId}";
    public static final String AUTOMATION_DELETE_ACTION = "/{automationId}/actions/{actionId}";

    // ==================== SCHEDULE ====================
    public static final String SCHEDULE = API_VERSION + "/schedules";
    public static final String SCHEDULE_CREATE = "";
    public static final String SCHEDULE_GET_BY_ID = "/{scheduleId}";
    public static final String SCHEDULE_UPDATE = "/{scheduleId}";
    public static final String SCHEDULE_DELETE = "/{scheduleId}";
    public static final String SCHEDULE_LIST = "";
    public static final String SCHEDULE_LIST_BY_HOME = "/home/{homeId}";
    public static final String SCHEDULE_ENABLE = "/{scheduleId}/enable";
    public static final String SCHEDULE_DISABLE = "/{scheduleId}/disable";
    public static final String SCHEDULE_UPCOMING = "/upcoming";

    // ==================== GROUP ====================
    public static final String GROUP = API_VERSION + "/groups";
    public static final String GROUP_CREATE = "";
    public static final String GROUP_GET_BY_ID = "/{groupId}";
    public static final String GROUP_UPDATE = "/{groupId}";
    public static final String GROUP_DELETE = "/{groupId}";
    public static final String GROUP_LIST = "";
    public static final String GROUP_LIST_BY_HOME = "/home/{homeId}";
    public static final String GROUP_ADD_DEVICE = "/{groupId}/devices/{deviceId}";
    public static final String GROUP_REMOVE_DEVICE = "/{groupId}/devices/{deviceId}";
    public static final String GROUP_CONTROL = "/{groupId}/control";
    public static final String GROUP_TURN_ON = "/{groupId}/turn-on";
    public static final String GROUP_TURN_OFF = "/{groupId}/turn-off";

    // ==================== NOTIFICATION ====================
    public static final String NOTIFICATION = API_VERSION + "/notifications";
    public static final String NOTIFICATION_LIST = "";
    public static final String NOTIFICATION_GET_BY_ID = "/{notificationId}";
    public static final String NOTIFICATION_MARK_READ = "/{notificationId}/read";
    public static final String NOTIFICATION_MARK_ALL_READ = "/read-all";
    public static final String NOTIFICATION_DELETE = "/{notificationId}";
    public static final String NOTIFICATION_DELETE_ALL = "/delete-all";
    public static final String NOTIFICATION_UNREAD_COUNT = "/unread-count";
    public static final String NOTIFICATION_SETTINGS = "/settings";
    public static final String NOTIFICATION_UPDATE_SETTINGS = "/settings";

    // ==================== DASHBOARD ====================
    public static final String DASHBOARD = API_VERSION + "/dashboard";
    public static final String DASHBOARD_OVERVIEW = "/overview";
    public static final String DASHBOARD_STATISTICS = "/statistics";
    public static final String DASHBOARD_ENERGY_USAGE = "/energy-usage";
    public static final String DASHBOARD_DEVICE_STATUS = "/device-status";
    public static final String DASHBOARD_RECENT_ACTIVITIES = "/recent-activities";

    // ==================== SETTINGS ====================
    public static final String SETTINGS = API_VERSION + "/settings";
    public static final String SETTINGS_GET_ALL = "";
    public static final String SETTINGS_GET_BY_KEY = "/{key}";
    public static final String SETTINGS_UPDATE = "/{key}";
    public static final String SETTINGS_RESET = "/reset";
    public static final String SETTINGS_PREFERENCES = "/preferences";

    // ==================== LOGS ====================
    public static final String LOGS = API_VERSION + "/logs";
    public static final String LOGS_SYSTEM = "/system";
    public static final String LOGS_DEVICE = "/device/{deviceId}";
    public static final String LOGS_USER = "/user/{userId}";
    public static final String LOGS_AUTOMATION = "/automation/{automationId}";
    public static final String LOGS_EXPORT = "/export";

    // ==================== ADMIN ====================
    public static final String ADMIN = API_VERSION + "/admin";
    public static final String ADMIN_USERS = "/users";
    public static final String ADMIN_USERS_GET_BY_ID = "/users/{userId}";
    public static final String ADMIN_USERS_LOCK = "/users/{userId}/lock";
    public static final String ADMIN_USERS_UNLOCK = "/users/{userId}/unlock";
    public static final String ADMIN_USERS_DELETE = "/users/{userId}";
    public static final String ADMIN_DEVICES = "/devices";
    public static final String ADMIN_STATISTICS = "/statistics";
    public static final String ADMIN_SYSTEM_HEALTH = "/system-health";

    // ==================== FILE UPLOAD ====================
    public static final String FILE = API_VERSION + "/files";
    public static final String FILE_UPLOAD = "/upload";
    public static final String FILE_UPLOAD_MULTIPLE = "/upload-multiple";
    public static final String FILE_DOWNLOAD = "/download/{fileId}";
    public static final String FILE_DELETE = "/{fileId}";

    // ==================== HEALTH CHECK ====================
    public static final String HEALTH = "/health";
    public static final String HEALTH_CHECK = "/check";
    public static final String HEALTH_READY = "/ready";
    public static final String HEALTH_LIVE = "/live";
}
