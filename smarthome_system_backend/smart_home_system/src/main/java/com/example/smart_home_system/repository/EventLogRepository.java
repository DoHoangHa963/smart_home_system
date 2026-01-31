package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.EventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface EventLogRepository extends JpaRepository<EventLog, Long> {
    @Query("SELECT e FROM EventLog e LEFT JOIN FETCH e.user ORDER BY e.createdAt DESC")
    List<EventLog> findTop10RecentLogs(Pageable pageable);

    /**
     * Lấy các event logs gần đây nhất của một home
     * @param homeId Home ID
     * @param pageable Pagination
     * @return Danh sách event logs
     */
    @Query("SELECT e FROM EventLog e LEFT JOIN FETCH e.user LEFT JOIN FETCH e.device WHERE e.home.id = :homeId ORDER BY e.createdAt DESC")
    List<EventLog> findRecentLogsByHomeId(@Param("homeId") Long homeId, Pageable pageable);

    /**
     * Lấy các event logs của một home với pagination
     * @param homeId Home ID
     * @param pageable Pagination
     * @return Page of event logs
     */
    @Query("SELECT e FROM EventLog e LEFT JOIN e.user LEFT JOIN e.device WHERE e.home.id = :homeId ORDER BY e.createdAt DESC")
    Page<EventLog> findByHomeId(@Param("homeId") Long homeId, Pageable pageable);

    /**
     * Lấy các event logs của một home với filter theo eventType
     * @param homeId Home ID
     * @param eventType Event type (optional)
     * @param pageable Pagination
     * @return Page of event logs
     */
    @Query("SELECT e FROM EventLog e LEFT JOIN e.user LEFT JOIN e.device WHERE e.home.id = :homeId " +
           "AND (:eventType IS NULL OR e.eventType = :eventType) ORDER BY e.createdAt DESC")
    Page<EventLog> findByHomeIdAndEventType(@Param("homeId") Long homeId, 
                                             @Param("eventType") String eventType, 
                                             Pageable pageable);

    /**
     * Lấy các event logs của một home với filter theo khoảng thời gian
     * @param homeId Home ID
     * @param startDate Start date (optional)
     * @param endDate End date (optional)
     * @param pageable Pagination
     * @return Page of event logs
     */
    @Query("SELECT e FROM EventLog e LEFT JOIN e.user LEFT JOIN e.device WHERE e.home.id = :homeId " +
           "AND (:startDate IS NULL OR e.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR e.createdAt <= :endDate) ORDER BY e.createdAt DESC")
    Page<EventLog> findByHomeIdAndDateRange(@Param("homeId") Long homeId,
                                             @Param("startDate") LocalDateTime startDate,
                                             @Param("endDate") LocalDateTime endDate,
                                             Pageable pageable);

    /**
     * Lấy các event logs của một home với filter đầy đủ
     * @param homeId Home ID
     * @param eventType Event type (optional)
     * @param startDate Start date (optional)
     * @param endDate End date (optional)
     * @param pageable Pagination
     * @return Page of event logs
     */
    @Query("SELECT e FROM EventLog e LEFT JOIN e.user LEFT JOIN e.device WHERE e.home.id = :homeId " +
           "AND (:eventType IS NULL OR e.eventType = :eventType) " +
           "AND (:startDate IS NULL OR e.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR e.createdAt <= :endDate) ORDER BY e.createdAt DESC")
    Page<EventLog> findByHomeIdWithFilters(@Param("homeId") Long homeId,
                                             @Param("eventType") String eventType,
                                             @Param("startDate") LocalDateTime startDate,
                                             @Param("endDate") LocalDateTime endDate,
                                             Pageable pageable);
}