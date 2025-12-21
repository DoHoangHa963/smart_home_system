package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "scenes", indexes = {
        @Index(name = "idx_scene_home", columnList = "home_id"),
        @Index(name = "idx_scene_enabled", columnList = "enabled")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Scene {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_id", nullable = false)
    Home home;

    @Column(nullable = false)
    String name;

    @Column(nullable = false)
    Boolean enabled = true;

    @CreationTimestamp
    LocalDateTime createdAt;

    @OneToMany(mappedBy = "scene", cascade = CascadeType.ALL, orphanRemoval = true)
    Set<SceneAction> actions = new HashSet<>();
}

