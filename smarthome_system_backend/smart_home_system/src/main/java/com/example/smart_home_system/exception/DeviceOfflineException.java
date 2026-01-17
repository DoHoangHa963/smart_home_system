package com.example.smart_home_system.exception;

public class DeviceOfflineException extends RuntimeException {
    public DeviceOfflineException(String message) {
        super(message);
    }

    public DeviceOfflineException(String message, Throwable cause) {
        super(message, cause);
    }
}