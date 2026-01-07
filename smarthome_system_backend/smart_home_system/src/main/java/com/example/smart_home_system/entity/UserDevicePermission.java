package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "user_device_permission", indexes = {
        @Index(name = "idx_permission_user", columnList = "user_id"),
        @Index(name = "idx_permission_device", columnList = "device_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserDevicePermission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    Device device;

    @Column(nullable = false)
    boolean canView;

    @Column(nullable = false)
    boolean canControl;

    @Column(columnDefinition = "json")
    String allowedActions;
}
