package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.MCUGateway;
import com.example.smart_home_system.enums.MCUStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for {@link MCUGateway} entity operations.
 * 
 * <p>Provides database access methods for MCU Gateway management including:
 * <ul>
 *   <li>Finding gateways by serial number, API key, or home</li>
 *   <li>Checking existence of gateways for specific homes</li>
 *   <li>Finding gateways in pairing state</li>
 * </ul>
 * 
 * <p><b>Performance Considerations:</b>
 * <ul>
 *   <li>API key lookups use JOIN FETCH to eagerly load Home entity</li>
 *   <li>Database indexes are defined on serial_number, api_key, and home_id</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUGateway
 */
@Repository
public interface MCUGatewayRepository extends JpaRepository<MCUGateway, Long> {
    
    /**
     * Tìm MCU Gateway bằng serial number
     */
    Optional<MCUGateway> findBySerialNumber(String serialNumber);
    
    /**
     * Tìm MCU Gateway bằng API Key
     * Sử dụng JOIN FETCH để eager load Home entity
     */
    @Query("SELECT m FROM MCUGateway m LEFT JOIN FETCH m.home WHERE m.apiKey = :apiKey")
    Optional<MCUGateway> findByApiKey(@Param("apiKey") String apiKey);
    
    /**
     * Tìm MCU Gateway của một Home
     */
    Optional<MCUGateway> findByHomeId(Long homeId);
    
    /**
     * Kiểm tra xem Home đã có MCU Gateway chưa
     */
    boolean existsByHomeId(Long homeId);
    
    /**
     * Kiểm tra xem Home đã có MCU Gateway khác (không phải MCU đang được xử lý) chưa
     * Dùng để kiểm tra khi confirm pairing - loại trừ MCU đang được confirm
     */
    @Query("SELECT COUNT(m) > 0 FROM MCUGateway m WHERE m.home.id = :homeId AND m.id != :excludeMcuId")
    boolean existsByHomeIdExcludingMcu(@Param("homeId") Long homeId, @Param("excludeMcuId") Long excludeMcuId);
    
    /**
     * Tìm MCU Gateway đang trong trạng thái PAIRING
     */
    @Query("SELECT m FROM MCUGateway m WHERE m.serialNumber = :serialNumber AND m.status = 'PAIRING'")
    Optional<MCUGateway> findPairingBySerialNumber(@Param("serialNumber") String serialNumber);

    /** MCU đang ONLINE nhưng lastHeartbeat cũ hơn ngưỡng → đánh dấu offline (khi LWT không kịp phát). */
    List<MCUGateway> findByStatusAndLastHeartbeatBefore(MCUStatus status, LocalDateTime lastHeartbeatBefore);
}
