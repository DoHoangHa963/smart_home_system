package com.example.smart_home_system.dto.response.admin;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RecentActivityResponse {
    private Long id;
    private String description;
    private String type;
    private LocalDateTime timestamp;
    private String relatedUser;
}