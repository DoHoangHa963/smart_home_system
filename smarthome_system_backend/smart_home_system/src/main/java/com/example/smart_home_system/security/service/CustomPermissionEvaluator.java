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

/**
 * Custom Spring Security {@link PermissionEvaluator} for fine-grained access control.
 * 
 * <p>This evaluator enables {@code @PreAuthorize} annotations with custom permission checks:
 * <pre>
 * {@code @PreAuthorize("hasPermission(#homeId, 'HOME', 'HOME_UPDATE')")}
 * </pre>
 * 
 * <p><b>Supported Target Types:</b>
 * <ul>
 *   <li><b>HOME</b> - Check permissions on a home by homeId</li>
 *   <li><b>DEVICE</b> - Check permissions on a device (resolves to home permission)</li>
 * </ul>
 * 
 * <p><b>Permission Resolution:</b>
 * <ol>
 *   <li>If user has ROLE_ADMIN, permission is granted immediately</li>
 *   <li>For DEVICE type, resolve device to its home and check home permission</li>
 *   <li>For HOME type, delegate to HomePermissionService</li>
 * </ol>
 * 
 * <p><b>Usage Examples:</b>
 * <pre>
 * // Check home permission
 * {@code @PreAuthorize("hasPermission(#homeId, 'HOME', 'HOME_UPDATE')")}
 * 
 * // Check device permission (resolves to home)
 * {@code @PreAuthorize("hasPermission(#deviceId, 'DEVICE', 'DEVICE_CONTROL')")}
 * </pre>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see PermissionEvaluator
 * @see HomePermissionService
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CustomPermissionEvaluator implements PermissionEvaluator {

    private final HomePermissionServiceImpl homePermissionService;
    private final DeviceRepository deviceRepository;

    /**
     * Evaluates permission on a domain object.
     * 
     * @param authentication The current authentication
     * @param targetDomainObject The target domain object (typically homeId as Long)
     * @param permission The permission to check
     * @return true if permission is granted, false otherwise
     */
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

    /**
     * Evaluates permission on a target identified by ID and type.
     * 
     * <p>This overload is used when the target is identified by an ID and type string,
     * allowing for more flexible permission checks.
     * 
     * @param authentication The current authentication
     * @param targetId The ID of the target object
     * @param targetType The type of target ("HOME" or "DEVICE")
     * @param permission The permission to check (e.g., "HOME_UPDATE", "DEVICE_CONTROL")
     * @return true if permission is granted, false otherwise
     */
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
            // Fetch device với home relationship để đảm bảo home được load
            Device device = deviceRepository.findByIdWithHome(deviceId).orElse(null);
            if (device == null) {
                log.warn("Permission check failed: Device ID {} not found", deviceId);
                return false;
            }
            
            Long homeId = device.getHomeId();
            if (homeId == null) {
                log.warn("Permission check failed: Device ID {} has no home associated", deviceId);
                return false;
            }
            
            try {
                return homePermissionService.hasPermission(homeId, HomePermission.valueOf(permission.toString()));
            } catch (IllegalArgumentException e) {
                log.error("Invalid permission: {}", permission, e);
                return false;
            }
        }

        // CASE 2: Check quyền trên HOME trực tiếp
        if ("HOME".equalsIgnoreCase(targetType) && targetId instanceof Long homeId) {
            return homePermissionService.hasPermission(homeId, HomePermission.valueOf(permission.toString()));
        }

        return false;
    }

    /**
     * Checks if the authenticated user has ADMIN role.
     * 
     * @param authentication The current authentication
     * @return true if user has ROLE_ADMIN or ADMIN authority
     */
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