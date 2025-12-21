package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.DeviceCreateRequest;
import com.example.smart_home_system.dto.request.DeviceUpdateRequest;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.Room;
import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.exception.GlobalExceptionHandler;
import com.example.smart_home_system.mapper.DeviceMapper;
import com.example.smart_home_system.repository.DeviceRepository;
import com.example.smart_home_system.repository.RoomRepository;
import com.example.smart_home_system.service.DeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeviceServiceImpl implements DeviceService {

    private final DeviceRepository deviceRepository;
    private final RoomRepository roomRepository;
    private final DeviceMapper deviceMapper;

    @Override
    @Transactional
    public DeviceResponse createDevice(DeviceCreateRequest request) {
        if (deviceRepository.existsByDeviceCode(request.getDeviceCode())) throw new IllegalArgumentException(("Device code already exists"));

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.ROOM_NOT_FOUND.getMessage()));

        Device device = deviceMapper.toDevice(request);
        device.setRoom(room);
        device.setStatus(DeviceStatus.OFFLINE);

        return deviceMapper.toDeviceResponse(deviceRepository.save(device));
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceResponse getDeviceById(Long id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.DEVICE_NOT_FOUND.getMessage()));
        return deviceMapper.toDeviceResponse(device);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceResponse getDeviceByCode(String code) {
        return deviceMapper.toDeviceResponse(deviceRepository.findByDeviceCode(code)
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.DEVICE_NOT_FOUND.getMessage())));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeviceListResponse> getDevicesByRoom(Long roomId) {
        if (!roomRepository.existsById(roomId)) {
            throw new GlobalExceptionHandler.ResourceNotFoundException("Room not found with id: " + roomId);
        }

        List<Device> devices = deviceRepository.findByRoomId(roomId);

        return devices.stream()
                .filter(device -> device.getDeletedAt() == null)
                .map(deviceMapper::toListResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeviceListResponse> getAllDevices() {
        List<Device> devices = deviceRepository.findAll();

        return devices.stream()
                .filter(device -> device.getDeletedAt() == null)
                .map(deviceMapper::toListResponse)
                .toList();
    }

    @Override
    public DeviceResponse updateDevice(Long deviceId, DeviceUpdateRequest request) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> {
                    return new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.DEVICE_NOT_FOUND.getMessage() + ": " + deviceId);
                });

        if (request.getRoomId() != null) {
            Room newRoom = roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> {
                        return new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.DEVICE_NOT_FOUND.getMessage() + ": " + deviceId);
                    });
            device.setRoom(newRoom);
        }

        deviceMapper.updateDevice(device, request);

        return deviceMapper.toDeviceResponse(deviceRepository.save(device));
    }

    @Override
    public DeviceResponse updateDevice(DeviceUpdateRequest request) {
        return null;
    }

    @Override
    public void deleteDevice(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.DEVICE_NOT_FOUND.getMessage() + ": " + deviceId));

        device.softDelete();
        deviceRepository.save(device);
    }

    @Override
    @Transactional
    public DeviceResponse updateDeviceStatus(Long id, DeviceStatus status) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> {
                    return new GlobalExceptionHandler.ResourceNotFoundException("Device not found with id: " + id);
                });

        DeviceStatus oldStatus = device.getStatus();
        device.setStatus(status);

        if (status == DeviceStatus.ONLINE || status == DeviceStatus.OFFLINE) {
            device.setStateValue("{\"status\":\"" + status + "\"}");
        }

        Device updatedDevice = deviceRepository.save(device);
        // Ghi log trạng thái
        // deviceLogService.logStatusChange(device, oldStatus, status);

        // Gửi command đến device thực nếu cần
        if (status == DeviceStatus.ACTIVE || status == DeviceStatus.INACTIVE) {
            sendCommandToDevice(device.getDeviceCode(), "SET_STATUS", status);
        }

        return deviceMapper.toDeviceResponse(updatedDevice);
    }

    @Override
    public void sendCommandToDevice(String deviceCode, String command, Object payload) {
        Device device = deviceRepository.findByDeviceCode(deviceCode)
                .orElseThrow(() -> {
                    return new GlobalExceptionHandler.ResourceNotFoundException("Device not found with code: " + deviceCode);
                });

        if (device.getStatus() == DeviceStatus.OFFLINE) {
            throw new IllegalStateException("Device is offline and cannot receive commands");
        }

        String payloadJson = convertToJson(payload);

    }

    private String convertToJson(Object payload) {
        if (payload == null) {
            return "{}";
        }

        if (payload instanceof String) {
            return (String) payload;
        }

        // Sẽ implement JSON conversion đầy đủ sau
        return "{\"value\":\"" + payload.toString() + "\"}";
    }

    @Transactional(readOnly = true)
    public List<DeviceListResponse> getDevicesByStatus(DeviceStatus status) {
        List<Device> devices = deviceRepository.findByStatus(status);

        return devices.stream()
                .filter(device -> device.getDeletedAt() == null)
                .map(deviceMapper::toListResponse)
                .toList();
    }

    @Override
    public List<DeviceListResponse> getDevicesByHome(Long homeId) {
        List<Device> devices = deviceRepository.findByRoomHomeId(homeId);

        return devices.stream()
                .filter(device -> device.getDeletedAt() == null )
                .map(deviceMapper::toListResponse)
                .toList();
    }

    @Override
    public void updateDeviceState(String deviceCode, String stateValue) {

    }
}
