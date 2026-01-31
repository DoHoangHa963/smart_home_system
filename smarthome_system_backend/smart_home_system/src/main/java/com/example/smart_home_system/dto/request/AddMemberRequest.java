package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.HomeMemberRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddMemberRequest {
    @NotBlank(message = "Vui lòng nhập Username hoặc Email")
    String identifier;

    @NotNull(message = "Role không được để trống")
    HomeMemberRole role = HomeMemberRole.MEMBER;
}