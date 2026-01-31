package com.example.smart_home_system.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entity lưu trữ log truy cập RFID từ ESP32 MCU Gateway.
 * 
 * Mỗi khi có thẻ RFID được quét, ESP32 sẽ gửi thông tin về backend
 * để lưu trữ log truy cập phục vụ mục đích audit và security.
 */
@Entity
@Table(name = "rfid_access_logs", indexes = {
        @Index(name = "idx_rfid_log_home", columnList = "home_id"),
        @Index(name = "idx_rfid_log_mcu", columnList = "mcu_gateway_id"),
        @Index(name = "idx_rfid_log_uid", columnList = "card_uid"),
        @Index(name = "idx_rfid_log_created", columnList = "created_at"),
        @Index(name = "idx_rfid_log_authorized", columnList = "authorized")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDAccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    /**
     * MCU Gateway đã gửi log này
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mcu_gateway_id", nullable = false)
    MCUGateway mcuGateway;

    /**
     * Home mà MCU Gateway này thuộc về
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_id", nullable = false)
    Home home;

    /**
     * UID của thẻ RFID (8 ký tự hex, ví dụ: "A1B2C3D4")
     */
    @Column(name = "card_uid", nullable = false, length = 16)
    String cardUid;

    /**
     * Tên của thẻ (nếu đã được đăng ký)
     */
    @Column(name = "card_name", length = 64)
    String cardName;

    /**
     * Kết quả truy cập: true = được phép, false = bị từ chối
     */
    @Column(nullable = false)
    Boolean authorized;

    /**
     * Trạng thái chi tiết: KNOWN, UNKNOWN, DISABLED
     */
    @Column(length = 20)
    String status;

    /**
     * Serial number của MCU Gateway (để dễ tra cứu)
     */
    @Column(name = "mcu_serial_number", length = 64)
    String mcuSerialNumber;

    /**
     * Timestamp từ ESP32 (millis)
     */
    @Column(name = "device_timestamp")
    Long deviceTimestamp;

    /**
     * Thời gian tạo record (server time)
     */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;
}
