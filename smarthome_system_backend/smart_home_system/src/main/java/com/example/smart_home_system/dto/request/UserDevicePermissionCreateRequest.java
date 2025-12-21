package com.example.smart_home_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDevicePermissionCreateRequest {
    @NotBlank(message = "User ID is required")
    private String userId;

    @NotNull(message = "Device ID is required")
    private Long deviceId;

    @Builder.Default
    private boolean canView = true;

    @Builder.Default
    private boolean canControl = false;

    /**
     * JSON string
     * Example: ["TURN_ON","TURN_OFF","SET_TIMER"]
     */
    private String allowedActions;
}
