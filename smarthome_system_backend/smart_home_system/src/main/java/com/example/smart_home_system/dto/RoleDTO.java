package com.example.smart_home_system.dto;

import com.example.smart_home_system.enums.RoleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleDTO {
    private Long id;
    private RoleType name;
    private String description;
    private Set<PermissionDTO> permissions;
}