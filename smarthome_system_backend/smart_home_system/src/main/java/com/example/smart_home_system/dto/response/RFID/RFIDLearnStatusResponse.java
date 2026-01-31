package com.example.smart_home_system.dto.response.RFID;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Response DTO cho trạng thái learning mode của RFID.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDLearnStatusResponse {

    Boolean learningMode;
    Boolean complete;
    Boolean success;
    String result;
    Integer cardCount;
}
