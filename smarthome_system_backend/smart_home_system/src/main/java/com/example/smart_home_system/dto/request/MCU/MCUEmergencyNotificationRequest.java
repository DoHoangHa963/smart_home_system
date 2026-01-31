package com.example.smart_home_system.dto.request.MCU;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MCUEmergencyNotificationRequest {
    @NotBlank(message = "Emergency type is required")
    private String emergencyType; // "FIRE", "GAS", "BOTH"

    @NotNull(message = "Is active is required")
    private Boolean isActive; // true = emergency triggered, false = emergency cleared

    private String deviceCode; // Optional: device that triggered the emergency

    private String metadata; // Optional: JSON string for additional data (sensor values, etc.)
}
