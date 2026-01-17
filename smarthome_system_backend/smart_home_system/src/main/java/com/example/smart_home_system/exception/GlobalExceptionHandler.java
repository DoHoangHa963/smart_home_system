package com.example.smart_home_system.exception;

import com.example.smart_home_system.dto.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

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
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedException(
            UnauthorizedException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ex.getErrorCode();
        log.warn("[UnauthorizedException] {} - {}", errorCode.getCode(), errorCode.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), null);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResourceException(
            DuplicateResourceException ex,
            HttpServletRequest request
    ) {
        // Sử dụng mã lỗi cụ thể cho user đã là thành viên
        ErrorCode errorCode = ErrorCode.USER_ALREADY_HOME_MEMBER; // 5024
        log.warn("[DuplicateResourceException] {} - {}", errorCode.getCode(), ex.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        List<String> errors = ex.getBindingResult().getFieldErrors()
                .stream()
                .map(fieldError -> String.format("%s: %s", fieldError.getField(), fieldError.getDefaultMessage()))
                .collect(Collectors.toList());

        String detail = String.join("; ", errors);
        ErrorCode error = ErrorCode.VALIDATION_FAILED;

        log.warn("[ValidationException] {} - {}: {}", error.getCode(), error.getMessage(), detail);

        return ResponseEntity
                .status(error.getStatus())
                .body(ErrorResponse.builder()
                        .code(error.getCode())
                        .message(error.getMessage())
                        .detail(detail)
                        .timestamp(LocalDateTime.now())
                        .path(request.getRequestURI())
                        .build());
    }

    @ExceptionHandler(ClassCastException.class)
    public ResponseEntity<ErrorResponse> handleClassCastException(
            ClassCastException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ErrorCode.CLASS_CAST_ERROR;

        log.error("[ClassCastException] {} - {} at {}",
                errorCode.getCode(),
                ex.getMessage(),
                request.getRequestURI(),
                ex);

        String detail = buildClassCastDetail(ex);

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ErrorResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .detail(detail)
                        .timestamp(LocalDateTime.now())
                        .path(request.getRequestURI())
                        .build());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ErrorCode.NOT_FOUND;
        log.warn("[ResourceNotFoundException] {} - {}", errorCode.getCode(), ex.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(
            BadRequestException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ErrorCode.BAD_REQUEST;
        log.warn("[BadRequestException] {} - {}", errorCode.getCode(), ex.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ErrorCode.MISSING_REQUIRED_FIELD;
        String detail = String.format("Required parameter '%s' is missing", ex.getParameterName());
        log.warn("[MissingServletRequestParameterException] {} - {}", errorCode.getCode(), detail);
        return buildResponse(errorCode, request.getRequestURI(), detail);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ErrorCode.FORBIDDEN;
        log.warn("[AccessDeniedException] {} - {}", errorCode.getCode(), ex.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ErrorCode.FILE_SIZE_EXCEEDED;
        log.warn("[MaxUploadSizeExceededException] {} - {}", errorCode.getCode(), ex.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ErrorCode.INTERNAL_ERROR;

        log.error("[Unhandled Exception] {} - {} at {}",
                errorCode.getCode(),
                ex.getMessage(),
                request.getRequestURI(),
                ex);

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ErrorResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .detail("An unexpected error occurred. Please try again later.")
                        .timestamp(LocalDateTime.now())
                        .path(request.getRequestURI())
                        .build());
    }

    @ExceptionHandler(DeviceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleDeviceNotFoundException(
            DeviceNotFoundException ex,
            HttpServletRequest request) {
        ErrorCode errorCode = ErrorCode.NOT_FOUND;
        log.warn("[DeviceNotFoundException] {} - {}", errorCode.getCode(), ex.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    @ExceptionHandler(DeviceOfflineException.class)
    public ResponseEntity<ErrorResponse> handleDeviceOfflineException(
            DeviceOfflineException ex,
            HttpServletRequest request) {
        ErrorCode errorCode = ErrorCode.BAD_REQUEST;
        log.warn("[DeviceOfflineException] {} - {}", errorCode.getCode(), ex.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex,
            HttpServletRequest request) {
        ErrorCode errorCode = ErrorCode.BAD_REQUEST;
        log.warn("[IllegalArgumentException] {} - {}", errorCode.getCode(), ex.getMessage());
        return buildResponse(errorCode, request.getRequestURI(), ex.getMessage());
    }

    private String buildClassCastDetail(ClassCastException ex) {
        String message = ex.getMessage();

        if (message != null) {
            String[] parts = message.split(" cannot be cast to ");
            if (parts.length == 2) {
                String fromType = extractClassName(parts[0]);
                String toType = extractClassName(parts[1]);
                return String.format("Cannot cast from '%s' to '%s'", fromType, toType);
            }
        }

        return "Type conversion failed. Check data types consistency.";
    }

    private String extractClassName(String fullClassName) {
        if (fullClassName.contains(".")) {
            return fullClassName.substring(fullClassName.lastIndexOf('.') + 1);
        }
        return fullClassName;
    }

    private ResponseEntity<ErrorResponse> buildResponse(ErrorCode errorCode, String path, String detail) {
        ErrorResponse.ErrorResponseBuilder builder = ErrorResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .timestamp(LocalDateTime.now())
                .path(path);

        if (detail != null && !detail.isEmpty()) {
            builder.detail(detail);
        }

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(builder.build());
    }
}