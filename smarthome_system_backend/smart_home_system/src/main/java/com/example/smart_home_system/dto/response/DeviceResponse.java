package com.example.smart_home_system.dto.response;

import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.DeviceType;
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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;


}
