package com.example.smart_home_system.dto.request.RFID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Request DTO cho việc ghi log truy cập RFID từ ESP32.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDAccessLogRequest {

    @NotBlank(message = "Serial number is required")
    String serialNumber;

    @NotBlank(message = "Card UID is required")
    String cardUid;

    @NotNull(message = "Authorized status is required")
    Boolean authorized;

    String cardName;

    String status;  // KNOWN, UNKNOWN, DISABLED

    Long timestamp;  // ESP32 millis timestamp
}
