package com.example.smart_home_system.dto.request.RFID;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Request DTO cho việc cập nhật thông tin thẻ RFID.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDCardUpdateRequest {

    @NotNull(message = "Card index is required")
    Integer index;

    String name;

    Boolean enabled;
}
