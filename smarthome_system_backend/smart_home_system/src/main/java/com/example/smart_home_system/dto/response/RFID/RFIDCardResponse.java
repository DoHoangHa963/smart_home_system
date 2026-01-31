package com.example.smart_home_system.dto.response.RFID;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Response DTO cho thông tin thẻ RFID từ ESP32.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDCardResponse {

    Integer index;
    String uid;
    String name;
    Boolean enabled;
    Long lastUsed;
}
