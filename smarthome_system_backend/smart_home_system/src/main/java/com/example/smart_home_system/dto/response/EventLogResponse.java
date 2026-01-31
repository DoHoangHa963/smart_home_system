package com.example.smart_home_system.dto.response;

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
public class EventLogResponse {
    private Long id;
    private Long homeId;
    private String homeName;
    private Long deviceId;
    private String deviceName;
    private String deviceCode;
    private String userId;
    private String username;
    private String source;
    private String eventType;
    private String eventValue;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
