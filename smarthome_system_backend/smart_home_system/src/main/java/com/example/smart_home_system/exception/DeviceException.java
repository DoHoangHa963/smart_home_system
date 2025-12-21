package com.example.smart_home_system.exception;

public class DeviceException extends AppException {

    public DeviceException(ErrorCode errorCode) {
        super(errorCode);
    }
}