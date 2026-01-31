package com.example.smart_home_system.dto.response.MCU;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO response cho device command từ MCU Gateway
 * ESP32 sẽ nhận được danh sách commands này khi poll GET /mcu/commands
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUDeviceCommandResponse {
    /**
     * Command ID để ESP32 có thể acknowledge sau khi thực thi
     */
    private Long id;
    
    /**
     * Device code để ESP32 biết điều khiển device nào
     */
    private String deviceCode;
    
    /**
     * GPIO pin number trên ESP32 để điều khiển chính xác thiết bị
     */
    private Integer gpioPin;
    
    /**
     * Command type: TURN_ON, TURN_OFF, TOGGLE, SET_VALUE, etc.
     */
    private String command;
    
    /**
     * Command payload (JSON string)
     * Ví dụ: {"brightness": 80, "color": "#FF0000"}
     */
    private String payload;
}
