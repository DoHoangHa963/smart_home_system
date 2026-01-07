package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.HomeMemberRole;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateRoleRequest {
    @NotNull(message = "Role không được để trống")
    HomeMemberRole newRole;
}