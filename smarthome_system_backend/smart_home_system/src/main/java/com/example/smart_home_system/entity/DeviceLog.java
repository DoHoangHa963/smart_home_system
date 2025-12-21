package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_logs", indexes = {
        @Index(name = "idx_device_log_code", columnList = "device_code"),
        @Index(name = "idx_device_log_timestamp", columnList = "timestamp"),
        @Index(name = "idx_device_log_action", columnList = "action")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String deviceCode;

    private String action; // TURN_ON, STATE_UPDATE,...

    @Column(columnDefinition = "json")
    private String payload; // Data nhận được từ MQTT

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private boolean fromDevice; // true = ESP gửi lên, false = server gửi xuống

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}

