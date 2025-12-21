package com.example.smart_home_system.exception;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@Getter
@Setter
public class UnauthorizedException extends RuntimeException {
    private ErrorCode errorCode;
}