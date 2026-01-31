package com.example.smart_home_system.entity;

import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.DeviceType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "devices", indexes = {
        @Index(name = "idx_device_status", columnList = "status"),
        @Index(name = "idx_device_type", columnList = "type"),
        @Index(name = "idx_device_room", columnList = "room_id"),
        @Index(name = "idx_device_home", columnList = "home_id"),
        @Index(name = "idx_device_code", columnList = "device_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Device extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /**
     * Device code phải unique trong hệ thống (chỉ tính các device chưa bị xóa)
     * Unique constraint được kiểm tra ở application level thông qua existsByDeviceCode()
     * để hỗ trợ soft delete (device đã xóa có thể tái sử dụng device code)
     */
    @Column(nullable = false)
    private String deviceCode;

    @Enumerated(EnumType.STRING)
    private DeviceType type;

    @Enumerated(EnumType.STRING)
    private DeviceStatus status;

    private String stateValue;

    /**
     * GPIO pin number trên ESP32 để điều khiển thiết bị
     * Giống như Virtual Pin trong Blynk
     * Ví dụ: 42 = PIN_RELAY_LIGHT, 21 = PIN_RELAY_FAN, 18 = PIN_SERVO
     */
    @Column(name = "gpio_pin")
    private Integer gpioPin;

    @Column(columnDefinition = "json")
    private String metadata;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = true)
    private Room room;

    /**
     * Home mà device thuộc về
     * Required để hỗ trợ devices không thuộc phòng cụ thể (như cửa chính)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_id", nullable = false)
    private Home home;

    /**
     * MCU Gateway quản lý thiết bị này
     * Mỗi device được điều khiển bởi một MCU gateway
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mcu_gateway_id")
    private MCUGateway mcuGateway;

    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL)
    private Set<UserDevicePermission> userPermissions = new HashSet<>();

    @OneToMany(mappedBy = "device", cascade = CascadeType.ALL)
    private Set<DeviceAction> actions = new HashSet<>();

    /**
     * Helper method để lấy nhanh HomeId
     * Ưu tiên từ home relationship, fallback về room.home nếu home chưa được set
     */
    public Long getHomeId() {
        if (this.home != null) {
            return this.home.getId();
        }
        if (this.room != null && this.room.getHome() != null) {
            return this.room.getHome().getId();
        }
        return null;
    }
}
