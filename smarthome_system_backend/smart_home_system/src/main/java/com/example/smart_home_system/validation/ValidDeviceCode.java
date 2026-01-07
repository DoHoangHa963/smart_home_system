package com.example.smart_home_system.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = DeviceCodeValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidDeviceCode {
    String message() default "Invalid device code format. Must be alphanumeric with underscores";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
