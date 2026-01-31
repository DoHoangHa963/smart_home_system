package com.example.smart_home_system.dto.response;

import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.DeviceType;
import lombok.Data;

@Data
public class DeviceListResponse {

    private Long id;
    private String name;
    private String deviceCode;
    private DeviceType type;
    private DeviceStatus status;
    private String stateValue; // Thêm field này để frontend có thể parse trạng thái từ JSON

    private Long roomId;
    private String roomName;
    
    /**
     * GPIO pin number trên ESP32 tương ứng với device này
     * Được tự động map từ deviceCode sử dụng GPIOMapping
     * null nếu device không có GPIO mapping
     */
    private Integer gpioPin;
}
