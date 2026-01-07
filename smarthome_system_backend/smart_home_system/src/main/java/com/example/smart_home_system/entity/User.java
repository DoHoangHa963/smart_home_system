package com.example.smart_home_system.entity;

import com.example.smart_home_system.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_status", columnList = "status"),
        @Index(name = "idx_user_email", columnList = "email")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class User extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(nullable = false, unique = true, length = 50)
    String username;

    @Column(nullable = false, unique = true, length = 100)
    String email;

    @Column(nullable = false)
    String password;

    String phone;
    String avatarUrl;

    @Enumerated(EnumType.STRING)
    UserStatus status;

    @ManyToMany(fetch = FetchType.LAZY)
            @JoinTable(
                    name = "user_roles",
                    joinColumns = @JoinColumn(name = "user_id"),
                    inverseJoinColumns = @JoinColumn(name = "role_id")
            )
    Set<Role> roles = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    Set<UserDevicePermission> devicePermissions = new HashSet<>();

    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL)
    Set<Home> ownedHomes = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    Set<HomeMember> homeMemberships = new HashSet<>();
}
