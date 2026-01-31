package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.RFIDAccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for RFID access log operations.
 */
@Repository
public interface RFIDAccessLogRepository extends JpaRepository<RFIDAccessLog, Long> {

    /**
     * Lấy access logs theo home ID với phân trang
     */
    Page<RFIDAccessLog> findByHomeIdOrderByCreatedAtDesc(Long homeId, Pageable pageable);

    /**
     * Lấy access logs theo MCU Gateway ID với phân trang
     */
    Page<RFIDAccessLog> findByMcuGatewayIdOrderByCreatedAtDesc(Long mcuGatewayId, Pageable pageable);

    /**
     * Lấy access logs theo card UID
     */
    List<RFIDAccessLog> findByCardUidOrderByCreatedAtDesc(String cardUid);

    /**
     * Lấy access logs trong khoảng thời gian
     */
    @Query("SELECT r FROM RFIDAccessLog r WHERE r.home.id = :homeId AND r.createdAt BETWEEN :startDate AND :endDate ORDER BY r.createdAt DESC")
    List<RFIDAccessLog> findByHomeIdAndDateRange(
            @Param("homeId") Long homeId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * Đếm số lần truy cập thành công theo home
     */
    @Query("SELECT COUNT(r) FROM RFIDAccessLog r WHERE r.home.id = :homeId AND r.authorized = true")
    Long countAuthorizedByHomeId(@Param("homeId") Long homeId);

    /**
     * Đếm số lần truy cập thất bại theo home
     */
    @Query("SELECT COUNT(r) FROM RFIDAccessLog r WHERE r.home.id = :homeId AND r.authorized = false")
    Long countUnauthorizedByHomeId(@Param("homeId") Long homeId);

    /**
     * Lấy 10 access logs gần nhất của home
     */
    List<RFIDAccessLog> findTop10ByHomeIdOrderByCreatedAtDesc(Long homeId);

    /**
     * Lấy access logs theo trạng thái (KNOWN, UNKNOWN, DISABLED)
     */
    Page<RFIDAccessLog> findByHomeIdAndStatusOrderByCreatedAtDesc(Long homeId, String status, Pageable pageable);
    
    /**
     * Xóa tất cả access logs của một MCU Gateway
     * Sử dụng khi unpair MCU Gateway
     */
    @Modifying
    @Query("DELETE FROM RFIDAccessLog r WHERE r.mcuGateway.id = :mcuGatewayId")
    int deleteByMcuGatewayId(@Param("mcuGatewayId") Long mcuGatewayId);
}
