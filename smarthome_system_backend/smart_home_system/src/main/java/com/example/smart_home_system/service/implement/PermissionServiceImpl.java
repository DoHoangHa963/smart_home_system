package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.PermissionRequest;
import com.example.smart_home_system.dto.response.PermissionResponse;
import com.example.smart_home_system.entity.Permission;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.mapper.PermissionMapper;
import com.example.smart_home_system.repository.PermissionRepository;
import com.example.smart_home_system.service.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    private final PermissionMapper permissionMapper;

    @Override
    @Transactional
    public PermissionResponse createPermission(PermissionRequest request) {
        log.info("Creating new permission: {}", request.getName());

        if (permissionRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.PERMISSION_ALREADY_EXISTS);
        }

        Permission permission = permissionMapper.toPermission(request);
        Permission savedPermission = permissionRepository.save(permission);

        log.info("Permission created successfully with ID: {}", savedPermission.getId());
        return permissionMapper.toPermissionResponse(savedPermission);
    }

    @Override
    @Transactional
    public PermissionResponse updatePermission(Long id, PermissionRequest request) {
        log.info("Updating permission with ID: {}", id);

        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));

        // Check if new name conflicts with existing permission (excluding current)
        if (!permission.getName().equals(request.getName()) &&
                permissionRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.PERMISSION_ALREADY_EXISTS);
        }

        permissionMapper.updatePermission(permission, request);
        Permission updatedPermission = permissionRepository.save(permission);

        log.info("Permission updated successfully with ID: {}", id);
        return permissionMapper.toPermissionResponse(updatedPermission);
    }

    @Override
    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(Long id) {
        log.debug("Fetching permission by ID: {}", id);

        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));

        return permissionMapper.toPermissionResponse(permission);
    }

    @Override
    @Transactional(readOnly = true)
    public PermissionResponse getPermissionByName(String name) {
        log.debug("Fetching permission by name: {}", name);

        Permission permission = permissionRepository.findByName(name)
                .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));

        return permissionMapper.toPermissionResponse(permission);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        log.debug("Fetching all permissions");

        return permissionRepository.findAll().stream()
                .map(permissionMapper::toPermissionResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deletePermission(Long id) {
        log.info("Deleting permission with ID: {}", id);

        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));

        permissionRepository.delete(permission);

        log.info("Permission deleted successfully with ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<PermissionResponse> getPermissionsByIds(Set<Long> ids) {
        log.debug("Fetching permissions by IDs: {}", ids);

        Set<Permission> permissions = permissionRepository.findByIdIn(ids);

        // Validate that all permission IDs exist
        if (permissions.size() != ids.size()) {
            Set<Long> foundIds = permissions.stream()
                    .map(Permission::getId)
                    .collect(Collectors.toSet());
            Set<Long> missingIds = ids.stream()
                    .filter(permissionId -> !foundIds.contains(permissionId))
                    .collect(Collectors.toSet());
            throw new AppException(ErrorCode.PERMISSION_NOT_FOUND);
        }

        return permissions.stream()
                .map(permissionMapper::toPermissionResponse)
                .collect(Collectors.toSet());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByName(String name) {
        return permissionRepository.existsByName(name);
    }
}