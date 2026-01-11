package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.DeviceLog;
import com.example.smart_home_system.entity.Room;
import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.DeviceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @Query("SELECT d FROM Device d WHERE d.status = :status AND d.deletedAt IS NULL")
    Page<Device> findByStatusAndDeletedAtIsNull(@Param("status") DeviceStatus status, Pageable pageable);
    boolean existsByDeviceCode(String deviceCode);

    @Query("SELECT d FROM Device d WHERE d.room.home.id = :homeId AND d.deletedAt IS NULL")
    Page<Device> findByRoomHomeId(@Param("homeId") Long homeId, Pageable pageable);

    @Query("SELECT d FROM Device d WHERE d.room.id = :roomId AND d.deletedAt IS NULL")
    List<Device> findActiveDevicesByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT d FROM Device d WHERE d.deletedAt IS NULL")
    Page<Device> findAllActiveDevices(Pageable pageable);

    Page<Device> findByRoomIdAndDeletedAtIsNull(Long roomId, Pageable pageable);

    @Query("SELECT COUNT(d) FROM Device d WHERE d.room.home.id = :homeId AND d.deletedAt IS NULL")
    long countByHomeId(@Param("homeId") Long homeId);

    Page<Device> findAllByRoom_Home_Id(Long homeId, Pageable pageable);

    @Query("SELECT d FROM Device d WHERE d.deviceCode = :code AND d.deletedAt IS NULL")
    Optional<Device> findActiveByDeviceCode(@Param("code") String code);

    long countByStatus(DeviceStatus status);

    // Group By Type để vẽ biểu đồ tròn (Pie Chart)
    @Query("SELECT d.type as type, COUNT(d) as count FROM Device d GROUP BY d.type")
    List<DeviceTypeCount> countDevicesByType();

    // Interface projection để hứng kết quả query Group By
    interface DeviceTypeCount {
        DeviceType getType();
        Long getCount();
    }
}
