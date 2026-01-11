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
