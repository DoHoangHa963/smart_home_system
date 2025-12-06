package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "automation_triggers")
@Data
public class AutomationTrigger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "automation_id")
    private Automation automation;

    private Long deviceId;            // optional nếu trigger dựa vào cảm biến
    private String triggerType;       // SENSOR_THRESHOLD, TIME, MOTION, ...
    private String conditionType;     // >, <, =, !=
    private String expectedValue;     // 30, true, "18:00" ...

    @CreationTimestamp
    private LocalDateTime createdAt;
}
