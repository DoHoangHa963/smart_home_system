package com.example.smart_home_system.security.service;

import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.enums.HomePermission;
import com.example.smart_home_system.repository.DeviceRepository; // Cần import repository này
import com.example.smart_home_system.service.implement.HomePermissionServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;

@Slf4j
@Component
@RequiredArgsConstructor
public class CustomPermissionEvaluator implements PermissionEvaluator {

    private final HomePermissionServiceImpl homePermissionService;
    private final DeviceRepository deviceRepository;

    @Override
    public boolean hasPermission(Authentication authentication,
                                 Object targetDomainObject,
                                 Object permission) {

        // CHECK 1: Admin luôn có quyền
        if (isAdmin(authentication)) {
            log.debug("Admin user {} bypassing permission check", authentication.getName());
            return true;
        }

        if (targetDomainObject instanceof Long homeId) {
            return homePermissionService.hasPermission(homeId, HomePermission.valueOf(permission.toString()));
        }
        return false;
    }

    @Override
    public boolean hasPermission(Authentication authentication,
                                 Serializable targetId,
                                 String targetType,
                                 Object permission) {

        // CHECK 1: Admin luôn có quyền
        if (isAdmin(authentication)) {
            log.debug("Admin user {} bypassing permission check for {}:{}",
                    authentication.getName(), targetType, targetId);
            return true;
        }

        if (targetId == null || targetType == null) return false;

        // CASE 1: Check quyền trên DEVICE
        if ("DEVICE".equalsIgnoreCase(targetType) && targetId instanceof Long deviceId) {
            Device device = deviceRepository.findById(deviceId).orElse(null);
            if (device == null) {
                log.warn("Permission check failed: Device ID {} not found", deviceId);
                return false;
            }
            return homePermissionService.hasPermission(device.getHomeId(), HomePermission.valueOf(permission.toString()));
        }

        // CASE 2: Check quyền trên HOME trực tiếp
        if ("HOME".equalsIgnoreCase(targetType) && targetId instanceof Long homeId) {
            return homePermissionService.hasPermission(homeId, HomePermission.valueOf(permission.toString()));
        }

        return false;
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null) {
            return false;
        }

        return authentication.getAuthorities().stream()
                .anyMatch(authority ->
                        authority.getAuthority().equals("ROLE_ADMIN") ||
                                authority.getAuthority().equals("ADMIN")
                );
    }
}