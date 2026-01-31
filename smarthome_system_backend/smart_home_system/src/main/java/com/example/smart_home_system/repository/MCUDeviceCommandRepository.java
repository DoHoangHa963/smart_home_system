package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.MCUDeviceCommand;
import com.example.smart_home_system.entity.MCUGateway;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MCUDeviceCommandRepository extends JpaRepository<MCUDeviceCommand, Long> {
    
    /**
     * Lấy tất cả commands PENDING cho một MCU Gateway
     * Sắp xếp theo thời gian tạo (cũ nhất trước)
     */
    List<MCUDeviceCommand> findByMcuGatewayAndStatusOrderByCreatedAtAsc(
            MCUGateway mcuGateway, 
            String status
    );
    
    /**
     * Lấy command theo ID và MCU Gateway
     */
    Optional<MCUDeviceCommand> findByIdAndMcuGateway(Long id, MCUGateway mcuGateway);
    
    /**
     * Đánh dấu command đã được xử lý
     */
    @Modifying
    @Query("UPDATE MCUDeviceCommand c SET c.status = 'PROCESSED', c.processedAt = :processedAt WHERE c.id = :id")
    int markAsProcessed(@Param("id") Long id, @Param("processedAt") LocalDateTime processedAt);
    
    /**
     * Đánh dấu command thất bại
     */
    @Modifying
    @Query("UPDATE MCUDeviceCommand c SET c.status = 'FAILED', c.errorMessage = :errorMessage WHERE c.id = :id")
    int markAsFailed(@Param("id") Long id, @Param("errorMessage") String errorMessage);
    
    /**
     * Xóa các commands đã xử lý cũ hơn X ngày (cleanup)
     */
    @Modifying
    @Query("DELETE FROM MCUDeviceCommand c WHERE c.status = 'PROCESSED' AND c.processedAt < :beforeDate")
    int deleteOldProcessedCommands(@Param("beforeDate") LocalDateTime beforeDate);
    
    /**
     * Xóa tất cả commands của một MCU Gateway
     * Sử dụng khi unpair MCU Gateway
     */
    @Modifying
    @Query("DELETE FROM MCUDeviceCommand c WHERE c.mcuGateway.id = :mcuGatewayId")
    int deleteByMcuGatewayId(@Param("mcuGatewayId") Long mcuGatewayId);
    
    /**
     * Đếm số lượng commands của một MCU Gateway
     */
    long countByMcuGateway(MCUGateway mcuGateway);
}
