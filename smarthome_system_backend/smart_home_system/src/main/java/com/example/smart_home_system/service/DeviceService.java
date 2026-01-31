package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.DeviceCreateRequest;
import com.example.smart_home_system.dto.request.DeviceUpdateRequest;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.enums.DeviceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Service interface for managing IoT Device entities in the Smart Home System.
 * 
 * <p>This service provides comprehensive device management operations including:
 * <ul>
 *   <li>Device registration and configuration</li>
 *   <li>Device status monitoring and updates</li>
 *   <li>Command sending to devices</li>
 *   <li>Device state management</li>
 *   <li>Device statistics and analytics</li>
 * </ul>
 * 
 * <p><b>Device Lifecycle:</b>
 * <ol>
 *   <li>Device is created with OFFLINE status</li>
 *   <li>Device connects and status changes to ONLINE</li>
 *   <li>Device receives commands and updates state</li>
 *   <li>Device can be soft-deleted (archived)</li>
 * </ol>
 * 
 * <p><b>Supported Device Types:</b>
 * <ul>
 *   <li>LIGHT - Smart lighting devices</li>
 *   <li>THERMOSTAT - Temperature control devices</li>
 *   <li>SENSOR - Various sensors (motion, temperature, humidity)</li>
 *   <li>SWITCH - Smart switches and outlets</li>
 *   <li>CAMERA - Security cameras</li>
 * </ul>
 * 
 * <p><b>Command Protocol:</b>
 * Devices communicate via command-payload pattern where commands include
 * TURN_ON, TURN_OFF, TOGGLE, SET_VALUE, etc.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see DeviceServiceImpl
 * @see RoomService
 */
public interface DeviceService {
    DeviceResponse createDevice(DeviceCreateRequest request);
    DeviceResponse getDeviceById(Long id);
    DeviceResponse getDeviceByCode(String code);
    Page<DeviceListResponse> getDevicesByRoom(Long roomId, Pageable pageable);
    Page<DeviceListResponse> getAllDevices(Pageable pageable);

    // Overloaded methods for better API
    DeviceResponse updateDevice(Long deviceId, DeviceUpdateRequest request);
    DeviceResponse updateDevice(DeviceUpdateRequest request); // Deprecated

    void deleteDevice(Long deviceId);
    DeviceResponse updateDeviceStatus(Long id, DeviceStatus status);
    void sendCommandToDevice(String deviceCode, String command, Object payload);

    // Additional useful methods
    Page<DeviceListResponse> getDevicesByStatus(DeviceStatus status, Pageable pageable);
    Page<DeviceListResponse> getDevicesByHome(Long homeId, Pageable pageable);
    List<DeviceListResponse> searchDevices(String query, String deviceType, Long roomId);
    Map<String, Object> getDeviceStatistics(Long deviceId);
    void updateDeviceState(String deviceCode, Map<String, Object> state);

    // Thêm phương thức còn thiếu từ interface
    void updateDeviceState(String deviceCode, String stateValue);

    @Transactional(readOnly = true)
    boolean isDeviceMember(Long deviceId);

    @Transactional(readOnly = true)
    boolean isDeviceOwner(Long deviceId);
}
