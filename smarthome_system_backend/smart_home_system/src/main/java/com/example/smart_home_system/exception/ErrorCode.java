package com.example.smart_home_system.exception;

import com.nimbusds.oauth2.sdk.http.HTTPEndpoint;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    BAD_REQUEST(1000, "Bad request", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED(1001, "Validation failed", HttpStatus.BAD_REQUEST),

    UNAUTHORIZED(2000, "Unauthorized", HttpStatus.UNAUTHORIZED),
    INVALID_TOKEN(2001, "Invalid token", HttpStatus.UNAUTHORIZED),

    FORBIDDEN(3000, "Forbidden", HttpStatus.FORBIDDEN),

    NOT_FOUND(4000, "Not found", HttpStatus.NOT_FOUND),
    USER_NOT_FOUND(4001, "User not found", HttpStatus.NOT_FOUND),
    DEVICE_NOT_FOUND(4002, "Device not found", HttpStatus.NOT_FOUND),

    CONFLICT(5000, "Conflict", HttpStatus.CONFLICT),

    INTERNAL_ERROR(9000, "Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.status = httpStatus;
    };

    private int code;
    private String message;
    private HttpStatus status;
}
