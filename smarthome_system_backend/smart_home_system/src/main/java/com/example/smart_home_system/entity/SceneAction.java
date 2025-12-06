package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "scene_actions")
@Data
public class SceneAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "scene_id")
    private Scene scene;

    private Long deviceId;
    private String actionType;    // TURN_ON, SET_VALUE ...
    private String actionValue;   // 50%, 25C...

    @CreationTimestamp
    private LocalDateTime createdAt;
}

