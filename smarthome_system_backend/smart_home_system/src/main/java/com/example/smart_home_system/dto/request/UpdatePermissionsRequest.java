package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.HomePermission;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePermissionsRequest {

    @NotNull(message = "Permissions cannot be null")
    private Set<HomePermission> permissions;
}