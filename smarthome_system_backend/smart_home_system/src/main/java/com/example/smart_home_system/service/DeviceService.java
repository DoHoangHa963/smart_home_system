package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.DeviceCreateRequest;
import com.example.smart_home_system.dto.request.DeviceUpdateRequest;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.enums.DeviceStatus;

import java.util.List;

public interface DeviceService {
    DeviceResponse createDevice(DeviceCreateRequest request);
    DeviceResponse getDeviceById(Long id);
    DeviceResponse getDeviceByCode(String code);
    List<DeviceListResponse> getDevicesByRoom(Long roomId);
    List<DeviceListResponse> getAllDevices();

    // Overloaded methods for better API
    DeviceResponse updateDevice(Long deviceId, DeviceUpdateRequest request);
    DeviceResponse updateDevice(DeviceUpdateRequest request); // Deprecated

    void deleteDevice(Long deviceId);
    DeviceResponse updateDeviceStatus(Long id, DeviceStatus status);
    void sendCommandToDevice(String deviceCode, String command, Object payload);

    // Additional useful methods
    List<DeviceListResponse> getDevicesByStatus(DeviceStatus status);
    List<DeviceListResponse> getDevicesByHome(Long homeId);
    void updateDeviceState(String deviceCode, String stateValue);
}
