package com.example.smart_home_system.util;

import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.enums.HomePermission;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.stream.Collectors;

import static com.example.smart_home_system.enums.HomePermission.*;

@Slf4j
public class PermissionUtils {

    // Config FAIL_ON_UNKNOWN_PROPERTIES = false để tránh lỗi khi JSON có data thừa
    private static final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    /**
     * Lấy permissions mặc định theo role
     */
    public static Set<HomePermission> getDefaultPermissionsByRole(HomeMemberRole role) {
        if (role == null) return EnumSet.noneOf(HomePermission.class);

        switch (role) {
            case OWNER:
                return EnumSet.allOf(HomePermission.class);

            case ADMIN:
                return EnumSet.of(
                        // Home
                        HOME_DASHBOARD_VIEW, HOME_VIEW, HOME_UPDATE,
                        HOME_SETTINGS_VIEW, HOME_SETTINGS_UPDATE,
                        HOME_LOGS_VIEW,

                        // Members (Admin quản lý member nhưng không được xóa nhà hay chuyển quyền)
                        MEMBER_VIEW, MEMBER_INVITE, MEMBER_UPDATE, MEMBER_REMOVE,

                        // Resources
                        DEVICE_VIEW, DEVICE_CONTROL, DEVICE_CREATE, DEVICE_UPDATE, DEVICE_DELETE,
                        ROOM_VIEW, ROOM_CREATE, ROOM_UPDATE, ROOM_DELETE,
                        AUTOMATION_VIEW, AUTOMATION_CREATE, AUTOMATION_UPDATE, AUTOMATION_DELETE, AUTOMATION_EXECUTE,
                        SCENE_VIEW, SCENE_CREATE, SCENE_UPDATE, SCENE_DELETE, SCENE_EXECUTE
                );

            case MEMBER:
                return EnumSet.of(
                        HOME_DASHBOARD_VIEW,
                        DEVICE_VIEW, DEVICE_CONTROL,
                        ROOM_VIEW,
                        AUTOMATION_VIEW, AUTOMATION_EXECUTE,
                        SCENE_VIEW, SCENE_EXECUTE,
                        MEMBER_VIEW
                );

            case GUEST:
                return EnumSet.of(
                        HOME_DASHBOARD_VIEW,
                        DEVICE_VIEW,
                        ROOM_VIEW,
                        MEMBER_VIEW
                );

            case CUSTOM:
                return EnumSet.noneOf(HomePermission.class);

            default:
                return EnumSet.noneOf(HomePermission.class);
        }
    }

    /**
     * Parse permissions từ JSON string
     */
    public static Set<String> parsePermissionsFromJson(String permissionsJson) {
        if (permissionsJson == null || permissionsJson.trim().isEmpty()) {
            return new HashSet<>();
        }
        try {
            return objectMapper.readValue(permissionsJson, new TypeReference<Set<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse permissions JSON: {}", permissionsJson, e);
            return new HashSet<>();
        }
    }

    /**
     * Convert Set<String> thành JSON string
     */
    public static String toPermissionsJson(Set<String> permissionNames) {
        if (permissionNames == null || permissionNames.isEmpty()) {
            return "[]"; // Trả về mảng rỗng thay vì null để tránh NullPointerException
        }
        try {
            return objectMapper.writeValueAsString(permissionNames);
        } catch (Exception e) {
            log.warn("Failed to convert permissions to JSON", e);
            return "[]";
        }
    }

    /**
     * Convert Set<HomePermission> thành JSON string
     */
    public static String toPermissionsJsonFromEnum(Set<HomePermission> permissions) {
        if (permissions == null || permissions.isEmpty()) {
            return "[]";
        }
        Set<String> names = permissions.stream().map(Enum::name).collect(Collectors.toSet());
        return toPermissionsJson(names);
    }

    /**
     * Merge permissions: default role permissions + custom permissions (CỘNG DỒN)
     */
    public static Set<String> mergePermissions(HomeMemberRole role, String customPermissionsJson) {
        Set<String> allPermissions = new HashSet<>();

        // 1. Thêm permissions mặc định của role
        Set<HomePermission> defaultPermissions = getDefaultPermissionsByRole(role);
        if (defaultPermissions != null) {
            allPermissions.addAll(defaultPermissions.stream()
                    .map(Enum::name)
                    .collect(Collectors.toSet()));
        }

        // 2. Thêm custom permissions từ JSON (Quyền bổ sung)
        Set<String> customPermissions = parsePermissionsFromJson(customPermissionsJson);
        allPermissions.addAll(customPermissions);

        return allPermissions;
    }

    /**
     * Validate permissions cho một role (CHIẾN LƯỢC LINH HOẠT)
     * Chỉ kiểm tra tính hợp lệ của enum, KHÔNG bắt buộc phải là tập con của Role.
     */
    public static boolean validatePermissionsForRole(HomeMemberRole role, Set<String> permissions) {
        if (permissions == null || permissions.isEmpty()) {
            // Nếu là CUSTOM thì nên có ít nhất 1 quyền (tùy business), còn role khác rỗng thì ok (lấy default)
            return true;
        }

        // Kiểm tra xem tất cả các string trong Set có phải là HomePermission hợp lệ không
        for (String perm : permissions) {
            try {
                HomePermission.valueOf(perm);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid permission detected: {}", perm);
                return false; // Phát hiện quyền rác/sai chính tả
            }
        }

        // Đã bỏ đoạn check `containsAll` để cho phép cấp quyền mở rộng
        return true;
    }

    /**
     * Kiểm tra role hierarchy (OWNER > ADMIN > MEMBER > GUEST)
     */
    public static boolean hasHigherOrEqualRole(HomeMemberRole userRole, HomeMemberRole requiredRole) {
        Map<HomeMemberRole, Integer> hierarchy = new EnumMap<>(HomeMemberRole.class);
        hierarchy.put(HomeMemberRole.OWNER, 4);
        hierarchy.put(HomeMemberRole.ADMIN, 3);
        hierarchy.put(HomeMemberRole.MEMBER, 2);
        hierarchy.put(HomeMemberRole.GUEST, 1);
        hierarchy.put(HomeMemberRole.CUSTOM, 0);

        return hierarchy.getOrDefault(userRole, 0) >= hierarchy.getOrDefault(requiredRole, 0);
    }
}