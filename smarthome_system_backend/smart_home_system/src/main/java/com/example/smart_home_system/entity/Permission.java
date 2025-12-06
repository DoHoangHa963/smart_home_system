package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // EX: USER_CREATE, USER_UPDATE, DEVICE_VIEW, DEVICE_MANAGE

    private String description;
}
