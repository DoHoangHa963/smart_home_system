package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.MCU.MCUAutoPairRequest;
import com.example.smart_home_system.dto.request.MCU.MCUHeartbeatRequest;
import com.example.smart_home_system.dto.request.MCU.MCUPairingRequest;
import com.example.smart_home_system.dto.response.DashboardDataResponse;
import com.example.smart_home_system.dto.response.MCU.MCUGatewayResponse;
import com.example.smart_home_system.dto.response.MCU.MCUPairingInitResponse;
import com.example.smart_home_system.dto.response.MCU.MCUPairingResponse;
import com.example.smart_home_system.dto.response.MCU.MCUSensorDataResponse;
import com.example.smart_home_system.dto.response.MCU.MCUCommandsResponse;
import com.example.smart_home_system.service.implement.MCUGatewayServiceImpl;

/**
 * Service interface for managing ESP32 MCU Gateway operations.
 * 
 * <p>
 * This service handles the complete lifecycle of MCU Gateways including:
 * <ul>
 * <li>Pairing initialization and confirmation</li>
 * <li>Heartbeat processing for online status tracking</li>
 * <li>Gateway information retrieval</li>
 * <li>Unpairing and API key management</li>
 * </ul>
 * 
 * <p>
 * <b>Security Model:</b>
 * <ul>
 * <li>MCU Gateways authenticate using permanent API Keys</li>
 * <li>API Keys are generated during pairing and never expire</li>
 * <li>API Keys are revoked upon unpairing</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUGatewayServiceImpl
 */
public interface MCUGatewayService {

    /**
     * Init pairing - Tạo MCU Gateway với status PAIRING và trả về danh sách homes
     * available
     * User sẽ chọn home từ danh sách này và confirm pairing
     * Flow:
     * 1. ESP32 gửi serial number và thông tin (không cần homeId)
     * 2. Backend tạo MCU Gateway với status PAIRING (chưa có home)
     * 3. Backend trả về mcuGatewayId và danh sách homes mà user là OWNER và chưa có
     * MCU
     * 4. Frontend hiển thị danh sách homes cho user chọn
     * 5. User chọn home và confirm → Backend pair MCU với home đã chọn
     */
    MCUPairingInitResponse initPairing(MCUAutoPairRequest request);

    /**
     * Pair ESP32 với Home (manual - với homeId cụ thể)
     * Flow:
     * 1. ESP32 gửi serial number và thông tin
     * 2. Backend tạo MCU Gateway với status PAIRING
     * 3. User xác nhận trên frontend
     * 4. Backend generate API Key và trả về cho ESP32
     */
    MCUPairingResponse pairMCU(Long homeId, MCUPairingRequest request);

    /**
     * Confirm pairing với home đã chọn (từ frontend sau khi user xác nhận)
     * 
     * @param mcuGatewayId MCU Gateway ID
     * @param homeId       Home ID mà user đã chọn
     */
    MCUPairingResponse confirmPairing(Long mcuGatewayId, Long homeId);

    /**
     * ESP32 gửi heartbeat để báo online
     */
    void processHeartbeat(String apiKey, MCUHeartbeatRequest request);

    /**
     * Lấy thông tin MCU Gateway của Home
     */
    MCUGatewayResponse getByHomeId(Long homeId);

    /**
     * Lấy thông tin MCU Gateway bằng ID
     */
    MCUGatewayResponse getById(Long mcuGatewayId);

    /**
     * Xóa MCU Gateway (unpair)
     */
    void unpairMCU(Long mcuGatewayId);

    /**
     * Update IP Address của MCU Gateway
     * 
     * @param mcuGatewayId MCU Gateway ID
     * @param ipAddress    New IP address
     * @return Updated MCU Gateway response
     */
    MCUGatewayResponse updateIPAddress(Long mcuGatewayId, String ipAddress);

    /**
     * Verify API Key từ ESP32
     */
    boolean verifyApiKey(String apiKey);

    /**
     * Kiểm tra xem user hiện tại có quyền unpair MCU Gateway này không
     * Chỉ owner của home hoặc admin hệ thống mới có quyền
     */
    boolean canUnpairMCU(Long mcuGatewayId);

    /**
     * Lấy sensor data từ MCU Gateway của Home
     */
    MCUSensorDataResponse getSensorDataByHomeId(Long homeId);

    /**
     * Trigger ESP32 gửi heartbeat ngay lập tức
     * Backend sẽ gửi HTTP request đến ESP32 để yêu cầu gửi heartbeat
     */
    String triggerHeartbeat(Long homeId);

    /**
     * Lấy tất cả data cho dashboard: sensor data + device statistics
     * Trigger heartbeat và trả về full dashboard data
     */
    DashboardDataResponse getDashboardData(Long homeId);

    /**
     * Process sensor data từ ESP32 và cập nhật device status
     * Được gọi từ MQTT handler khi nhận sensor data
     */
    void processSensorDataFromMQTT(Long homeId, String sensorDataJson);

    /**
     * Process device status update từ ESP32 (immediate status change)
     * Được gọi từ MQTT handler khi nhận device-status update
     * Cập nhật device status ngay lập tức khi MCU thay đổi trạng thái
     * (ví dụ: cửa tự đóng, sensor trigger, etc.)
     */
    void processDeviceStatusUpdate(Long homeId, String deviceStatusJson);

    /**
     * Send automation control command to ESP32 via MQTT
     * 
     * @param homeId         Home ID
     * @param automationType AUTO_LIGHT, AUTO_FAN, or AUTO_CLOSE_DOOR
     * @param enabled        true to enable, false to disable
     */
    void sendAutomationCommand(Long homeId, String automationType, boolean enabled);

    /**
     * Send automation configuration (thresholds) to ESP32 via MQTT
     * 
     * @param homeId         Home ID
     * @param lightThreshold Light threshold (0-4095, -1 to skip)
     * @param tempThreshold  Temperature threshold (0-50°C, -1 to skip)
     * @param gasThreshold   Gas threshold (0-4095, -1 to skip)
     */
    void sendAutomationConfig(Long homeId, Integer lightThreshold, Integer tempThreshold, Integer gasThreshold);

}
