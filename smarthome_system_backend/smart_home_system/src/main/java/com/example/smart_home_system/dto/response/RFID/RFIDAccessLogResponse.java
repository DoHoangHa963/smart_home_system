package com.example.smart_home_system.dto.response.RFID;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * Response DTO cho RFID access log.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDAccessLogResponse {

    Long id;
    String cardUid;
    String cardName;
    Boolean authorized;
    String status;
    String mcuSerialNumber;
    Long homeId;
    String homeName;
    Long deviceTimestamp;
    LocalDateTime createdAt;
}
