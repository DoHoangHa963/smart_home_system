package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "automations", indexes = {
        @Index(name = "idx_automation_home", columnList = "home_id"),
        @Index(name = "idx_automation_enabled", columnList = "enabled")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Automation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_id", nullable = false)
    Home home;

    @Column(nullable = false)
    String name;
    String description;

    @Column(nullable = false)
    Boolean enabled = true;


    @OneToMany(mappedBy = "automation", cascade = CascadeType.ALL)
    Set<AutomationTrigger> triggers = new HashSet<>();

    @OneToMany(mappedBy = "automation", cascade = CascadeType.ALL)
    Set<AutomationAction> actions = new HashSet<>();
}
