package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.UserDevicePermissionCreateRequest;
import com.example.smart_home_system.dto.request.UserDevicePermissionUpdateRequest;
import com.example.smart_home_system.dto.response.UserDevicePermissionResponse;

import java.util.List;

/**
 * Service interface for managing device-level permissions for individual users.
 * 
 * <p>This service provides granular device access control including:
 * <ul>
 *   <li>Assigning specific device permissions to users</li>
 *   <li>Updating existing device permissions</li>
 *   <li>Revoking device access</li>
 *   <li>Querying permissions by user or device</li>
 * </ul>
 * 
 * <p><b>Use Cases:</b>
 * <ul>
 *   <li>Allow a guest to control only specific devices</li>
 *   <li>Restrict a child's access to certain devices</li>
 *   <li>Temporary access grants for service personnel</li>
 * </ul>
 * 
 * <p><b>Permission Types:</b>
 * <ul>
 *   <li><b>VIEW</b> - Can see device status</li>
 *   <li><b>CONTROL</b> - Can send commands to device</li>
 *   <li><b>CONFIGURE</b> - Can modify device settings</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see UserDevicePermissionServiceImpl
 * @see DeviceService
 */
public interface UserDevicePermissionService {

    UserDevicePermissionResponse assignPermission(UserDevicePermissionCreateRequest request);

    UserDevicePermissionResponse updatePermission(Long permissionId, UserDevicePermissionUpdateRequest request);

    void revokePermission(Long permissionId);

    List<UserDevicePermissionResponse> getPermissionsByUserId(String userId);

    List<UserDevicePermissionResponse> getPermissionsByDeviceId(Long deviceId);

    UserDevicePermissionResponse getPermissionById(Long id);
}