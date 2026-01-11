package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.response.admin.AdminDashboardResponse;
import com.example.smart_home_system.dto.response.admin.OverviewStats;
import com.example.smart_home_system.dto.response.admin.RecentActivityResponse;
import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.entity.EventLog;
import com.example.smart_home_system.enums.DeviceType;
import com.example.smart_home_system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service("AdminService")
@RequiredArgsConstructor
public class AdminServiceImpl {

    private final UserRepository userRepository;
    private final HomeRepository homeRepository;
    private final DeviceRepository deviceRepository;
    private final EventLogRepository eventLogRepository;

    public AdminDashboardResponse getDetailedDashboard() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();

        // 1. Tính toán Overview Stats
        OverviewStats overview = OverviewStats.builder()
                .totalUsers(userRepository.count())
                .newUsersToday(userRepository.countByCreatedAtAfter(startOfDay))
                .totalHomes(homeRepository.count())
                .newHomesToday(homeRepository.countByCreatedAtAfter(startOfDay))
                .totalDevices(deviceRepository.count())
                .onlineDevices(deviceRepository.countByStatus(DeviceStatus.ONLINE))
                .offlineDevices(deviceRepository.countByStatus(DeviceStatus.OFFLINE))
                .build();

        // 2. Tính toán Device Distribution (Cho biểu đồ)
        Map<DeviceType, Long> typeDistribution = deviceRepository.countDevicesByType().stream()
                .collect(Collectors.toMap(DeviceRepository.DeviceTypeCount::getType, DeviceRepository.DeviceTypeCount::getCount));

        // 3. Tính toán Status Distribution
        Map<String, Long> statusDistribution = new HashMap<>();
        statusDistribution.put("ONLINE", overview.getOnlineDevices());
        statusDistribution.put("OFFLINE", overview.getOfflineDevices());
        // Giả sử tổng trừ đi on/off ra các trạng thái khác (MAINTENANCE...)
        long others = overview.getTotalDevices() - overview.getOnlineDevices() - overview.getOfflineDevices();
        if (others > 0) statusDistribution.put("OTHERS", others);

        // 4. Lấy Recent Activities
        List<RecentActivityResponse> recentActivities = eventLogRepository
                .findTop10RecentLogs(PageRequest.of(0, 10))
                .stream()
                .map(this::mapToActivityResponse)
                .collect(Collectors.toList());

        return AdminDashboardResponse.builder()
                .overview(overview)
                .deviceTypeDistribution(typeDistribution)
                .deviceStatusDistribution(statusDistribution)
                .recentActivities(recentActivities)
                .build();
    }

    // Helper map entity sang DTO
    private RecentActivityResponse mapToActivityResponse(EventLog log) {
        String username = log.getUser() != null ? log.getUser().getUsername() : "System/Unknown";
        String description = String.format("[%s] %s triggered %s",
                log.getSource(), username, log.getEventType());

        return RecentActivityResponse.builder()
                .id(log.getId())
                .description(description) // Bạn có thể format đẹp hơn tùy business
                .type(log.getEventType().contains("ERROR") ? "ERROR" : "INFO")
                .relatedUser(username)
                .timestamp(log.getCreatedAt())
                .build();
    }
}