package com.example.smart_home_system.dto.response;

import com.example.smart_home_system.dto.response.MCU.MCUSensorDataResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response DTO cho dashboard data - bao gồm sensor data và device statistics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDataResponse {
    /**
     * Sensor data từ MCU Gateway
     */
    private MCUSensorDataResponse sensorData;
    
    /**
     * Device statistics
     */
    private DeviceStatistics statistics;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeviceStatistics {
        private Integer totalDevices;
        private Integer onlineDevices;
        private Integer offlineDevices;
        private Map<String, Integer> devicesByType;
        private Map<String, Integer> devicesByStatus;
        private List<DeviceResponse> topDevices;
    }
}
