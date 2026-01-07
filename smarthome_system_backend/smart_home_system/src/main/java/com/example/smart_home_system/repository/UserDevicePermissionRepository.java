package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.UserDevicePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDevicePermissionRepository extends JpaRepository<UserDevicePermission, Long> {

    List<UserDevicePermission> findByUserId(String userId);

    List<UserDevicePermission> findByDeviceId(Long deviceId);

    Optional<UserDevicePermission> findByUserIdAndDeviceId(String userId, Long deviceId);

    boolean existsByUserIdAndDeviceId(String userId, Long deviceId);
}