package com.example.smart_home_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddMemberRequest {
    @NotBlank(message = "Vui lòng nhập Username hoặc Email")
    String identifier; // Có thể là Username hoặc Email người được mời
}