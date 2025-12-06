package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.UserStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserUpdateRequest {
    String password;
    String email;
    String phone;
    String avatarUrl;
    UserStatus userStatus;
    Set<String> roles;
}
