package com.example.smart_home_system.dto.request;

import com.example.smart_home_system.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchRequest {
    private String keyword;
    private UserStatus status;
    private Integer page;
    private Integer size;
    private String sortBy;
    private String sortDirection;
}