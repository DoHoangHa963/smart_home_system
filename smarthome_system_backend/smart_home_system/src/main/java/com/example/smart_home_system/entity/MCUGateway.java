package com.example.smart_home_system.entity;

import com.example.smart_home_system.enums.MCUStatus;
import com.example.smart_home_system.repository.MCUGatewayRepository;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * JPA Entity representing an ESP32 MCU Gateway device.
 * 
 * <p>An MCU Gateway is the central communication hub in a smart home that bridges
 * the gap between IoT devices and the cloud backend. Each home can have at most
 * one MCU Gateway assigned to it.
 * 
 * <p><b>Key Features:</b>
 * <ul>
 *   <li>Unique identification via serial number (MAC address or chip ID)</li>
 *   <li>API key-based authentication for secure communication</li>
 *   <li>Heartbeat mechanism for online status tracking</li>
 *   <li>Metadata storage for device-specific information</li>
 * </ul>
 * 
 * <p><b>Database Indexes:</b>
 * <ul>
 *   <li>{@code idx_mcu_home} - For home lookup queries</li>
 *   <li>{@code idx_mcu_serial} - For serial number uniqueness and lookup</li>
 *   <li>{@code idx_mcu_api_key} - For API key authentication lookups</li>
 * </ul>
 * 
 * <p><b>Lifecycle:</b>
 * <ol>
 *   <li>Created with PAIRING status during init-pairing</li>
 *   <li>Associated with home and API key generated during confirm-pairing</li>
 *   <li>Status updated to ONLINE/OFFLINE based on heartbeats</li>
 *   <li>API key revoked and status set to OFFLINE on unpair</li>
 * </ol>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUStatus
 * @see MCUGatewayRepository
 */
@Entity
@Table(name = "mcu_gateways", indexes = {
        @Index(name = "idx_mcu_home", columnList = "home_id"),
        @Index(name = "idx_mcu_serial", columnList = "serial_number"),
        @Index(name = "idx_mcu_api_key", columnList = "api_key")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MCUGateway extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    /**
     * Serial number duy nhất của ESP32 (MAC address hoặc chip ID)
     */
    @Column(nullable = false, unique = true, length = 64)
    String serialNumber;

    /**
     * Tên hiển thị của MCU (có thể thay đổi được)
     */
    @Column(nullable = false)
    String name;

    /**
     * API Key để ESP32 authenticate với backend
     * Được generate tự động khi pairing và tồn tại vĩnh viễn
     * Không có thời gian hết hạn, chỉ bị xóa khi unpair hoặc xóa MCU Gateway
     */
    @Column(unique = true, length = 128)
    String apiKey;

    /**
     * IP Address hiện tại của ESP32 trên mạng local
     */
    @Column(length = 45) // IPv6 support
    String ipAddress;

    /**
     * Firmware version của ESP32
     */
    @Column(length = 50)
    String firmwareVersion;

    /**
     * Trạng thái của MCU: ONLINE, OFFLINE, PAIRING, ERROR
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    MCUStatus status = MCUStatus.OFFLINE;

    /**
     * Thời gian last heartbeat từ ESP32
     */
    LocalDateTime lastHeartbeat;

    /**
     * Thời gian pairing được thực hiện
     */
    LocalDateTime pairedAt;

    /**
     * Người dùng thực hiện pairing
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paired_by_user_id")
    User pairedBy;

    /**
     * Home mà MCU này quản lý
     * Có thể null khi đang ở trạng thái PAIRING (chưa được pair với home nào)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_id", nullable = true)
    Home home;

    /**
     * Metadata bổ sung (JSON format)
     * Lưu thông tin: WiFi SSID, WiFi signal strength, chip info, etc.
     */
    @Column(columnDefinition = "json")
    String metadata;

    /**
     * Kiểm tra xem MCU có online không (heartbeat trong vòng 5 phút)
     */
    public boolean isOnline() {
        if (lastHeartbeat == null) {
            return false;
        }
        return lastHeartbeat.isAfter(LocalDateTime.now().minusMinutes(5));
    }

    /**
     * Update heartbeat timestamp
     * Khi nhận heartbeat, status sẽ được update thành ONLINE (trừ khi đang PAIRING)
     */
    public void updateHeartbeat() {
        this.lastHeartbeat = LocalDateTime.now();
        // Update status thành ONLINE khi nhận heartbeat (trừ khi đang PAIRING)
        // PAIRING chỉ được set khi init pairing, sau khi confirm pairing sẽ là ONLINE
        if (this.status != MCUStatus.PAIRING) {
            this.status = MCUStatus.ONLINE;
        }
    }
}
