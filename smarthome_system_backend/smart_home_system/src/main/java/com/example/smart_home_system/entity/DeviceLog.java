package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String deviceCode;

    private String action; // TURN_ON, STATE_UPDATE,...

    @Column(columnDefinition = "json")
    private String payload; // Data nhận được từ MQTT

    private LocalDateTime timestamp;

    private boolean fromDevice; // true = ESP gửi lên, false = server gửi xuống
}

