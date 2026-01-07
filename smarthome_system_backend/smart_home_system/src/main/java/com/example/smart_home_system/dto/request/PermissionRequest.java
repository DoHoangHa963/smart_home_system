package com.example.smart_home_system.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PermissionRequest {

    @NotNull(message = "Permission name must not be blank")
    private String name;

    private String description;
}
