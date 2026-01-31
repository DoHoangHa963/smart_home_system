package com.example.smart_home_system.dto.response.MCU;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response chứa danh sách commands cho ESP32
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUCommandsResponse {
    /**
     * Danh sách commands PENDING chờ ESP32 thực thi
     */
    private List<MCUDeviceCommandResponse> commands;
}
