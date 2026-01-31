package com.example.smart_home_system.dto.response.RFID;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Response DTO cho thống kê truy cập RFID.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDAccessStatsResponse {

    Long totalAccess;
    Long authorizedCount;
    Long unauthorizedCount;
    Long knownCardsCount;
    Long unknownCardsCount;
    Long disabledCardsCount;
}
