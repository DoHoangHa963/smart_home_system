package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.NotificationCreateRequest;
import com.example.smart_home_system.dto.response.NotificationResponse;
import com.example.smart_home_system.entity.*;
import com.example.smart_home_system.enums.NotificationType;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.repository.*;
import com.example.smart_home_system.service.NotificationService;
import com.example.smart_home_system.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final HomeRepository homeRepository;
    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final HomeMemberRepository homeMemberRepository;
    private final MCUGatewayRepository mcuGatewayRepository;

    @Override
    @Transactional
    public NotificationResponse createNotification(NotificationCreateRequest request) {
        Home home = homeRepository.findById(request.getHomeId())
                .orElseThrow(() -> new AppException(ErrorCode.HOME_NOT_FOUND));

        Device device = null;
        if (request.getDeviceId() != null) {
            device = deviceRepository.findById(request.getDeviceId())
                    .orElse(null); // Device is optional
        }

        Notification notification;
        
        if (request.getUserId() != null) {
            // Create notification for specific user
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            
            notification = Notification.builder()
                    .home(home)
                    .user(user)
                    .device(device)
                    .title(request.getTitle())
                    .message(request.getMessage())
                    .type(request.getType())
                    .metadata(request.getMetadata())
                    .isRead(false)
                    .build();
        } else {
            // Create notification for all home members
            List<HomeMember> members = homeMemberRepository.findAllByHomeId(request.getHomeId());
            
            if (members.isEmpty()) {
                throw new AppException(ErrorCode.HOME_HAS_NO_MEMBERS);
            }

            // Create notification for each member
            Notification firstNotification = null;
            for (HomeMember member : members) {
                Notification n = Notification.builder()
                        .home(home)
                        .user(member.getUser())
                        .device(device)
                        .title(request.getTitle())
                        .message(request.getMessage())
                        .type(request.getType())
                        .metadata(request.getMetadata())
                        .isRead(false)
                        .build();
                
                Notification saved = notificationRepository.save(n);
                if (firstNotification == null) {
                    firstNotification = saved;
                }
            }
            
            notification = firstNotification;
        }

        log.info("Created notification: id={}, type={}, homeId={}", 
                notification.getId(), notification.getType(), home.getId());
        
        return mapToResponse(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsByUser(String userId, NotificationType type, Boolean isRead,
                                                          LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Page<Notification> notifications = notificationRepository.findByUserIdWithFilters(
                userId, type, isRead, startDate, endDate, pageable);
        
        return notifications.map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsByHome(Long homeId, NotificationType type,
                                                           LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Page<Notification> notifications = notificationRepository.findByHomeIdWithFilters(
                homeId, type, startDate, endDate, pageable);
        
        return notifications.map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Long getUnreadCount(String userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        
        // Verify user owns this notification
        if (!notification.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        
        notification.setIsRead(true);
        notificationRepository.save(notification);
        log.debug("Marked notification as read: id={}, userId={}", notificationId, userId);
    }

    @Override
    @Transactional
    public void markAllAsRead(String userId) {
        List<Notification> unreadNotifications = notificationRepository.findUnreadByUserId(userId);
        unreadNotifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unreadNotifications);
        log.info("Marked all notifications as read for userId={}, count={}", userId, unreadNotifications.size());
    }

    @Override
    @Transactional
    public void deleteNotification(Long notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        
        // Verify user owns this notification
        if (!notification.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }
        
        notificationRepository.delete(notification);
        log.info("Deleted notification: id={}, userId={}", notificationId, userId);
    }

    @Override
    @Transactional
    public void deleteAllNotifications(String userId) {
        notificationRepository.deleteByUserId(userId);
        log.info("Deleted all notifications for userId={}", userId);
    }

    @Override
    @Transactional
    public void createEmergencyNotification(String apiKey, String emergencyType, Boolean isActive,
                                           String deviceCode, String metadata) {
        // Find MCU Gateway by API Key
        MCUGateway mcuGateway = mcuGatewayRepository.findByApiKey(apiKey)
                .orElseThrow(() -> new AppException(ErrorCode.MCU_NOT_FOUND));
        
        if (mcuGateway.getHome() == null) {
            log.warn("MCU Gateway {} is not paired with any home", mcuGateway.getId());
            return;
        }
        
        Home home = mcuGateway.getHome();
        List<HomeMember> members = homeMemberRepository.findAllByHomeId(home.getId());
        
        if (members.isEmpty()) {
            log.warn("Home {} has no members to notify", home.getId());
            return;
        }

        // Determine notification type and message
        NotificationType notificationType = NotificationType.EMERGENCY;
        String title;
        String message;
        
        if (isActive) {
            switch (emergencyType.toUpperCase()) {
                case "FIRE":
                    title = "🚨 PHÁT HIỆN LỬA!";
                    message = "Cảm biến lửa đã phát hiện có lửa trong nhà. Vui lòng sơ tán ngay lập tức!";
                    break;
                case "GAS":
                    title = "⚠️ RÒ RỈ KHÍ GAS!";
                    message = "Cảm biến khí gas đã phát hiện rò rỉ. Vui lòng thông gió và kiểm tra ngay!";
                    break;
                case "BOTH":
                    title = "🚨 KHẨN CẤP: LỬA VÀ KHÍ GAS!";
                    message = "Phát hiện đồng thời lửa và rò rỉ khí gas. Sơ tán ngay lập tức!";
                    break;
                default:
                    title = "🚨 CẢNH BÁO KHẨN CẤP!";
                    message = "Có tình huống khẩn cấp xảy ra trong nhà. Vui lòng kiểm tra ngay!";
            }
        } else {
            // Xác định loại khẩn cấp đã được giải quyết từ thông báo gần nhất
            String resolvedTypeLabel = getResolvedEmergencyTypeLabel(home.getId());
            title = "✅ Tình huống khẩn cấp đã được giải quyết";
            message = String.format("%s Đã được xác nhận an toàn và hệ thống đã trở về trạng thái bình thường.",
                    resolvedTypeLabel);
            notificationType = NotificationType.SUCCESS;
        }

        // Find device if deviceCode is provided
        Device device = null;
        if (deviceCode != null && !deviceCode.isEmpty()) {
            device = deviceRepository.findByDeviceCode(deviceCode)
                    .orElse(null);
        }

        // Create notification for each member
        for (HomeMember member : members) {
            Notification notification = Notification.builder()
                    .home(home)
                    .user(member.getUser())
                    .device(device)
                    .title(title)
                    .message(message)
                    .type(notificationType)
                    .metadata(metadata)
                    .isRead(false)
                    .build();
            
            notificationRepository.save(notification);
        }
        
        log.info("Created emergency notification: type={}, isActive={}, homeId={}, members={}",
                emergencyType, isActive, home.getId(), members.size());
    }

    @Override
    public String getResolvedEmergencyTypeLabel(Long homeId) {
        var page = notificationRepository.findRecentEmergencyByHomeId(
                homeId, NotificationType.EMERGENCY, org.springframework.data.domain.PageRequest.of(0, 1));
        if (page.isEmpty()) {
            return "Tình huống khẩn cấp";
        }
        String lastTitle = page.getContent().get(0).getTitle();
        if (lastTitle != null) {
            if (lastTitle.contains("LỬA") && lastTitle.contains("KHÍ")) {
                return "Cảnh báo cháy và rò rỉ khí gas";
            }
            if (lastTitle.contains("LỬA")) {
                return "Cảnh báo cháy (phát hiện lửa)";
            }
            if (lastTitle.contains("KHÍ") || lastTitle.contains("GAS")) {
                return "Cảnh báo rò rỉ khí gas";
            }
        }
        return "Tình huống khẩn cấp";
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .homeId(notification.getHome() != null ? notification.getHome().getId() : null)
                .homeName(notification.getHome() != null ? notification.getHome().getName() : null)
                .userId(notification.getUser() != null ? notification.getUser().getId() : null)
                .username(notification.getUser() != null ? notification.getUser().getUsername() : null)
                .deviceId(notification.getDevice() != null ? notification.getDevice().getId() : null)
                .deviceName(notification.getDevice() != null ? notification.getDevice().getName() : null)
                .deviceCode(notification.getDevice() != null ? notification.getDevice().getDeviceCode() : null)
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .isRead(notification.getIsRead())
                .metadata(notification.getMetadata())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
