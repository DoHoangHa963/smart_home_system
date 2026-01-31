package com.example.smart_home_system.dto.response.MCU;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Response DTO cho sensor data từ MCU Gateway
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUSensorDataResponse {
    private Long mcuGatewayId;
    private String serialNumber;
    private LocalDateTime lastUpdate;

    // Sensor values
    private Double tempIn;
    private Double humIn;
    private Double tempOut;
    private Double humOut;
    private Integer gas;
    private Integer light;
    private Integer rain;
    private Boolean flame;
    private Boolean motion;
    private Boolean door;
    private Boolean lightStatus;
    private Boolean fanStatus;
    private Boolean gasAlert;
    private Boolean emergency;

    // Automation configuration
    private Boolean autoLight;
    private Boolean autoFan;
    private Boolean autoCloseDoor;
    private Integer autoLightThreshold;
    private Integer autoFanThreshold;
    private Integer gasAlertThreshold;

    // Raw sensor data (JSON)
    private Map<String, Object> rawData;
}
