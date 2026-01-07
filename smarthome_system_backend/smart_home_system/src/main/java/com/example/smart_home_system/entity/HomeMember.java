package com.example.smart_home_system.entity;

import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.util.PermissionUtils;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "home_members", indexes = {
        @Index(name = "idx_home_member_home", columnList = "home_id"),
        @Index(name = "idx_home_member_user", columnList = "user_id"),
        @Index(name = "idx_home_member_role", columnList = "role"),
        @Index(name = "idx_home_member_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HomeMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_id", nullable = false)
    Home home;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    HomeMemberRole role; // OWNER, ADMIN, MEMBER, GUEST

    @Column
    String customRoleName; // Tên role tùy chỉnh nếu có

    @Column(columnDefinition = "json")
    String permissions; // JSON chứa các quyền cụ thể: ["DEVICE_VIEW", "AUTOMATION_MANAGE", ...]

    @Column
    LocalDateTime joinedAt;

    @Column
    LocalDateTime invitedAt;

    @Column
    String invitedBy; // Email hoặc ID người mời

    @Column
    String status; // PENDING, ACTIVE, INACTIVE, REJECTED

    public Set<String> getPermissionSet() {
        return PermissionUtils.parsePermissionsFromJson(this.permissions);
    }

    public void setPermissionSet(Set<String> permissions) {
        if (permissions == null) {
            this.permissions = "[]";
            return;
        }

        // Validate dữ liệu đầu vào bằng Utils đã update
        if (PermissionUtils.validatePermissionsForRole(this.role, permissions)) {
            this.permissions = PermissionUtils.toPermissionsJson(permissions);
        } else {
            throw new IllegalArgumentException("Permission set contains invalid or undefined permissions.");
        }
    }


    public Set<String> getAllPermissions() {
        return PermissionUtils.mergePermissions(this.role, this.permissions);
    }

    public boolean hasPermission(String permission) {
        return getAllPermissions().contains(permission);
    }

    public boolean hasAnyPermission(String... permissions) {
        Set<String> userPermissions = getAllPermissions();
        for (String perm : permissions) {
            if (userPermissions.contains(perm)) {
                return true;
            }
        }
        return false;
    }

    public boolean hasAllPermissions(String... permissions) {
        Set<String> userPermissions = getAllPermissions();
        for (String perm : permissions) {
            if (!userPermissions.contains(perm)) {
                return false;
            }
        }
        return true;
    }

}