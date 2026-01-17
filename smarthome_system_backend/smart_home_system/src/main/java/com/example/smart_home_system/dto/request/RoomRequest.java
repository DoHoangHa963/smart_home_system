package com.example.smart_home_system.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RoomRequest {
    @NotBlank(message = "Tên phòng không được để trống")
    @Size(min = 2, max = 50, message = "Tên phòng phải từ 2 đến 50 ký tự")
    @Pattern(regexp = "^[\\p{L}0-9\\s.,-]+$", message = "Tên phòng chỉ được chứa chữ cái, số, dấu cách và các ký tự: .,-")
    String name;

    @NotNull(message = "ID nhà là bắt buộc")
    Long homeId;
}