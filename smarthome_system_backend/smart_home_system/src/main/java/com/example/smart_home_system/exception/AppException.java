package com.example.smart_home_system.exception;

import lombok.*;

@EqualsAndHashCode(callSuper = true)
@AllArgsConstructor
@Getter
@Setter
public class AppException extends RuntimeException  {
    private final ErrorCode errorCode;
}
