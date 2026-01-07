package com.example.smart_home_system.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDevicePermissionResponse {

    private Long id;

    private String username;

    private Long deviceId;
    private String deviceName;

    private boolean canView;
    private boolean canControl;

    private String allowedActions;
}
