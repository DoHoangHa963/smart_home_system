package com.example.smart_home_system.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class DeviceCodeValidator implements ConstraintValidator<ValidDeviceCode, String> {
    private static final String DEVICE_CODE_PATTERN = "^[A-Za-z0-9_]+$";

    @Override
    public void initialize(ValidDeviceCode constraintAnnotation) {
        ConstraintValidator.super.initialize(constraintAnnotation);
    }

    @Override
    public boolean isValid(String deviceCode, ConstraintValidatorContext context) {
        if (deviceCode == null || deviceCode.trim().isEmpty()) {
            return false;
        }
        return deviceCode.matches(DEVICE_CODE_PATTERN);
    }
}
