package com.example.smart_home_system.dto.response;

import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.DeviceType;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceResponse {
    private Long id;
    private String name;
    private String deviceCode;
    private DeviceType deviceType;
    private DeviceStatus deviceStatus;
    private String stateValue;
    private String metadata;
    private Long roomId;
    private String roomName;
    
    /**
     * GPIO pin number trên ESP32 tương ứng với device này
     * Được tự động map từ deviceCode sử dụng GPIOMapping
     * null nếu device không có GPIO mapping
     */
    private Integer gpioPin;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;


}
