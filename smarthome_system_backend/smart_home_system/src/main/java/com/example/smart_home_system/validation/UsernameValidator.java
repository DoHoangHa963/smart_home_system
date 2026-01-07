package com.example.smart_home_system.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class UsernameValidator implements ConstraintValidator<ValidUsername, String> {

    // Username pattern:
    // - Bắt đầu bằng chữ cái
    // - Chỉ chứa chữ cái, số và gạch dưới
    // - Độ dài 3-50 ký tự
    // - Không có khoảng trắng
    // - Không kết thúc bằng gạch dưới
    private static final Pattern USERNAME_PATTERN =
            Pattern.compile("^[a-zA-Z][a-zA-Z0-9_]{1,48}[a-zA-Z0-9]$");

    // Danh sách các username không được phép (từ khóa hệ thống)
    private static final String[] FORBIDDEN_USERNAMES = {
            "admin", "administrator", "system", "root", "user", "test",
            "null", "undefined", "guest", "anonymous", "support",
            "moderator", "owner", "superuser", "api", "server"
    };

    @Override
    public void initialize(ValidUsername constraintAnnotation) {
    }

    @Override
    public boolean isValid(String username, ConstraintValidatorContext context) {
        if (username == null || username.trim().isEmpty()) {
            return false;
        }

        // Kiểm tra độ dài cơ bản
        if (username.length() < 3 || username.length() > 50) {
            return false;
        }

        // Kiểm tra pattern
        if (!USERNAME_PATTERN.matcher(username).matches()) {
            return false;
        }

        // Kiểm tra không chứa khoảng trắng
        if (username.contains(" ")) {
            return false;
        }

        // Kiểm tra không phải từ khóa bị cấm
        String lowercaseUsername = username.toLowerCase();
        for (String forbidden : FORBIDDEN_USERNAMES) {
            if (lowercaseUsername.equals(forbidden)) {
                return false;
            }
        }

        // Kiểm tra thêm: không được có 2 gạch dưới liên tiếp
        if (username.contains("__")) {
            return false;
        }

        // Kiểm tra: không được chỉ toàn số
        if (username.matches("^[0-9_]+$")) {
            return false;
        }

        return true;
    }

    // Phương thức tiện ích để validate username trong code
    public static boolean validate(String username) {
        UsernameValidator validator = new UsernameValidator();
        return validator.isValid(username, null);
    }

    // Phương thức để lấy thông báo lỗi chi tiết
    public static String getValidationMessage(String username) {
        if (username == null || username.trim().isEmpty()) {
            return "Username không được để trống";
        }

        if (username.length() < 3) {
            return "Username phải có ít nhất 3 ký tự";
        }

        if (username.length() > 50) {
            return "Username không được vượt quá 50 ký tự";
        }

        if (username.contains(" ")) {
            return "Username không được chứa khoảng trắng";
        }

        if (!username.matches("^[a-zA-Z].*")) {
            return "Username phải bắt đầu bằng chữ cái";
        }

        if (!username.matches("^[a-zA-Z0-9_]+$")) {
            return "Username chỉ được chứa chữ cái, số và gạch dưới (_)";
        }

        if (username.endsWith("_")) {
            return "Username không được kết thúc bằng gạch dưới";
        }

        if (username.contains("__")) {
            return "Username không được có 2 gạch dưới liên tiếp";
        }

        if (username.matches("^[0-9_]+$")) {
            return "Username không được chỉ toàn số và gạch dưới";
        }

        // Kiểm tra từ khóa bị cấm
        String lowercaseUsername = username.toLowerCase();
        for (String forbidden : FORBIDDEN_USERNAMES) {
            if (lowercaseUsername.equals(forbidden)) {
                return "Username này không được phép sử dụng";
            }
        }

        return null; // Không có lỗi
    }
}