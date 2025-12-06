package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "automation_actions")
@Data
public class AutomationAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "automation_id")
    private Automation automation;

    private Long deviceId;       // đích điều khiển
    private String actionType;   // TURN_ON, TURN_OFF, SET_VALUE, SEND_NOTIFY
    private String actionValue;  // brightness=60, temperature=22, ...

    @CreationTimestamp
    private LocalDateTime createdAt;
}

