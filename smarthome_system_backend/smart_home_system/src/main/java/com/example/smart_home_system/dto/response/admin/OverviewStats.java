package com.example.smart_home_system.dto.response.admin;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OverviewStats {
    private long totalUsers;
    private long newUsersToday;

    private long totalHomes;
    private long newHomesToday;

    private long totalDevices;
    private long onlineDevices;
    private long offlineDevices;
}