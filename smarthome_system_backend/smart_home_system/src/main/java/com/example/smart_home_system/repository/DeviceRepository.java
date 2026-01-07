package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.enums.DeviceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByDeviceCode(String deviceCode);
    List<Device> findByRoomId(Long roomId);
    List<Device> findByStatus(DeviceStatus status);
    boolean existsByDeviceCode(String deviceCode);

    @Query("SELECT d FROM Device d WHERE d.room.home.id = :homeId AND d.deletedAt IS NULL")
    List<Device> findByRoomHomeId(@Param("homeId") Long homeId);

    @Query("SELECT d FROM Device d WHERE d.room.id = :roomId AND d.deletedAt IS NULL")
    List<Device> findActiveDevicesByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT d FROM Device d WHERE d.deletedAt IS NULL ORDER BY d.createdAt DESC")
    List<Device> findAllActiveDevices();

    @Query("SELECT COUNT(d) FROM Device d WHERE d.room.home.id = :homeId AND d.deletedAt IS NULL")
    long countByHomeId(@Param("homeId") Long homeId);

    @Query("SELECT d FROM Device d WHERE d.deviceCode = :code AND d.deletedAt IS NULL")
    Optional<Device> findActiveByDeviceCode(@Param("code") String code);
}
