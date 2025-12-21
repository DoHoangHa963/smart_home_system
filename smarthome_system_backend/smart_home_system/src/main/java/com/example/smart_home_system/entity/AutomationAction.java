package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "automation_actions", indexes = {
        @Index(name = "idx_action_automation", columnList = "automation_id"),
        @Index(name = "idx_action_device", columnList = "device_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutomationAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "automation_id", nullable = false)
    Automation automation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    Device device;

    @Column(nullable = false)
    String actionType;

    String actionValue;  // brightness=60, temperature=22, ...

    @CreationTimestamp
    LocalDateTime createdAt;
}

