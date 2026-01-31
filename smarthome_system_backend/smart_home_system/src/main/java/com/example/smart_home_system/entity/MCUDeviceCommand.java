package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * Entity để lưu device commands chờ ESP32 MCU Gateway poll và thực thi
 * 
 * Flow:
 * 1. Frontend gửi command → Backend lưu vào bảng này với status PENDING
 * 2. ESP32 poll GET /mcu/commands → Backend trả về commands PENDING
 * 3. ESP32 thực thi command → ESP32 gửi POST /mcu/commands/{commandId}/ack
 * 4. Backend cập nhật status = PROCESSED
 */
@Entity
@Table(name = "mcu_device_commands", indexes = {
        @Index(name = "idx_mcu_cmd_mcu", columnList = "mcu_gateway_id"),
        @Index(name = "idx_mcu_cmd_status", columnList = "status"),
        @Index(name = "idx_mcu_cmd_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MCUDeviceCommand extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;
    
    /**
     * MCU Gateway sẽ nhận và thực thi command này
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mcu_gateway_id", nullable = false)
    MCUGateway mcuGateway;
    
    /**
     * Device code để ESP32 biết điều khiển device nào
     */
    @Column(nullable = false, length = 100)
    String deviceCode;
    
    /**
     * GPIO pin number trên ESP32 để điều khiển chính xác thiết bị
     * Được tự động map từ deviceCode
     */
    @Column(nullable = false)
    Integer gpioPin;
    
    /**
     * Command type: TURN_ON, TURN_OFF, TOGGLE, SET_VALUE, etc.
     */
    @Column(nullable = false, length = 50)
    String command;
    
    /**
     * Command payload (JSON string)
     * Ví dụ: {"brightness": 80, "color": "#FF0000"}
     */
    @Column(columnDefinition = "text")
    String payload;
    
    /**
     * Status: PENDING, PROCESSED, FAILED
     */
    @Column(nullable = false, length = 20)
    @Builder.Default
    String status = "PENDING";
    
    /**
     * Thời gian ESP32 xác nhận đã nhận command
     */
    LocalDateTime processedAt;
    
    /**
     * Error message nếu command thất bại
     */
    @Column(columnDefinition = "text")
    String errorMessage;
    
    @PrePersist
    protected void onCreate() {
        if (getCreatedAt() == null) {
            setCreatedAt(LocalDateTime.now());
        }
    }
}
