package com.example.smart_home_system.entity;

import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.DeviceType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Device extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String deviceCode;

    @Enumerated(EnumType.STRING)
    private DeviceType type;

    @Enumerated(EnumType.STRING)
    private DeviceStatus status;

    private String stateValue;

    @Column(columnDefinition = "json")
    private String metadata;

    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;

    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL)
    private Set<UserDevicePermission> userPermissions = new HashSet<>();

    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL)
    private Set<DeviceAction> actions = new HashSet<>();
}
