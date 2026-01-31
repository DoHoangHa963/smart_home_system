package com.example.smart_home_system.service;

import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.enums.HomePermission;

import java.util.Set;

/**
 * Service interface for managing home-level permissions and role-based access control.
 * 
 * <p>This service provides fine-grained permission management within homes including:
 * <ul>
 *   <li>Permission verification for home operations</li>
 *   <li>Role-based access checks</li>
 *   <li>Custom permission assignment to individual members</li>
 *   <li>Permission aggregation (role + custom permissions)</li>
 * </ul>
 * 
 * <p><b>Permission Categories:</b>
 * <ul>
 *   <li><b>HOME_*</b> - Home management (VIEW, UPDATE, DELETE)</li>
 *   <li><b>ROOM_*</b> - Room management (VIEW, CREATE, UPDATE, DELETE)</li>
 *   <li><b>DEVICE_*</b> - Device control (VIEW, CREATE, UPDATE, DELETE, CONTROL)</li>
 *   <li><b>MEMBER_*</b> - Member management (VIEW, INVITE, UPDATE, REMOVE)</li>
 * </ul>
 * 
 * <p><b>Permission Resolution:</b>
 * <ol>
 *   <li>Check if user has OWNER role (all permissions)</li>
 *   <li>Check role-based default permissions</li>
 *   <li>Check custom permissions assigned to member</li>
 *   <li>Combine all permissions for final access decision</li>
 * </ol>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see HomePermissionServiceImpl
 * @see HomeMemberService
 */
public interface HomePermissionService {

    boolean hasPermission(Long homeId, HomePermission permission);

    boolean hasRole(Long homeId, HomeMemberRole requiredRole);

    boolean isOwner(Long homeId);

    boolean isAdminOrHigher(Long homeId);

    void updateMemberPermissions(Long homeId, String memberId, Set<HomePermission> permissions);

    Set<String> getUserPermissions(Long homeId);

    // Thêm method mới
    Set<String> getMemberPermissions(Long homeId, String memberId);
}