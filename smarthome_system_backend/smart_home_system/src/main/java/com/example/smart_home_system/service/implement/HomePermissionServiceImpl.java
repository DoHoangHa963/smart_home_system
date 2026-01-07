// HomePermissionServiceImpl.java
package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.entity.HomeMember;
import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.enums.HomePermission;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.service.HomePermissionService;
import com.example.smart_home_system.util.PermissionUtils;
import com.example.smart_home_system.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.stream.Collectors;

@Service("homePermissionService")
@RequiredArgsConstructor
@Slf4j
public class HomePermissionServiceImpl implements HomePermissionService {

    private final HomeMemberRepository homeMemberRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean hasPermission(Long homeId, HomePermission permission) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                .orElse(null);

        if (member == null) {
            return false;
        }

        return member.hasPermission(permission.name());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasRole(Long homeId, HomeMemberRole requiredRole) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                .orElse(null);

        if (member == null) {
            return false;
        }

        return PermissionUtils.hasHigherOrEqualRole(member.getRole(), requiredRole);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isOwner(Long homeId) {
        return hasRole(homeId, HomeMemberRole.OWNER);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAdminOrHigher(Long homeId) {
        return hasRole(homeId, HomeMemberRole.ADMIN);
    }

    @Override
    @Transactional
    public void updateMemberPermissions(Long homeId, String memberId, Set<HomePermission> permissions) {
        // Kiểm tra người gọi API có phải là Owner không
        String currentUserId = SecurityUtils.getCurrentUserId();
        HomeMember currentUser = homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found in home"));

        if (currentUser.getRole() != HomeMemberRole.OWNER) {
            throw new RuntimeException("Only owner can update permissions");
        }

        // Tìm member cần update
        HomeMember member = homeMemberRepository.findByHomeIdAndUserId(homeId, memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        // Không cho phép update permissions của chính mình
        if (member.getId().equals(currentUser.getId())) {
            throw new RuntimeException("Cannot update your own permissions");
        }

        // Validate permissions dựa trên role
        Set<String> permissionNames = permissions.stream()
                .map(Enum::name)
                .collect(Collectors.toSet());

        if (!PermissionUtils.validatePermissionsForRole(member.getRole(), permissionNames)) {
            throw new RuntimeException("Invalid permissions for role: " + member.getRole());
        }

        // Cập nhật permissions
        member.setPermissionSet(permissionNames);
        homeMemberRepository.save(member);

        log.info("Updated permissions for member {} in home {}: {}",
                memberId, homeId, permissionNames);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> getUserPermissions(Long homeId) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        return homeMemberRepository.findByHomeIdAndUserId(homeId, currentUserId)
                .map(HomeMember::getAllPermissions)
                .orElse(Set.of());
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> getMemberPermissions(Long homeId, String memberId) {
        return homeMemberRepository.findByHomeIdAndUserId(homeId, memberId)
                .map(HomeMember::getAllPermissions)
                .orElse(Set.of());
    }
}