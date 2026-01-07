package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.entity.Room;
import com.example.smart_home_system.enums.DeviceType;
import com.example.smart_home_system.validation.ValidDeviceCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DeviceCreateRequest {
    @NotBlank(message = "DEVICENAME_REQUIRED")
    @Size(min = 2, max = 100, message = "Device name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "DEVICECODE_REQUIRED")
    @ValidDeviceCode
    @Size(min = 3, max = 50, message = "Device code must be between 3 and 50 characters")
    private String deviceCode;

    @NotNull(message = "DEVICETYPE_REQUIRED")
    private DeviceType deviceType;

    @NotNull(message = "ROOMID_REQUIRED")
    private Long roomId;

    private String metadata;
}
