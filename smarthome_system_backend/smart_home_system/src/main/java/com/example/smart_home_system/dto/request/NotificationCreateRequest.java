package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationCreateRequest {
    @NotNull(message = "Home ID is required")
    private Long homeId;

    private String userId; // Optional: null means notify all home members

    private Long deviceId; // Optional: if notification is related to a device

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    @NotNull(message = "Type is required")
    private NotificationType type;

    private String metadata; // Optional: JSON string for additional data
}
