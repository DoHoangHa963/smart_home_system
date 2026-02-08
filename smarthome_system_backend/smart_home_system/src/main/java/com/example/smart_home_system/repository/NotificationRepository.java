package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.Notification;
import com.example.smart_home_system.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    /**
     * Lấy tất cả notifications của một user
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId ORDER BY n.createdAt DESC")
    Page<Notification> findByUserId(@Param("userId") String userId, Pageable pageable);

    /**
     * Lấy notifications của một home (tất cả members)
     */
    @Query("SELECT n FROM Notification n WHERE n.home.id = :homeId ORDER BY n.createdAt DESC")
    Page<Notification> findByHomeId(@Param("homeId") Long homeId, Pageable pageable);

    /**
     * Lấy notifications chưa đọc của một user
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.isRead = false ORDER BY n.createdAt DESC")
    List<Notification> findUnreadByUserId(@Param("userId") String userId);

    /**
     * Đếm số notifications chưa đọc của một user
     */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    Long countUnreadByUserId(@Param("userId") String userId);

    /**
     * Lấy notifications với filter
     */
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId " +
           "AND (:type IS NULL OR n.type = :type) " +
           "AND (:isRead IS NULL OR n.isRead = :isRead) " +
           "AND (:startDate IS NULL OR n.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR n.createdAt <= :endDate) " +
           "ORDER BY n.createdAt DESC")
    Page<Notification> findByUserIdWithFilters(
            @Param("userId") String userId,
            @Param("type") NotificationType type,
            @Param("isRead") Boolean isRead,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    /**
     * Lấy notifications của home với filter
     */
    @Query("SELECT n FROM Notification n WHERE n.home.id = :homeId " +
           "AND (:type IS NULL OR n.type = :type) " +
           "AND (:startDate IS NULL OR n.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR n.createdAt <= :endDate) " +
           "ORDER BY n.createdAt DESC")
    Page<Notification> findByHomeIdWithFilters(
            @Param("homeId") Long homeId,
            @Param("type") NotificationType type,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    /**
     * Xóa tất cả notifications đã đọc của một user
     */
    void deleteByUserIdAndIsReadTrue(String userId);

    /**
     * Xóa tất cả notifications của một user
     */
    void deleteByUserId(String userId);

    /**
     * Kiểm tra xem có emergency notification đang hoạt động gần đây không (trong vòng X phút)
     * Dùng để tránh tạo CLEARED notification khi không có emergency đang hoạt động trước đó
     */
    @Query("SELECT COUNT(n) > 0 FROM Notification n WHERE n.home.id = :homeId " +
           "AND n.type = :type " +
           "AND n.createdAt >= :since")
    boolean existsRecentEmergencyByHomeId(
            @Param("homeId") Long homeId,
            @Param("type") NotificationType type,
            @Param("since") LocalDateTime since);

    /**
     * Lấy thông báo khẩn cấp gần nhất của home (để biết loại FIRE/GAS/BOTH khi tạo CLEARED)
     */
    @Query("SELECT n FROM Notification n WHERE n.home.id = :homeId AND n.type = :type ORDER BY n.createdAt DESC")
    Page<Notification> findRecentEmergencyByHomeId(
            @Param("homeId") Long homeId,
            @Param("type") NotificationType type,
            Pageable pageable);

    /**
     * Kiểm tra đã tạo thông báo CLEARED gần đây cho home (tránh trùng khi ESP32 gửi sensor data nhiều lần)
     */
    @Query("SELECT COUNT(n) > 0 FROM Notification n WHERE n.home.id = :homeId " +
           "AND n.type = com.example.smart_home_system.enums.NotificationType.SUCCESS " +
           "AND n.title LIKE :pattern AND n.createdAt >= :since")
    boolean existsRecentClearedByHomeId(
            @Param("homeId") Long homeId,
            @Param("pattern") String pattern,
            @Param("since") LocalDateTime since);
}
