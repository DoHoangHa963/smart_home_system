package com.example.smart_home_system.dto.response;

import com.example.smart_home_system.mapper.PermissionMapper;

import java.util.Set;

public class RoleResponse {
    String name;
    String description;
    Set<PermissionResponse> permissions;
}
