package com.example.smart_home_system.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDevicePermissionUpdateRequest {

    private Boolean canView;
    private Boolean canControl;

    /**
     * JSON string
     */
    private String allowedActions;
}