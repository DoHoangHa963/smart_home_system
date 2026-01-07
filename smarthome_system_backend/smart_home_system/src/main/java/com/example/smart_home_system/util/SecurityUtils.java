package com.example.smart_home_system.util;

import com.example.smart_home_system.dto.CustomUserDetails;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.exception.UnauthorizedException;
import lombok.experimental.UtilityClass;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@UtilityClass
public class SecurityUtils {

    public static CustomUserDetails getCurrentUserPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() ||
                "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails) {
            return (CustomUserDetails) principal;
        }

        throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }

    public static String getCurrentUserId() {
        return getCurrentUserPrincipal().getId();
    }

    public static String getCurrentUsername() {
        return getCurrentUserPrincipal().getUsername();
    }
}