package com.example.smart_home_system.service;

import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.enums.HomePermission;

import java.util.Set;

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