package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.AddMemberRequest;
import com.example.smart_home_system.dto.request.UpdateRoleRequest;
import com.example.smart_home_system.dto.response.HomeMemberResponse;

import java.util.List;

/**
 * Service interface for managing Home membership and member roles.
 * 
 * <p>This service handles all member-related operations within a home including:
 * <ul>
 *   <li>Adding new members to a home</li>
 *   <li>Removing members from a home</li>
 *   <li>Updating member roles and permissions</li>
 *   <li>Ownership transfer between members</li>
 * </ul>
 * 
 * <p><b>Role Hierarchy:</b>
 * <ol>
 *   <li><b>OWNER</b> - Full control, can delete home, transfer ownership</li>
 *   <li><b>ADMIN</b> - Can manage members and devices, cannot delete home</li>
 *   <li><b>MEMBER</b> - Can view and control devices based on permissions</li>
 *   <li><b>GUEST</b> - Limited view access to specific devices</li>
 * </ol>
 * 
 * <p><b>Business Rules:</b>
 * <ul>
 *   <li>Each home must have exactly one OWNER</li>
 *   <li>OWNER cannot leave without transferring ownership first</li>
 *   <li>Only OWNER and ADMIN can add/remove members</li>
 *   <li>Members cannot promote themselves to higher roles</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see HomeMemberServiceImpl
 * @see HomeService
 */
public interface HomeMemberService {
    HomeMemberResponse addMember(Long homeId, AddMemberRequest request);
    void removeMember(Long homeId, String targetUserId);
    HomeMemberResponse updateMemberRole(Long homeId, String targetUserId, UpdateRoleRequest request);
    List<HomeMemberResponse> getHomeMembers(Long homeId);
    void leaveHome(Long homeId);
    void transferOwnership(Long homeId, String newOwnerId);
    boolean isMember(Long homeId, String userId);

    HomeMemberResponse getMemberByHomeIdAndUserId(Long homeId, String currentUserId);
}