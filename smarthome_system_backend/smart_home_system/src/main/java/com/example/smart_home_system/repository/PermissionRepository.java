package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByName(String name);
    Set<Permission> findByIdIn(Set<Long> ids);
    boolean existsByName(String name);
}
