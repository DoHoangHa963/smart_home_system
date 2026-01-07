package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.DeviceStatus;
import lombok.Data;

@Data
public class DeviceUpdateRequest {
    private String name;
    private DeviceStatus status;
    private Long roomId;
    private String metadata;
}
