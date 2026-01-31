package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.HashSet;
import java.util.Set;
@Entity
@Table(name = "homes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Home extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @NotBlank
    @Column(nullable = false)
    String name;
    String address;
    String timeZone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    User owner;

    @OneToMany(mappedBy = "home", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Set<Room> rooms = new HashSet<>();

    @OneToMany(mappedBy = "home", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Set<Automation> automations = new HashSet<>();

    @OneToMany(mappedBy = "home", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Set<Scene> scenes = new HashSet<>();

    @OneToMany(mappedBy = "home", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Set<HomeMember> members = new HashSet<>();

    /**
     * MCU Gateway của home này
     * Mỗi home có thể có một MCU gateway (ESP32)
     */
    @OneToMany(mappedBy = "home", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Set<MCUGateway> mcuGateways = new HashSet<>();
}