package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_logs")
@Data
public class EventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long deviceId;
    private Long homeId;
    private Long userId;          // optional: null nếu event do automation

    private String source;        // DEVICE, AUTOMATION, USER
    private String eventType;     // SENSOR_UPDATE, ACTION_EXECUTED, ERROR...
    private String eventValue;    // json {"temp":29}

    @CreationTimestamp
    private LocalDateTime createdAt;
}

