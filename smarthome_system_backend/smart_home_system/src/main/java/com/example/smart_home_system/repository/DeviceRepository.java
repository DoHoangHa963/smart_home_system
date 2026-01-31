package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.DeviceLog;
import com.example.smart_home_system.entity.Room;
import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.DeviceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    /**
     * Kiểm tra device code có tồn tại không (chỉ check các device chưa bị xóa)
     * Sử dụng khi tạo device mới để đảm bảo device code unique
     * Case-insensitive check để tránh trùng lặp do case khác nhau
     */
    @Query("SELECT COUNT(d) > 0 FROM Device d WHERE UPPER(d.deviceCode) = UPPER(:deviceCode) AND d.deletedAt IS NULL")
    boolean existsByDeviceCode(@Param("deviceCode") String deviceCode);

    @Query("SELECT d FROM Device d LEFT JOIN d.room r WHERE (d.home.id = :homeId OR r.home.id = :homeId) AND d.deletedAt IS NULL")
    Page<Device> findByRoomHomeId(@Param("homeId") Long homeId, Pageable pageable);

    @Query("SELECT d FROM Device d WHERE d.room.id = :roomId AND d.deletedAt IS NULL")
    List<Device> findActiveDevicesByRoomId(@Param("roomId") Long roomId);

    @Query("SELECT d FROM Device d WHERE d.deletedAt IS NULL")
    Page<Device> findAllActiveDevices(Pageable pageable);

    Page<Device> findByRoomIdAndDeletedAtIsNull(Long roomId, Pageable pageable);

    @Query("SELECT COUNT(d) FROM Device d WHERE (d.home.id = :homeId OR (d.room IS NOT NULL AND d.room.home.id = :homeId)) AND d.deletedAt IS NULL")
    long countByHomeId(@Param("homeId") Long homeId);

    /**
     * Đếm số device trong một room (chỉ tính các device chưa bị xóa mềm)
     */
    @Query("SELECT COUNT(d) FROM Device d WHERE d.room.id = :roomId AND d.deletedAt IS NULL")
    long countByRoomId(@Param("roomId") Long roomId);

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

    /**
     * Tìm device by ID với home relationship được fetch
     * Sử dụng khi cần check permission để đảm bảo home được load
     */
    @Query("SELECT d FROM Device d LEFT JOIN FETCH d.home WHERE d.id = :deviceId")
    Optional<Device> findByIdWithHome(@Param("deviceId") Long deviceId);

    /**
     * Tìm tất cả devices được quản lý bởi một MCU Gateway
     */
    List<Device> findByMcuGatewayId(Long mcuGatewayId);

    /**
     * Cập nhật mcuGateway thành null cho tất cả devices của một MCU Gateway
     * Sử dụng khi unpair MCU Gateway
     */
    @Modifying
    @Query("UPDATE Device d SET d.mcuGateway = NULL WHERE d.mcuGateway.id = :mcuGatewayId")
    int clearMcuGatewayFromDevices(@Param("mcuGatewayId") Long mcuGatewayId);

    /**
     * Bỏ liên kết phòng khỏi tất cả thiết bị thuộc phòng (set room_id = null).
     * Dùng trước khi xóa phòng để tránh cascade xóa device và lỗi FK từ event_logs.
     */
    @Modifying
    @Query("UPDATE Device d SET d.room = NULL WHERE d.room.id = :roomId")
    int unlinkDevicesByRoomId(@Param("roomId") Long roomId);

    /**
     * Kiểm tra GPIO pin đã được sử dụng bởi device khác trong cùng home chưa
     * Chỉ check các device chưa bị xóa (deletedAt IS NULL)
     * Đảm bảo quan hệ 1-1 giữa GPIO pin và device
     */
    @Query("SELECT COUNT(d) > 0 FROM Device d WHERE d.gpioPin = :gpioPin AND d.home.id = :homeId AND d.deletedAt IS NULL")
    boolean existsByGpioPinAndHomeId(@Param("gpioPin") Integer gpioPin, @Param("homeId") Long homeId);

    /**
     * Kiểm tra GPIO pin đã được sử dụng bởi device khác (trừ device hiện tại)
     * Sử dụng khi update device để tránh conflict với chính nó
     */
    @Query("SELECT COUNT(d) > 0 FROM Device d WHERE d.gpioPin = :gpioPin AND d.home.id = :homeId AND d.id != :deviceId AND d.deletedAt IS NULL")
    boolean existsByGpioPinAndHomeIdExcludingDevice(@Param("gpioPin") Integer gpioPin, @Param("homeId") Long homeId,
            @Param("deviceId") Long deviceId);

    /**
     * Tìm device đang sử dụng GPIO pin trong home
     * Hữu ích để hiển thị thông tin device conflict trong error message
     */
    @Query("SELECT d FROM Device d WHERE d.gpioPin = :gpioPin AND d.home.id = :homeId AND d.deletedAt IS NULL")
    Optional<Device> findByGpioPinAndHomeId(@Param("gpioPin") Integer gpioPin, @Param("homeId") Long homeId);
}
