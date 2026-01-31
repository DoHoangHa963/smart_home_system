package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.DeviceStatus;
import lombok.Data;

@Data
public class DeviceUpdateRequest {
    private String name;
    private DeviceStatus status;
    private Long roomId;
    private String metadata;
    
    /**
     * GPIO pin number trên ESP32 để điều khiển thiết bị
     * Giống như Virtual Pin trong Blynk
     */
    private Integer gpioPin;
}
