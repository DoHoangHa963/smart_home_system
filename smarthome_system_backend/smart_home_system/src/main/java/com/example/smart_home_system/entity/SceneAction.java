package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "scene_actions", indexes = {
        @Index(name = "idx_scene_action_scene", columnList = "scene_id"),
        @Index(name = "idx_scene_action_device", columnList = "device_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SceneAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scene_id", nullable = false)
    Scene scene;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    Device device;

    @Column(nullable = false)
    String actionType;

    String actionValue;

    @CreationTimestamp
    LocalDateTime createdAt;
}

