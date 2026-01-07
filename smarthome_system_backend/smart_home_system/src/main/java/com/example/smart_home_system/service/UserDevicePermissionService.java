package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.UserDevicePermissionCreateRequest;
import com.example.smart_home_system.dto.request.UserDevicePermissionUpdateRequest;
import com.example.smart_home_system.dto.response.UserDevicePermissionResponse;

import java.util.List;

public interface UserDevicePermissionService {

    UserDevicePermissionResponse assignPermission(UserDevicePermissionCreateRequest request);

    UserDevicePermissionResponse updatePermission(Long permissionId, UserDevicePermissionUpdateRequest request);

    void revokePermission(Long permissionId);

    List<UserDevicePermissionResponse> getPermissionsByUserId(String userId);

    List<UserDevicePermissionResponse> getPermissionsByDeviceId(Long deviceId);

    UserDevicePermissionResponse getPermissionById(Long id);
}