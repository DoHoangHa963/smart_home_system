package com.example.smart_home_system.dto.response;

import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.enums.HomeMemberStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.Set; // Import Set

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HomeMemberResponse {
    Long id;
    String userId;
    String username;
    String email;
    String avatarUrl;

    HomeMemberRole role;
    HomeMemberStatus status;

    String customRoleName;
    Set<String> permissions;
    String invitedBy;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    LocalDateTime joinedAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    LocalDateTime invitedAt;
}