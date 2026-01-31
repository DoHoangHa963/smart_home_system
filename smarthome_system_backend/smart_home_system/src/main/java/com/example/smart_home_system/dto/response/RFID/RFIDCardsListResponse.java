package com.example.smart_home_system.dto.response.RFID;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Response DTO cho danh sách thẻ RFID từ ESP32.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RFIDCardsListResponse {

    List<RFIDCardResponse> cards;
    Integer count;
    Integer maxCards;
    Boolean learningMode;
}
