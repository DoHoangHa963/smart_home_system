package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_logs", indexes = {
        @Index(name = "idx_event_home", columnList = "home_id"),
        @Index(name = "idx_event_device", columnList = "device_id"),
        @Index(name = "idx_event_user", columnList = "user_id"),
        @Index(name = "idx_event_created", columnList = "created_at"),
        @Index(name = "idx_event_type", columnList = "event_type")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    Device device;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_id")
    Home home;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    User user;

    String source;
    String eventType;

    @Column(columnDefinition = "json")
    String eventValue;

    @CreationTimestamp
    LocalDateTime createdAt;
}

