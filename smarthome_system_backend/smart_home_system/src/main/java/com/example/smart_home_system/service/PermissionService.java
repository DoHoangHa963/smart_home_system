package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.PermissionRequest;
import com.example.smart_home_system.dto.response.PermissionResponse;

import java.util.List;
import java.util.Set;

/**
 * Service interface for managing system-level Permission entities.
 * 
 * <p>This service provides permission management operations including:
 * <ul>
 *   <li>CRUD operations for system permissions</li>
 *   <li>Permission lookup and validation</li>
 *   <li>Permission assignment to roles</li>
 * </ul>
 * 
 * <p><b>Permission Naming Convention:</b>
 * Permissions follow the pattern: {@code RESOURCE_ACTION}
 * <ul>
 *   <li>USER_CREATE, USER_READ, USER_UPDATE, USER_DELETE</li>
 *   <li>HOME_CREATE, HOME_READ, HOME_UPDATE, HOME_DELETE</li>
 *   <li>DEVICE_CONTROL, DEVICE_CONFIGURE</li>
 * </ul>
 * 
 * <p><b>Permission Types:</b>
 * <ul>
 *   <li><b>System Permissions:</b> Managed by this service, assigned to roles</li>
 *   <li><b>Home Permissions:</b> Managed by HomePermissionService, home-specific</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see PermissionServiceImpl
 * @see RoleService
 */
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