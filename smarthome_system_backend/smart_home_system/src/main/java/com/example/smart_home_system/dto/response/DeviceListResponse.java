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

    private Long roomId;
    private String roomName;
}
