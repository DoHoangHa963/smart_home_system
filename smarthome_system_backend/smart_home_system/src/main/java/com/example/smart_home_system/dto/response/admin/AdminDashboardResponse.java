package com.example.smart_home_system.dto.response.admin;

import com.example.smart_home_system.enums.DeviceType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class AdminDashboardResponse {
    // 1. Số liệu tổng quan
    private OverviewStats overview;

    // 2. Dữ liệu biểu đồ phân bố thiết bị (Pie Chart)
    private Map<DeviceType, Long> deviceTypeDistribution;

    // 3. Dữ liệu thiết bị theo trạng thái (Donut Chart)
    private Map<String, Long> deviceStatusDistribution;

    // 4. Hoạt động gần đây nhất của hệ thống (List View)
    private List<RecentActivityResponse> recentActivities;
}