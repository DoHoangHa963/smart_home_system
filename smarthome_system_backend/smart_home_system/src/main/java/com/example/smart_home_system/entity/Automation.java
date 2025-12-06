package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "automations")
@Data
public class Automation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long homeId;   // FK -> Home
    private String name;
    private String description;
    private Boolean enabled = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime deletedAt;

    @OneToMany(mappedBy = "automation", cascade = CascadeType.ALL)
    private Set<AutomationTrigger> triggers = new HashSet<>();

    @OneToMany(mappedBy = "automation", cascade = CascadeType.ALL)
    private Set<AutomationAction> actions = new HashSet<>();
}

