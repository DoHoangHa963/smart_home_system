package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.PermissionRequest;
import com.example.smart_home_system.dto.response.PermissionResponse;

import java.util.List;
import java.util.Set;

public interface PermissionService {
    PermissionResponse createPermission(PermissionRequest request);
    PermissionResponse updatePermission(Long id, PermissionRequest request);
    PermissionResponse getPermissionById(Long id);
    PermissionResponse getPermissionByName(String name);
    List<PermissionResponse> getAllPermissions();
    void deletePermission(Long id);
    Set<PermissionResponse> getPermissionsByIds(Set<Long> ids);
    boolean existsByName(String name);
}