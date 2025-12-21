package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.RoleRequest;
import com.example.smart_home_system.dto.response.RoleResponse;

import java.util.List;
import java.util.Set;

public interface RoleService {

    RoleResponse createRole(RoleRequest request);
    RoleResponse updateRole(Long id, RoleRequest request);
    RoleResponse getRoleById(Long id);
    RoleResponse getRoleByName(String roleName);
    List<RoleResponse> getAllRoles();
    void deleteRole(Long id);
    Set<RoleResponse> getRolesByIds(Set<Long> ids);
    boolean existsByName(String roleName);
    List<RoleResponse> getRolesByPermissionId(Long permissionId);
}