package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "automation_triggers", indexes = {
        @Index(name = "idx_trigger_automation", columnList = "automation_id"),
        @Index(name = "idx_trigger_device", columnList = "device_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutomationTrigger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "automation_id", nullable = false)
    Automation automation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    Device device;

    @Column(nullable = false)
    String triggerType;

    private String conditionType;     // >, <, =, !=
    private String expectedValue;     // 30, true, "18:00" ...

    @CreationTimestamp
    LocalDateTime createdAt;
}
