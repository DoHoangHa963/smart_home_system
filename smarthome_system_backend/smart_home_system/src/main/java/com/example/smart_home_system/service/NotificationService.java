package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.NotificationCreateRequest;
import com.example.smart_home_system.dto.response.NotificationResponse;
import com.example.smart_home_system.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface NotificationService {
    
    /**
     * Create a notification
     */
    NotificationResponse createNotification(NotificationCreateRequest request);

    /**
     * Get notifications for current user
     */
    Page<NotificationResponse> getNotificationsByUser(String userId, NotificationType type, Boolean isRead, 
                                                     LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    /**
     * Get notifications for a home (all members)
     */
    Page<NotificationResponse> getNotificationsByHome(Long homeId, NotificationType type,
                                                     LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    /**
     * Get unread count for current user
     */
    Long getUnreadCount(String userId);

    /**
     * Mark notification as read
     */
    void markAsRead(Long notificationId, String userId);

    /**
     * Mark all notifications as read for a user
     */
    void markAllAsRead(String userId);

    /**
     * Delete a notification
     */
    void deleteNotification(Long notificationId, String userId);

    /**
     * Delete all notifications for a user
     */
    void deleteAllNotifications(String userId);

    /**
     * Create emergency notification from ESP32
     */
    void createEmergencyNotification(String apiKey, String emergencyType, Boolean isActive, 
                                    String deviceCode, String metadata);
}
