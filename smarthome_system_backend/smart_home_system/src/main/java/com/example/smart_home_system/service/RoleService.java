package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.RoleRequest;
import com.example.smart_home_system.dto.response.RoleResponse;

import java.util.List;
import java.util.Set;

/**
 * Service interface for managing system-level Role entities.
 * 
 * <p>This service provides role management operations including:
 * <ul>
 *   <li>CRUD operations for system roles</li>
 *   <li>Role-permission association management</li>
 *   <li>Role lookup and validation</li>
 * </ul>
 * 
 * <p><b>Default System Roles:</b>
 * <ul>
 *   <li><b>USER</b> - Standard user role with basic permissions</li>
 *   <li><b>ADMIN</b> - System administrator with full access</li>
 * </ul>
 * 
 * <p><b>Role vs Home Role:</b>
 * System roles (managed by this service) are different from home-level roles:
 * <ul>
 *   <li><b>System Roles:</b> USER, ADMIN - apply across the entire system</li>
 *   <li><b>Home Roles:</b> OWNER, ADMIN, MEMBER, GUEST - apply within a specific home</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see RoleServiceImpl
 * @see PermissionService
 */
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