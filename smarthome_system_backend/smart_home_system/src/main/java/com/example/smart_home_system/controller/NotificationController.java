package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.NotificationCreateRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.NotificationResponse;
import com.example.smart_home_system.enums.NotificationType;
import com.example.smart_home_system.service.NotificationService;
import com.example.smart_home_system.util.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(RequestApi.NOTIFICATION)
@Tag(name = "Notifications", description = "APIs for managing notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(
            summary = "Get notifications for current user",
            description = "Retrieve paginated notifications for the current authenticated user with optional filters"
    )
    @GetMapping(RequestApi.NOTIFICATION_LIST)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotifications(
            @Parameter(description = "Notification type filter")
            @RequestParam(required = false) NotificationType type,
            
            @Parameter(description = "Filter by read status")
            @RequestParam(required = false) Boolean isRead,
            
            @Parameter(description = "Start date filter (format: yyyy-MM-dd HH:mm:ss)")
            @RequestParam(required = false) 
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startDate,
            
            @Parameter(description = "End date filter (format: yyyy-MM-dd HH:mm:ss)")
            @RequestParam(required = false) 
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endDate,
            
            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,
            
            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size) {
        
        String userId = SecurityUtils.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<NotificationResponse> notifications = notificationService.getNotificationsByUser(
                userId, type, isRead, startDate, endDate, pageable);
        
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved successfully", notifications));
    }

    @Operation(
            summary = "Get notifications for a home",
            description = "Retrieve paginated notifications for all members of a home"
    )
    @GetMapping("/home/{homeId}")
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'HOME_LOGS_VIEW')")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotificationsByHome(
            @Parameter(description = "Home ID", required = true)
            @PathVariable Long homeId,
            
            @Parameter(description = "Notification type filter")
            @RequestParam(required = false) NotificationType type,
            
            @Parameter(description = "Start date filter (format: yyyy-MM-dd HH:mm:ss)")
            @RequestParam(required = false) 
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startDate,
            
            @Parameter(description = "End date filter (format: yyyy-MM-dd HH:mm:ss)")
            @RequestParam(required = false) 
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endDate,
            
            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,
            
            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<NotificationResponse> notifications = notificationService.getNotificationsByHome(
                homeId, type, startDate, endDate, pageable);
        
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved successfully", notifications));
    }

    @Operation(
            summary = "Get unread notification count",
            description = "Get the count of unread notifications for the current user"
    )
    @GetMapping(RequestApi.NOTIFICATION_UNREAD_COUNT)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount() {
        String userId = SecurityUtils.getCurrentUserId();
        Long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(ApiResponse.success("Unread count retrieved", count));
    }

    @Operation(
            summary = "Create a notification",
            description = "Create a new notification (admin only or home owner)"
    )
    @PostMapping(RequestApi.NOTIFICATION_LIST)
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#request.homeId, 'HOME', 'HOME_UPDATE')")
    public ResponseEntity<ApiResponse<NotificationResponse>> createNotification(
            @Valid @RequestBody NotificationCreateRequest request) {
        NotificationResponse response = notificationService.createNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Notification created successfully", response));
    }

    @Operation(
            summary = "Mark notification as read",
            description = "Mark a specific notification as read"
    )
    @PutMapping(RequestApi.NOTIFICATION_MARK_READ)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @Parameter(description = "Notification ID", required = true)
            @PathVariable Long notificationId) {
        String userId = SecurityUtils.getCurrentUserId();
        notificationService.markAsRead(notificationId, userId);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read"));
    }

    @Operation(
            summary = "Mark all notifications as read",
            description = "Mark all notifications as read for the current user"
    )
    @PutMapping(RequestApi.NOTIFICATION_MARK_ALL_READ)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        String userId = SecurityUtils.getCurrentUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read"));
    }

    @Operation(
            summary = "Delete a notification",
            description = "Delete a specific notification"
    )
    @DeleteMapping(RequestApi.NOTIFICATION_DELETE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @Parameter(description = "Notification ID", required = true)
            @PathVariable Long notificationId) {
        String userId = SecurityUtils.getCurrentUserId();
        notificationService.deleteNotification(notificationId, userId);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted successfully"));
    }

    @Operation(
            summary = "Delete all notifications",
            description = "Delete all notifications for the current user"
    )
    @DeleteMapping(RequestApi.NOTIFICATION_DELETE_ALL)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteAllNotifications() {
        String userId = SecurityUtils.getCurrentUserId();
        notificationService.deleteAllNotifications(userId);
        return ResponseEntity.ok(ApiResponse.success("All notifications deleted successfully"));
    }
}
