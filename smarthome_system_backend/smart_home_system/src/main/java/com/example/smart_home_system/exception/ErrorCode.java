package com.example.smart_home_system.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // 1xxx - Bad Request / Validation Errors
    BAD_REQUEST(1000, "Bad request", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED(1001, "Validation failed", HttpStatus.BAD_REQUEST),
    INVALID_INPUT(1002, "Invalid input parameters", HttpStatus.BAD_REQUEST),
    MISSING_REQUIRED_FIELD(1003, "Missing required field", HttpStatus.BAD_REQUEST),
    INVALID_EMAIL_FORMAT(1004, "Invalid email format", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD_FORMAT(1005, "Invalid password format", HttpStatus.BAD_REQUEST),
    INVALID_PHONE_FORMAT(1006, "Invalid phone number format", HttpStatus.BAD_REQUEST),
    INVALID_DATE_FORMAT(1007, "Invalid date format", HttpStatus.BAD_REQUEST),
    INVALID_ENUM_VALUE(1008, "Invalid enum value", HttpStatus.BAD_REQUEST),
    PARAMETER_OUT_OF_RANGE(1009, "Parameter value out of acceptable range", HttpStatus.BAD_REQUEST),

    // 2xxx - Authentication Errors
    UNAUTHORIZED(2000, "Unauthorized access", HttpStatus.UNAUTHORIZED),
    INVALID_TOKEN(2001, "Invalid or expired token", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED(2002, "Access token has expired", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_EXPIRED(2003, "Refresh token has expired", HttpStatus.UNAUTHORIZED),
    INVALID_CREDENTIALS(2004, "Invalid username or password", HttpStatus.UNAUTHORIZED),
    ACCOUNT_LOCKED(2005, "Account has been locked", HttpStatus.UNAUTHORIZED),
    ACCOUNT_DISABLED(2006, "Account has been disabled", HttpStatus.UNAUTHORIZED),
    PASSWORD_EXPIRED(2007, "Password has expired", HttpStatus.UNAUTHORIZED),
    INVALID_OTP(2008, "Invalid OTP code", HttpStatus.UNAUTHORIZED),
    OTP_EXPIRED(2009, "OTP code has expired", HttpStatus.UNAUTHORIZED),
    TOO_MANY_LOGIN_ATTEMPTS(2010, "Too many failed login attempts", HttpStatus.UNAUTHORIZED),
    SESSION_EXPIRED(2011, "Session has expired", HttpStatus.UNAUTHORIZED),

    // 3xxx - Authorization/Permission Errors
    FORBIDDEN(3000, "Access forbidden", HttpStatus.FORBIDDEN),
    INSUFFICIENT_PERMISSIONS(3001, "Insufficient permissions to perform this action", HttpStatus.FORBIDDEN),
    ROLE_NOT_AUTHORIZED(3002, "User role not authorized for this operation", HttpStatus.FORBIDDEN),
    RESOURCE_ACCESS_DENIED(3003, "Access denied to this resource", HttpStatus.FORBIDDEN),
    DEVICE_ACCESS_DENIED(3004, "You don't have permission to access this device", HttpStatus.FORBIDDEN),
    HOME_ACCESS_DENIED(3005, "You don't have permission to access this home", HttpStatus.FORBIDDEN),
    ADMIN_ONLY_ACCESS(3006, "This action requires admin privileges", HttpStatus.FORBIDDEN),

    // 4xxx - Not Found Errors
    NOT_FOUND(4000, "Resource not found", HttpStatus.NOT_FOUND),

    // User not found
    USER_NOT_FOUND(4001, "User not found", HttpStatus.NOT_FOUND),
    USER_PROFILE_NOT_FOUND(4002, "User profile not found", HttpStatus.NOT_FOUND),

    // Device not found
    DEVICE_NOT_FOUND(4010, "Device not found", HttpStatus.NOT_FOUND),
    DEVICE_TYPE_NOT_FOUND(4011, "Device type not found", HttpStatus.NOT_FOUND),
    DEVICE_LOG_NOT_FOUND(4012, "Device log not found", HttpStatus.NOT_FOUND),

    // Home & Room not found
    HOME_NOT_FOUND(4020, "Home not found", HttpStatus.NOT_FOUND),
    ROOM_NOT_FOUND(4021, "Room not found", HttpStatus.NOT_FOUND),
    HOME_MEMBER_NOT_FOUND(4022, "Home member not found", HttpStatus.NOT_FOUND),
    HOME_LIMIT_REACHED(1010, "Bạn đã đạt giới hạn số lượng nhà cho phép (Tối đa 3 nhà)", HttpStatus.BAD_REQUEST),

    // Scene not found
    SCENE_NOT_FOUND(4030, "Scene not found", HttpStatus.NOT_FOUND),
    SCENE_ACTION_NOT_FOUND(4031, "Scene action not found", HttpStatus.NOT_FOUND),

    // Automation not found
    AUTOMATION_NOT_FOUND(4040, "Automation rule not found", HttpStatus.NOT_FOUND),
    AUTOMATION_CONDITION_NOT_FOUND(4041, "Automation condition not found", HttpStatus.NOT_FOUND),

    // Schedule not found
    SCHEDULE_NOT_FOUND(4050, "Schedule not found", HttpStatus.NOT_FOUND),

    // Notification not found
    NOTIFICATION_NOT_FOUND(4060, "Notification not found", HttpStatus.NOT_FOUND),
    NOTIFICATION_TEMPLATE_NOT_FOUND(4061, "Notification template not found", HttpStatus.NOT_FOUND),

    // Group not found
    GROUP_NOT_FOUND(4070, "Device group not found", HttpStatus.NOT_FOUND),

    // Other entities not found
    ROLE_NOT_FOUND(4080, "Role not found", HttpStatus.NOT_FOUND),
    PERMISSION_NOT_FOUND(4081, "Permission not found", HttpStatus.NOT_FOUND),
    SETTING_NOT_FOUND(4082, "Setting not found", HttpStatus.NOT_FOUND),
    LOG_NOT_FOUND(4083, "Log entry not found", HttpStatus.NOT_FOUND),

    // 5xxx - Conflict/Business Logic Errors
    CONFLICT(5000, "Resource conflict", HttpStatus.CONFLICT),

    // User conflicts
    USER_ALREADY_EXISTS(5001, "User already exists with this email", HttpStatus.CONFLICT),
    USERNAME_ALREADY_TAKEN(5002, "Username is already taken", HttpStatus.CONFLICT),
    PHONE_NUMBER_ALREADY_USED(5003, "Phone number is already registered", HttpStatus.CONFLICT),
    USER_CANNOT_DELETE_SELF(5004, "Cannot delete your own account", HttpStatus.CONFLICT),
    USER_HAS_ACTIVE_DEVICES(5005, "Cannot delete user with active devices", HttpStatus.CONFLICT),

    // Device conflicts
    DEVICE_ALREADY_EXISTS(5010, "Device already registered", HttpStatus.CONFLICT),
    DUPLICATE_DEVICE_NAME(5011, "Device name already exists in this home", HttpStatus.CONFLICT),
    DEVICE_ALREADY_PAIRED(5012, "Device is already paired with another account", HttpStatus.CONFLICT),
    DEVICE_MAC_ADDRESS_EXISTS(5013, "Device with this MAC address already exists", HttpStatus.CONFLICT),
    DEVICE_SERIAL_EXISTS(5014, "Device with this serial number already exists", HttpStatus.CONFLICT),
    DEVICE_IN_USE(5015, "Device is currently in use and cannot be deleted", HttpStatus.CONFLICT),
    DEVICE_IN_SCENE(5016, "Device is part of active scenes", HttpStatus.CONFLICT),
    DEVICE_IN_AUTOMATION(5017, "Device is used in automation rules", HttpStatus.CONFLICT),

    // Home conflicts
    HOME_NAME_EXISTS(5020, "Home with this name already exists", HttpStatus.CONFLICT),
    HOME_HAS_DEVICES(5021, "Cannot delete home with active devices", HttpStatus.CONFLICT),
    HOME_HAS_MEMBERS(5022, "Cannot delete home with other members", HttpStatus.CONFLICT),
    USER_NOT_HOME_MEMBER(5023, "User is not a member of this home", HttpStatus.CONFLICT),
    USER_ALREADY_HOME_MEMBER(5024, "User is already a member of this home", HttpStatus.CONFLICT),
    CANNOT_LEAVE_OWNED_HOME(5025, "Cannot leave home you own", HttpStatus.CONFLICT),
    HOME_DELETED(5026, "Home has been deleted", HttpStatus.CONFLICT),

    // Room conflicts
    ROOM_NAME_EXISTS(5030, "Room name already exists in this home", HttpStatus.CONFLICT),
    ROOM_HAS_DEVICES(5031, "Cannot delete room with devices", HttpStatus.CONFLICT),
    DEFAULT_ROOM_CANNOT_DELETE(5032, "Cannot delete default room", HttpStatus.CONFLICT),

    // Scene conflicts
    SCENE_NAME_EXISTS(5040, "Scene name already exists", HttpStatus.CONFLICT),
    SCENE_IS_RUNNING(5041, "Cannot modify scene while it's running", HttpStatus.CONFLICT),
    SCENE_HAS_NO_ACTIONS(5042, "Scene must have at least one action", HttpStatus.CONFLICT),

    // Automation conflicts
    AUTOMATION_NAME_EXISTS(5050, "Automation rule with this name already exists", HttpStatus.CONFLICT),
    AUTOMATION_IS_ACTIVE(5051, "Cannot delete active automation rule", HttpStatus.CONFLICT),
    INVALID_AUTOMATION_CONDITION(5052, "Invalid automation condition", HttpStatus.CONFLICT),
    CIRCULAR_AUTOMATION_DEPENDENCY(5053, "Circular dependency detected in automation rules", HttpStatus.CONFLICT),

    // Schedule conflicts
    SCHEDULE_TIME_CONFLICT(5060, "Schedule conflicts with existing schedule", HttpStatus.CONFLICT),
    SCHEDULE_IS_ACTIVE(5061, "Cannot modify active schedule", HttpStatus.CONFLICT),

    // Group conflicts
    GROUP_NAME_EXISTS(5070, "Device group with this name already exists", HttpStatus.CONFLICT),
    GROUP_HAS_DEVICES(5071, "Cannot delete group with devices", HttpStatus.CONFLICT),
    DEVICE_ALREADY_IN_GROUP(5072, "Device is already in this group", HttpStatus.CONFLICT),
    PERMISSION_ALREADY_EXISTS(5090, "Permission already exists", HttpStatus.CONFLICT),
    ROLE_ALREADY_EXISTS(5091, "Role already exists", HttpStatus.CONFLICT),

    // 6xxx - Device/Hardware Errors
    DEVICE_ERROR(6000, "Device error occurred", HttpStatus.INTERNAL_SERVER_ERROR),
    DEVICE_OFFLINE(6001, "Device is currently offline", HttpStatus.SERVICE_UNAVAILABLE),
    DEVICE_NOT_RESPONDING(6002, "Device is not responding", HttpStatus.REQUEST_TIMEOUT),
    DEVICE_COMMUNICATION_ERROR(6003, "Failed to communicate with device", HttpStatus.BAD_GATEWAY),
    DEVICE_PAIRING_FAILED(6004, "Device pairing failed", HttpStatus.UNPROCESSABLE_ENTITY),
    DEVICE_FIRMWARE_UPDATE_FAILED(6005, "Firmware update failed", HttpStatus.INTERNAL_SERVER_ERROR),
    DEVICE_UNSUPPORTED_OPERATION(6006, "Operation not supported by this device", HttpStatus.NOT_IMPLEMENTED),
    DEVICE_MALFUNCTION(6007, "Device malfunction detected", HttpStatus.INTERNAL_SERVER_ERROR),
    DEVICE_BATTERY_LOW(6008, "Device battery is critically low", HttpStatus.UNPROCESSABLE_ENTITY),

    // 7xxx - External Service Errors
    EXTERNAL_SERVICE_ERROR(7000, "External service error", HttpStatus.BAD_GATEWAY),
    MQTT_CONNECTION_ERROR(7001, "MQTT broker connection failed", HttpStatus.SERVICE_UNAVAILABLE),
    MQTT_PUBLISH_ERROR(7002, "Failed to publish message to MQTT", HttpStatus.INTERNAL_SERVER_ERROR),
    EMAIL_SERVICE_ERROR(7003, "Email service unavailable", HttpStatus.SERVICE_UNAVAILABLE),
    SMS_SERVICE_ERROR(7004, "SMS service unavailable", HttpStatus.SERVICE_UNAVAILABLE),
    WEATHER_API_ERROR(7005, "Weather service unavailable", HttpStatus.BAD_GATEWAY),
    CLOUD_STORAGE_ERROR(7006, "Cloud storage service error", HttpStatus.BAD_GATEWAY),
    THIRD_PARTY_API_ERROR(7007, "Third-party API error", HttpStatus.BAD_GATEWAY),

    // 8xxx - Rate Limiting & Quota Errors
    RATE_LIMIT_EXCEEDED(8000, "Rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS),
    TOO_MANY_REQUESTS(8001, "Too many requests, please try again later", HttpStatus.TOO_MANY_REQUESTS),
    DEVICE_LIMIT_REACHED(8002, "Maximum number of devices reached", HttpStatus.UNPROCESSABLE_ENTITY),
    SCENE_LIMIT_REACHED(8003, "Maximum number of scenes reached", HttpStatus.UNPROCESSABLE_ENTITY),
    AUTOMATION_LIMIT_REACHED(8004, "Maximum number of automation rules reached", HttpStatus.UNPROCESSABLE_ENTITY),
    STORAGE_QUOTA_EXCEEDED(8005, "Storage quota exceeded", HttpStatus.INSUFFICIENT_STORAGE),
    API_QUOTA_EXCEEDED(8006, "API quota exceeded", HttpStatus.TOO_MANY_REQUESTS),

    // 9xxx - Server/System Errors
    INTERNAL_ERROR(9000, "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR),
    DATABASE_ERROR(9001, "Database error occurred", HttpStatus.INTERNAL_SERVER_ERROR),
    DATABASE_CONNECTION_ERROR(9002, "Failed to connect to database", HttpStatus.SERVICE_UNAVAILABLE),
    SERVICE_UNAVAILABLE(9003, "Service temporarily unavailable", HttpStatus.SERVICE_UNAVAILABLE),
    MAINTENANCE_MODE(9004, "System is under maintenance", HttpStatus.SERVICE_UNAVAILABLE),
    CONFIGURATION_ERROR(9005, "System configuration error", HttpStatus.INTERNAL_SERVER_ERROR),
    TIMEOUT_ERROR(9006, "Operation timeout", HttpStatus.REQUEST_TIMEOUT),
    NETWORK_ERROR(9007, "Network error occurred", HttpStatus.BAD_GATEWAY),
    FILE_UPLOAD_ERROR(9008, "File upload failed", HttpStatus.INTERNAL_SERVER_ERROR),
    FILE_SIZE_EXCEEDED(9009, "File size exceeds maximum limit", HttpStatus.PAYLOAD_TOO_LARGE),
    UNSUPPORTED_FILE_TYPE(9010, "Unsupported file type", HttpStatus.UNSUPPORTED_MEDIA_TYPE),
    ENCRYPTION_ERROR(9011, "Data encryption/decryption failed", HttpStatus.INTERNAL_SERVER_ERROR),
    CACHE_ERROR(9012, "Cache service error", HttpStatus.INTERNAL_SERVER_ERROR),
    CLASS_CAST_ERROR(9013, "Type conversion error", HttpStatus.INTERNAL_SERVER_ERROR);

    ErrorCode(int code, String message, HttpStatus status) {
        this.code = code;
        this.message = message;
        this.status = status;
    }

    private final int code;
    private final String message;
    private final HttpStatus status;
}