package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "scenes")
@Data
public class Scene {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long homeId;
    private String name;
    private Boolean enabled = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "scene", cascade = CascadeType.ALL)
    private Set<SceneAction> actions = new HashSet<>();
}

