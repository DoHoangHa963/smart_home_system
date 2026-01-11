package com.example.smart_home_system.exception;

import org.apache.coyote.BadRequestException;

public class DeviceOfflineException extends RuntimeException {
    public DeviceOfflineException(String message) {
        super(message);
    }
}