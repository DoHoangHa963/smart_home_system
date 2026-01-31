package com.example.smart_home_system.dto.request.RFID;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Request DTO cho việc bắt đầu chế độ học thẻ RFID mới.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDLearnRequest {

    /**
     * Tên cho thẻ mới (optional, default: "Card #N")
     */
    String name;
}
