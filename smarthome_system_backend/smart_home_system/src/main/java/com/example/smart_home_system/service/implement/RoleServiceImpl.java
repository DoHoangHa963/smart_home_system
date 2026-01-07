package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.RoleRequest;
import com.example.smart_home_system.dto.response.RoleResponse;
import com.example.smart_home_system.entity.Permission;
import com.example.smart_home_system.entity.Role;
import com.example.smart_home_system.enums.RoleType;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.mapper.RoleMapper;
import com.example.smart_home_system.repository.PermissionRepository;
import com.example.smart_home_system.repository.RoleRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.RoleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final RoleMapper roleMapper;

    @Override
    @Transactional
    public RoleResponse createRole(RoleRequest request) {
        log.info("Creating new role: {}", request.getName());

        RoleType roleType;
        try {
            roleType = RoleType.valueOf(request.getName().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_ENUM_VALUE);
        }

        if (roleRepository.existsByName(roleType)) {
            throw new AppException(ErrorCode.ROLE_ALREADY_EXISTS);
        }

        Set<Permission> permissions = fetchPermissionsByIds(request.getPermissionsIds());

        Role role = roleMapper.toRole(request);
        role.setName(roleType);
        role.setPermissions(permissions);

        Role savedRole = roleRepository.save(role);
        return roleMapper.toRoleResponse(savedRole);
    }

    @Override
    @Transactional
    public RoleResponse updateRole(Long roleId, RoleRequest request) {
        log.info("Updating role with ID: {}", roleId);

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        RoleType newRoleType;
        try {
            newRoleType = RoleType.valueOf(request.getName().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_ENUM_VALUE);
        }

        if (role.getName() != newRoleType && roleRepository.existsByName(newRoleType)) {
            throw new AppException(ErrorCode.ROLE_ALREADY_EXISTS);
        }

        Set<Permission> permissions = fetchPermissionsByIds(request.getPermissionsIds());

        role.setName(newRoleType);
        role.setDescription(request.getDescription());
        role.setPermissions(permissions);

        Role updatedRole = roleRepository.save(role);
        return roleMapper.toRoleResponse(updatedRole);
    }

    @Override
    @Transactional
    public void deleteRole(Long id) {
        log.info("Deleting role with ID: {}", id);

        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        if (userRepository.existsByRoles_Id(id)) {
            throw new AppException(ErrorCode.CONFLICT);
        }

        role.softDelete();
        roleRepository.save(role);

        log.info("Role soft-deleted successfully with ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public RoleResponse getRoleByName(String roleName) {
        try {
            RoleType roleType = RoleType.valueOf(roleName.toUpperCase());
            Role role = roleRepository.findByName(roleType)
                    .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
            return roleMapper.toRoleResponse(role);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_ENUM_VALUE);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public RoleResponse getRoleById(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        return roleMapper.toRoleResponse(role);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(roleMapper::toRoleResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Set<RoleResponse> getRolesByIds(Set<Long> ids) {
        Set<Role> roles = roleRepository.findByIdIn(ids);
        if (roles.size() != ids.size()) {
            throw new AppException(ErrorCode.ROLE_NOT_FOUND);
        }
        return roles.stream().map(roleMapper::toRoleResponse).collect(Collectors.toSet());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByName(String roleName) {
        try {
            return roleRepository.existsByName(RoleType.valueOf(roleName.toUpperCase()));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> getRolesByPermissionId(Long permissionId) {
        Set<Role> roles = roleRepository.findByPermissions_Id(permissionId);
        return roles.stream().map(roleMapper::toRoleResponse).collect(Collectors.toList());
    }

    private Set<Permission> fetchPermissionsByIds(Set<Long> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            return new HashSet<>();
        }
        Set<Permission> permissions = permissionRepository.findByIdIn(permissionIds);
        if (permissions.size() != permissionIds.size()) {
            throw new AppException(ErrorCode.PERMISSION_NOT_FOUND);
        }
        return permissions;
    }
}