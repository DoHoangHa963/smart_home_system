package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.DeviceCreateRequest;
import com.example.smart_home_system.dto.request.DeviceUpdateRequest;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.Room;
import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.enums.HomeMemberRole;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.exception.GlobalExceptionHandler;
import com.example.smart_home_system.exception.ResourceNotFoundException;
import com.example.smart_home_system.mapper.DeviceMapper;
import com.example.smart_home_system.repository.DeviceRepository;
import com.example.smart_home_system.repository.HomeMemberRepository;
import com.example.smart_home_system.repository.RoomRepository;
import com.example.smart_home_system.service.DeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.smart_home_system.exception.DeviceOfflineException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringEscapeUtils.escapeJson;

@Service("deviceService")
@RequiredArgsConstructor
public class DeviceServiceImpl implements DeviceService {

    private final DeviceRepository deviceRepository;
    private final RoomRepository roomRepository;
    private final DeviceMapper deviceMapper;
    private final HomeMemberRepository homeMemberRepository;

    @Override
    @Transactional
    public DeviceResponse createDevice(DeviceCreateRequest request) {
        if (deviceRepository.existsByDeviceCode(request.getDeviceCode())) {
            throw new IllegalArgumentException("Device code already exists");
        }

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.ROOM_NOT_FOUND.getMessage()));

        if (!room.getHome().getId().equals(request.getHomeId())) {
            throw new IllegalArgumentException("Room does not belong to the specified Home");
        }

        Device device = deviceMapper.toDevice(request);

        String metadata = device.getMetadata();
        if (metadata == null || metadata.trim().isEmpty()) {
            device.setMetadata("{}");
        } else {
            String trimmedMeta = metadata.trim();
            if (!isValidJson(trimmedMeta)) {
                device.setMetadata("{\"description\": \"" + escapeJson(trimmedMeta) + "\"}");
            }
        }

        device.setRoom(room);
        device.setStatus(DeviceStatus.OFFLINE);

        Device savedDevice = deviceRepository.save(device);

        return deviceMapper.toDeviceResponse(savedDevice);
    }

    private boolean isValidJson(String json) {
        if (json == null) return false;
        return (json.startsWith("{") && json.endsWith("}")) ||
                (json.startsWith("[") && json.endsWith("]"));
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceResponse getDeviceById(Long id) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage()));
        return deviceMapper.toDeviceResponse(device);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceResponse getDeviceByCode(String code) {
        Device device = deviceRepository.findByDeviceCode(code)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage()));
        return deviceMapper.toDeviceResponse(device);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceListResponse> getDevicesByRoom(Long roomId, Pageable pageable) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Room not found with id: " + roomId);
        }

        Page<Device> devices = deviceRepository.findByRoomIdAndDeletedAtIsNull(roomId, pageable);
        return devices.map(deviceMapper::toListResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceListResponse> getAllDevices(Pageable pageable) {
        Page<Device> devicePage = deviceRepository.findAllActiveDevices(pageable);
        return devicePage.map(deviceMapper::toListResponse);
    }

    @Override
    @Transactional
    public DeviceResponse updateDevice(Long deviceId, DeviceUpdateRequest request) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage() + ": " + deviceId));

        if (request.getRoomId() != null) {
            Room newRoom = roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Room not found with id: " + request.getRoomId()));
            device.setRoom(newRoom);
        }

        deviceMapper.updateDevice(device, request);
        Device updatedDevice = deviceRepository.save(device);
        return deviceMapper.toDeviceResponse(updatedDevice);
    }

    @Override
    @Transactional
    public DeviceResponse updateDevice(DeviceUpdateRequest request) {
        // Implementation for overloaded method (if needed)
        throw new UnsupportedOperationException("Use updateDevice(Long deviceId, DeviceUpdateRequest request) instead");
    }

    @Override
    @Transactional
    public void deleteDevice(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage() + ": " + deviceId));

        device.softDelete();
        deviceRepository.save(device);
    }

    @Override
    @Transactional
    public DeviceResponse updateDeviceStatus(Long id, DeviceStatus status) {
        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Device not found with id: " + id));

        DeviceStatus oldStatus = device.getStatus();
        device.setStatus(status);

        if (status == DeviceStatus.ONLINE || status == DeviceStatus.OFFLINE) {
            device.setStateValue("{\"status\":\"" + status + "\"}");
        }

        Device updatedDevice = deviceRepository.save(device);
        // Ghi log trạng thái
        // deviceLogService.logStatusChange(device, oldStatus, status);

        return deviceMapper.toDeviceResponse(updatedDevice);
    }

    @Override
    public void sendCommandToDevice(String deviceCode, String command, Object payload) {
        Device device = deviceRepository.findByDeviceCode(deviceCode)
                .orElseThrow(() -> {
                    return new ResourceNotFoundException("Device not found with code: " + deviceCode);
                });

        String payloadJson = convertToJson(payload);

        switch (command) {
            case "TURN_ON":
                device.setStateValue("{\"power\": \"ON\"}");
                deviceRepository.save(device);
                break;
            case "TURN_OFF":
                device.setStateValue("{\"power\": \"OFF\"}");
                deviceRepository.save(device);
                break;
            case "TOGGLE":
                // Logic toggle đơn giản dựa trên stateValue hiện tại
                String currentState = device.getStateValue();
                if (currentState != null && currentState.contains("ON")) {
                    device.setStateValue("{\"power\": \"OFF\"}");
                } else {
                    device.setStateValue("{\"power\": \"ON\"}");
                }
                deviceRepository.save(device);
                break;
            default:
                // Các lệnh khác có thể log hoặc gửi MQTT
                break;
        }
    }

    private void logCommandSent(String deviceCode, String command, String payload) {
        // Log command sending for debugging/monitoring
        System.out.println("Command sent to device " + deviceCode +
                ": " + command + ", payload: " + payload);
    }

    private String convertToJson(Object payload) {
        if (payload == null) {
            return "{}";
        }

        if (payload instanceof String) {
            return (String) payload;
        }

        if (payload instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) payload;
            StringBuilder json = new StringBuilder("{");
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                json.append("\"").append(entry.getKey()).append("\":");
                if (entry.getValue() instanceof String) {
                    json.append("\"").append(entry.getValue()).append("\"");
                } else {
                    json.append(entry.getValue());
                }
                json.append(",");
            }
            if (json.length() > 1) {
                json.deleteCharAt(json.length() - 1);
            }
            json.append("}");
            return json.toString();
        }

        return "{\"value\":\"" + payload.toString() + "\"}";
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceListResponse> getDevicesByStatus(DeviceStatus status, Pageable pageable) {
        Page<Device> devices = deviceRepository.findByStatusAndDeletedAtIsNull(status, pageable);
        return devices.map(deviceMapper::toListResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceListResponse> getDevicesByHome(Long homeId, Pageable pageable) {
        Page<Device> devices = deviceRepository.findByRoomHomeId(homeId, pageable);
        return devices.map(deviceMapper::toListResponse);
    }

    @Override
    @Transactional
    public void updateDeviceState(String deviceCode, Map<String, Object> state) {
        Device device = deviceRepository.findByDeviceCode(deviceCode)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Device not found with code: " + deviceCode));

        String stateJson = convertToJson(state);
        device.setStateValue(stateJson);

        // Update status based on state if needed
        if (state.containsKey("status")) {
            try {
                DeviceStatus newStatus = DeviceStatus.valueOf(state.get("status").toString());
                device.setStatus(newStatus);
            } catch (IllegalArgumentException e) {
                // Ignore invalid status values
            }
        }

        deviceRepository.save(device);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeviceListResponse> searchDevices(String query, String deviceType, Long roomId) {
        // Implement actual search logic based on your requirements
        // This is a simplified implementation
        List<Device> devices;

        if (roomId != null) {
            devices = deviceRepository.findActiveDevicesByRoomId(roomId);
        } else {
            devices = deviceRepository.findAll();
        }

        // Filter by query and deviceType
        return devices.stream()
                .filter(device -> device.getDeletedAt() == null)
                .filter(device -> query == null ||
                        device.getName().contains(query) ||
                        device.getDeviceCode().contains(query))
                .filter(device -> deviceType == null ||
                        device.getType().equals(deviceType))
                .map(deviceMapper::toListResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDeviceStatistics(Long deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.DEVICE_NOT_FOUND.getMessage()));

        // Implement actual statistics calculation
        // This is a placeholder implementation
        return Map.of(
                "deviceId", deviceId,
                "name", device.getName(),
                "status", device.getStatus().name(),
                "createdAt", device.getCreatedAt(),
                "lastUpdated", device.getUpdatedAt(),
                "message", "Statistics functionality will be implemented"
        );
    }

    // Thêm phương thức còn thiếu từ interface
    @Override
    public void updateDeviceState(String deviceCode, String stateValue) {
        // Convert string state to map if needed, or implement as needed
        // This is a simplified implementation
        Device device = deviceRepository.findByDeviceCode(deviceCode)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Device not found with code: " + deviceCode));

        device.setStateValue(stateValue);
        deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    @Override
    public boolean isDeviceMember(Long deviceId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return deviceRepository.findById(deviceId)
                .map(device -> {
                    Long homeId = device.getRoom().getHome().getId();
                    // Chỉ cần tồn tại bản ghi trong bảng thành viên là được xem/điều khiển
                    return homeMemberRepository.existsByUserUsernameAndHomeId(username, homeId);
                })
                .orElse(false);
    }

    /**
     * Kiểm tra User hiện tại có phải là OWNER của nhà chứa thiết bị này không
     */
    @Transactional(readOnly = true)
    @Override
    public boolean isDeviceOwner(Long deviceId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return deviceRepository.findById(deviceId)
                .map(device -> {
                    Long homeId = device.getRoom().getHome().getId();
                    // Kiểm tra bản ghi phải có role là OWNER
                    return homeMemberRepository.existsByUserUsernameAndHomeIdAndRole(
                            username, homeId, HomeMemberRole.OWNER);
                })
                .orElse(false);
    }


}