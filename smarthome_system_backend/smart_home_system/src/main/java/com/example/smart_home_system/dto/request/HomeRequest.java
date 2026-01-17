package com.example.smart_home_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HomeRequest {
    @NotBlank(message = "Tên nhà không được để trống")
    @Size(min = 3, max = 50, message = "Tên nhà phải từ 3 đến 50 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9À-ỹ\\s.,-]+$", message = "Tên nhà chỉ được chứa chữ cái, số, dấu cách và các ký tự: ,.-")
    String name;

    @Size(max = 200, message = "Địa chỉ không được quá 200 ký tự")
    String address;

    @NotBlank(message = "Múi giờ không được để trống")
    String timeZone;
}