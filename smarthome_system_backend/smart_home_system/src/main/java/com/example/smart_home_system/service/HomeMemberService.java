package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.AddMemberRequest;
import com.example.smart_home_system.dto.request.UpdateRoleRequest;
import com.example.smart_home_system.dto.response.HomeMemberResponse;

import java.util.List;

public interface HomeMemberService {
    HomeMemberResponse addMember(Long homeId, AddMemberRequest request);
    void removeMember(Long homeId, String targetUserId);
    HomeMemberResponse updateMemberRole(Long homeId, String targetUserId, UpdateRoleRequest request);
    List<HomeMemberResponse> getHomeMembers(Long homeId);
    void leaveHome(Long homeId);
    void transferOwnership(Long homeId, String newOwnerId);
    boolean isMember(Long homeId, String userId);
}