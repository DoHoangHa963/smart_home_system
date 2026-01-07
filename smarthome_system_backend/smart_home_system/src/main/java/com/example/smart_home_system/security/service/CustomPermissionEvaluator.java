package com.example.smart_home_system.security.service;

import com.example.smart_home_system.enums.HomePermission;
import com.example.smart_home_system.service.implement.HomePermissionServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;

@Component
@RequiredArgsConstructor
public class CustomPermissionEvaluator implements PermissionEvaluator {

    private final HomePermissionServiceImpl homePermissionService;

    @Override
    public boolean hasPermission(Authentication authentication,
                                 Object targetDomainObject,
                                 Object permission) {
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
        if (targetId instanceof Long homeId) {
            return homePermissionService.hasPermission(homeId, HomePermission.valueOf(permission.toString()));
        }
        return false;
    }
}