package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.UserDevicePermissionCreateRequest;
import com.example.smart_home_system.dto.request.UserDevicePermissionUpdateRequest;
import com.example.smart_home_system.dto.response.UserDevicePermissionResponse;
import com.example.smart_home_system.entity.Device;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.entity.UserDevicePermission;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.mapper.UserDevicePermissionMapper;
import com.example.smart_home_system.repository.DeviceRepository;
import com.example.smart_home_system.repository.UserDevicePermissionRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.UserDevicePermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link UserDevicePermissionService} for managing device-level permissions.
 * 
 * <p>This service provides the core business logic for device permission management including:
 * <ul>
 *   <li>Assigning specific device permissions to users</li>
 *   <li>Updating existing device permission configurations</li>
 *   <li>Revoking device access from users</li>
 *   <li>Querying permissions by user or device</li>
 * </ul>
 * 
 * <p><b>Use Cases:</b>
 * <ul>
 *   <li>Allow guests to control only specific devices</li>
 *   <li>Restrict children's access to certain devices</li>
 *   <li>Temporary access for maintenance personnel</li>
 * </ul>
 * 
 * <p><b>Validation:</b>
 * <ul>
 *   <li>User must exist before assigning permission</li>
 *   <li>Device must exist before assigning permission</li>
 *   <li>Duplicate user-device permission combinations are not allowed</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see UserDevicePermissionService
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserDevicePermissionServiceImpl implements UserDevicePermissionService {
    private final UserDevicePermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final UserDevicePermissionMapper permissionMapper;


    @Override
    @Transactional
    public UserDevicePermissionResponse assignPermission(UserDevicePermissionCreateRequest request) {
        if (permissionRepository.existsByUserIdAndDeviceId(request.getUserId(), request.getDeviceId())) {
            throw new AppException(ErrorCode.PERMISSION_ALREADY_EXISTS);
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Device device = deviceRepository.findById(request.getDeviceId())
                .orElseThrow(() -> new AppException(ErrorCode.DEVICE_NOT_FOUND));

        UserDevicePermission permission = permissionMapper.toEntity(request);

        permission.setUser(user);
        permission.setDevice(device);

        UserDevicePermission savedPermission = permissionRepository.save(permission);

        return permissionMapper.toResponse(savedPermission);
    }

    @Override
    @Transactional
    public UserDevicePermissionResponse updatePermission(Long permissionId, UserDevicePermissionUpdateRequest request) {
        UserDevicePermission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));

        permissionMapper.updateEntity(permission, request);

        UserDevicePermission updatedPermission = permissionRepository.save(permission);

        return permissionMapper.toResponse(updatedPermission);
    }

    @Override
    @Transactional
    public void revokePermission(Long permissionId) {
        if (!permissionRepository.existsById(permissionId)) {
            throw new AppException(ErrorCode.PERMISSION_NOT_FOUND);
        }

        permissionRepository.deleteById(permissionId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDevicePermissionResponse> getPermissionsByUserId(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        return permissionRepository.findByUserId(userId).stream()
                .map(permissionMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDevicePermissionResponse> getPermissionsByDeviceId(Long deviceId) {
        if (!deviceRepository.existsById(deviceId)) {
            throw new AppException(ErrorCode.DEVICE_NOT_FOUND);
        }

        return permissionRepository.findByDeviceId(deviceId).stream()
                .map(permissionMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserDevicePermissionResponse getPermissionById(Long id) {
        UserDevicePermission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));
        return permissionMapper.toResponse(permission);
    }
}
