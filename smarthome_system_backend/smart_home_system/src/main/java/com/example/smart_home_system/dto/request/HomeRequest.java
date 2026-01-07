package com.example.smart_home_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HomeRequest {
    @NotBlank(message = "Home name is required")
    String name;

    String address;
    String timeZone;
}