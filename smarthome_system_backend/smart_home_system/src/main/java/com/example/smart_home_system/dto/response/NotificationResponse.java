package com.example.smart_home_system.dto.response;

import com.example.smart_home_system.enums.NotificationType;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private Long homeId;
    private String homeName;
    private String userId;
    private String username;
    private Long deviceId;
    private String deviceName;
    private String deviceCode;
    private String title;
    private String message;
    private NotificationType type;
    private Boolean isRead;
    private String metadata;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
