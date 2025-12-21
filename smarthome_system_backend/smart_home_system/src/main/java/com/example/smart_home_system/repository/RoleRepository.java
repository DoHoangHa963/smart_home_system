package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Role;
import com.example.smart_home_system.enums.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleType name);
    boolean existsByName(RoleType name);
    Set<Role> findByIdIn(Set<Long> ids);
    Set<Role> findByPermissions_Id(Long permissionId);
}