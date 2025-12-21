package com.example.smart_home_system.exception;

public class DeviceNotFoundException extends GlobalExceptionHandler.ResourceNotFoundException {
    public DeviceNotFoundException(Long deviceId) {
        super("Device not found with id: " + deviceId);
    }

    public DeviceNotFoundException(String deviceCode) {
        super("Device not found with code: " + deviceCode);
    }
}