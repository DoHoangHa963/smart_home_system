package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "device_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String actionCode; // TURN_ON, SET_TEMP, etc.

    @ManyToOne
    @JoinColumn(name = "device_id")
    private Device device;
}

