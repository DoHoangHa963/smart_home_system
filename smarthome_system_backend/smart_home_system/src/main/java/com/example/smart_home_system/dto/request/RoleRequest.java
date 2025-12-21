package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.RoleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleRequest {

    @NotNull(message = "Role type is required")
    private String name;

    private String description;

    @NotNull(message = "Role must have at least one permission")
    private Set<Long> permissionsIds;

}
