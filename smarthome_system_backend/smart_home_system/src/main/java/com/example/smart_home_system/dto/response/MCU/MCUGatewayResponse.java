package com.example.smart_home_system.dto.response.MCU;

import com.example.smart_home_system.enums.MCUStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for MCU Gateway response.
 * 
 * <p>This DTO contains all information about an MCU Gateway that is returned
 * to the client, including device details, status, and home association.
 * 
 * <p><b>Note:</b> The API key is never included in this response for security reasons.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUGateway
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUGatewayResponse {
    
    /**
     * Unique identifier of the MCU Gateway
     */
    private Long id;
    
    /**
     * Hardware serial number (MAC address or chip ID)
     */
    private String serialNumber;
    
    /**
     * User-defined display name
     */
    private String name;
    
    /**
     * Current IP address on local network
     */
    private String ipAddress;
    
    /**
     * Current firmware version running on the device
     */
    private String firmwareVersion;
    
    /**
     * Current status: ONLINE, OFFLINE, PAIRING, or ERROR
     */
    private MCUStatus status;
    
    /**
     * Timestamp of last heartbeat received from the device
     */
    private LocalDateTime lastHeartbeat;
    
    /**
     * Timestamp when the device was paired with the home
     */
    private LocalDateTime pairedAt;
    
    /**
     * Username of the user who performed the pairing
     */
    private String pairedByUsername;
    
    /**
     * ID of the associated home
     */
    private Long homeId;
    
    /**
     * Name of the associated home
     */
    private String homeName;
    
    /**
     * Additional metadata in JSON format (WiFi info, etc.)
     */
    private String metadata;
    
    /**
     * Computed online status based on last heartbeat timestamp
     * Device is considered online if heartbeat was received within last 5 minutes
     */
    @JsonProperty("isOnline")
    private boolean isOnline;
}
