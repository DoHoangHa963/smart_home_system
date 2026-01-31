package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.RFID.RFIDAccessLogRequest;
import com.example.smart_home_system.dto.request.RFID.RFIDCardUpdateRequest;
import com.example.smart_home_system.dto.request.RFID.RFIDLearnRequest;
import com.example.smart_home_system.dto.response.RFID.RFIDAccessLogResponse;
import com.example.smart_home_system.dto.response.RFID.RFIDAccessStatsResponse;
import com.example.smart_home_system.dto.response.RFID.RFIDCardsListResponse;
import com.example.smart_home_system.dto.response.RFID.RFIDLearnStatusResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for RFID card management operations.
 * 
 * <p>This service provides operations for:
 * <ul>
 *   <li>Managing RFID cards on ESP32 MCU Gateway</li>
 *   <li>Recording and retrieving access logs</li>
 *   <li>Starting learning mode for new cards</li>
 * </ul>
 * 
 * <p><b>Note:</b> RFID cards are stored on the ESP32 device.
 * This service acts as a proxy to communicate with the ESP32
 * via HTTP requests.
 */
public interface RFIDService {

    /**
     * Lấy danh sách thẻ RFID từ ESP32
     * 
     * @param homeId Home ID
     * @return Danh sách thẻ RFID
     */
    RFIDCardsListResponse getCardsList(Long homeId);

    /**
     * Bắt đầu chế độ học thẻ mới trên ESP32
     * 
     * @param homeId Home ID
     * @param request Request với tên thẻ (optional)
     * @return Kết quả bắt đầu learning mode
     */
    RFIDLearnStatusResponse startLearning(Long homeId, RFIDLearnRequest request);

    /**
     * Kiểm tra trạng thái learning mode
     * 
     * @param homeId Home ID
     * @return Trạng thái learning mode
     */
    RFIDLearnStatusResponse getLearningStatus(Long homeId);

    /**
     * Xóa thẻ RFID theo index
     * 
     * @param homeId Home ID
     * @param index Index của thẻ cần xóa
     */
    void deleteCard(Long homeId, int index);

    /**
     * Cập nhật thông tin thẻ RFID (tên, enabled)
     * 
     * @param homeId Home ID
     * @param request Request với thông tin cần cập nhật
     */
    void updateCard(Long homeId, RFIDCardUpdateRequest request);

    /**
     * Xóa tất cả thẻ RFID
     * 
     * @param homeId Home ID
     */
    void clearAllCards(Long homeId);

    /**
     * Ghi log truy cập RFID (được gọi từ ESP32)
     * 
     * @param apiKey API Key của MCU Gateway
     * @param request Thông tin access log
     */
    void recordAccessLog(String apiKey, RFIDAccessLogRequest request);

    /**
     * Lấy danh sách access logs theo Home ID với phân trang
     * 
     * @param homeId Home ID
     * @param pageable Thông tin phân trang
     * @return Page chứa access logs
     */
    Page<RFIDAccessLogResponse> getAccessLogs(Long homeId, Pageable pageable);

    /**
     * Lấy 10 access logs gần nhất
     * 
     * @param homeId Home ID
     * @return Danh sách access logs gần nhất
     */
    java.util.List<RFIDAccessLogResponse> getRecentAccessLogs(Long homeId);

    /**
     * Lấy thống kê access logs
     * 
     * @param homeId Home ID
     * @return Thống kê (số lần authorized, unauthorized)
     */
    RFIDAccessStatsResponse getAccessStats(Long homeId);
}
