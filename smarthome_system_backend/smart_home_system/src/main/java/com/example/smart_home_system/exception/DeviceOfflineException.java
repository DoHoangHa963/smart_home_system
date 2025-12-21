package com.example.smart_home_system.exception;

import org.apache.coyote.BadRequestException;

public class DeviceOfflineException extends BadRequestException {
    public DeviceOfflineException(String deviceCode) {
        super("Device " + deviceCode + " is offline and cannot receive commands");
    }
}