package com.example.smart_home_system.exception;

import com.example.smart_home_system.dto.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.Response;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Objects;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final String MIN_ATTRIBUTE = "min";

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleAppException(
            AppException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ex.getErrorCode();
        log.warn("[AppException] {} - {}", errorCode.getCode(), errorCode.getMessage());
        return buildResponse(errorCode, request.getRequestURI());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        String message = Objects.requireNonNull(ex.getBindingResult().getFieldError()).getDefaultMessage();

        log.warn("[ValidationException] {}", message);

        ErrorCode error = ErrorCode.VALIDATION_FAILED;

        return ResponseEntity
                .status(error.getStatus())
                .body(ErrorResponse.builder()
                        .code(error.getCode())
                        .message(message)
                        .timestamp(LocalDateTime.now())
                        .path(request.getRequestURI())
                        .build());
    }

    private ResponseEntity<ErrorResponse> buildResponse(ErrorCode errorCode, String path) {
        return ResponseEntity
                .status(errorCode.getStatus())
                .body(
                        ErrorResponse.builder()
                                .code(errorCode.getCode())
                                .message(errorCode.getMessage())
                                .timestamp(LocalDateTime.now())
                                .path(path)
                                .build()
                );
    }

}
