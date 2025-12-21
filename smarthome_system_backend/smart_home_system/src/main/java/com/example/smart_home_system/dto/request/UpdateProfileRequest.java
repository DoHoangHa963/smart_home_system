package com.example.smart_home_system.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @Email(message = "Email should be valid")
    private String email;

    @Pattern(regexp = "^[0-9]{10,15}$", message = "Phone number should be valid")
    private String phone;

    private String avatarUrl;
}