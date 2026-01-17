package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.request.ChangePasswordRequest;
import com.example.smart_home_system.dto.request.UserCreationRequest;
import com.example.smart_home_system.dto.request.UserUpdateRequest;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.entity.Permission;
import com.example.smart_home_system.entity.Role;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.UserStatus;
import com.example.smart_home_system.exception.*;
import com.example.smart_home_system.mapper.UserMapper;
import com.example.smart_home_system.repository.RoleRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.UserService;
import com.example.smart_home_system.util.SecurityUtils;
import com.example.smart_home_system.validation.UsernameValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse createUser(UserCreationRequest request) {
        log.info("Creating new user with email: {}", request.getEmail());

        validateUserCreation(request);

        User user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.ACTIVE);

        // Assign roles if provided
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            user.setRoles(roles);
        }

        User savedUser = userRepository.save(user);

        log.info("User created successfully with ID: {}", savedUser.getId());
        return userMapper.toUserResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(String id) {
        log.debug("Fetching user by ID: {}", id);

        User user = userRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        return userMapper.toUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        log.debug("Fetching user by email: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        if (user.getDeletedAt() != null) {
            throw new ResourceNotFoundException("User has been deleted");
        }

        return userMapper.toUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        log.debug("Fetching user by username: {}", username);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        if (user.getDeletedAt() != null) {
            throw new ResourceNotFoundException("User has been deleted");
        }

        return userMapper.toUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser() {
        String currentUserId = SecurityUtils.getCurrentUserId();
        return getUserById(currentUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        log.debug("Fetching all users with pagination");
        Page<User> users = userRepository.findByDeletedAtIsNull(pageable);
        return users.map(userMapper::toUserResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(String keyword, Pageable pageable) {
        log.debug("Searching users with keyword: {}", keyword);

        Page<User> users;
        if (keyword != null && !keyword.trim().isEmpty()) {
            users = userRepository.searchUsers(keyword.trim(), pageable);
        } else {
            users = userRepository.findByDeletedAtIsNull(pageable);
        }

        return users.map(userMapper::toUserResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByStatus(String status) {
        log.debug("Fetching users by status: {}", status);

        UserStatus userStatus = parseUserStatus(status);

        return userRepository.findByStatus(userStatus)
                .stream()
                .filter(user -> user.getDeletedAt() == null)
                .map(userMapper::toUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByHomeId(Long homeId) {
        log.debug("Fetching users by home ID: {}", homeId);

        return userRepository.findByHomeMemberships_Home_Id(homeId)
                .stream()
                .filter(user -> user.getDeletedAt() == null)
                .map(userMapper::toUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    @Transactional(readOnly = true)
    public long countActiveUsers() {
        return userRepository.countActiveUsers();
    }

    @Override
    public UserResponse updateUser(String id, UserUpdateRequest request) {
        log.info("Updating user with ID: {}", id);

        User user = userRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        validateUserUpdate(request, user);

        userMapper.updateUser(user, request);

        // Update roles if provided
        if (request.getRoleIds() != null) {
            Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            user.setRoles(roles);
        }

        // Update status if provided
        if (request.getStatus() != null) {
            UserStatus newStatus = parseUserStatus(request.getStatus());
            validateStatusChange(user, newStatus);
            user.setStatus(newStatus);
        }

        User updatedUser = userRepository.save(user);

        log.info("User updated successfully: {}", id);
        return userMapper.toUserResponse(updatedUser);
    }

    @Override
    public UserResponse updateCurrentUser(UserUpdateRequest request) {
        String user = SecurityUtils.getCurrentUserId();
        return updateUser(user, request);
    }

    @Override
    public UserResponse updateUserStatus(String id, String status) {
        User user = userRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        UserStatus userStatus = parseUserStatus(status);
        validateStatusChange(user, userStatus);

        user.setStatus(userStatus);
        User updateUser = userRepository.save(user);

        return userMapper.toUserResponse(updateUser);
    }

    @Override
    public void changePassword(ChangePasswordRequest request) {
        String currentId = SecurityUtils.getCurrentUserId();

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match");
        }

        User user = userRepository.findByIdAndDeletedAtIsNull(currentId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + currentId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Passwords do not match");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public UserResponse uploadAvatar(MultipartFile file) {
        return null;
    }

    @Override
    public UserResponse updateAvatar(String id, String avatarUrl) {
        User user = userRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        user.setAvatarUrl(avatarUrl);
        User updateUser = userRepository.save(user);
        return userMapper.toUserResponse(updateUser);
    }

    @Override
    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        validateUserDeletion(user);
        userRepository.delete(user);
    }

    @Override
    public void softDeleteUser(String id) {
        User user = userRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        validateUserDeletion(user);

        user.softDelete();
        userRepository.save(user);
    }

    @Override
    public UserResponse restoreUser(String id) {
        log.info("Restoring user: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.getDeletedAt() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "User is not deleted");
        }

        user.setDeletedAt(null);
        user.setStatus(UserStatus.ACTIVE);
        User restoredUser = userRepository.save(user);

        log.info("User restored successfully: {}", id);
        return userMapper.toUserResponse(restoredUser);
    }

    @Override
    public UserResponse assignRolesToUser(String userId, Set<Long> roleIds) {
        log.info("Assigning roles {} to user {}", roleIds, userId);

        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        Set<Role> roles = new HashSet<>(roleRepository.findAllById(roleIds));

        // Add new roles (avoid duplicates)
        user.getRoles().addAll(roles);

        User updatedUser = userRepository.save(user);
        log.info("Roles assigned to user {}", userId);
        return userMapper.toUserResponse(updatedUser);
    }

    @Override
    public UserResponse removeRolesFromUser(String userId, Set<Long> roleIds) {
        log.info("Removing roles {} from user {}", roleIds, userId);

        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        Set<Role> rolesToRemove = new HashSet<>(roleRepository.findAllById(roleIds));

        // Validate: ensure user doesn't lose all ADMIN roles if they are the only admin
        validateRoleRemoval(user, rolesToRemove);

        user.getRoles().removeAll(rolesToRemove);
        User updatedUser = userRepository.save(user);

        log.info("Roles removed from user {}", userId);
        return userMapper.toUserResponse(updatedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> getUserRoles(String userId) {
        log.debug("Fetching roles for user: {}", userId);

        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet());
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> getUserPermissions(String userId) {
        log.debug("Fetching permissions for user: {}", userId);

        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(Permission::getName)
                .distinct()
                .collect(Collectors.toSet());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean validateCurrentPassword(String password) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        User user = userRepository.findByIdAndDeletedAtIsNull(currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return passwordEncoder.matches(password, user.getPassword());
    }

    @Override
    public void changeStatus(String userId, String statusStr) {
        // 1. Tìm User
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 2. Validate và Convert Status String sang Enum
        try {
            UserStatus newStatus = UserStatus.valueOf(statusStr.toUpperCase());
            user.setStatus(newStatus);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_ENUM_VALUE); // Hoặc tạo lỗi INVALID_STATUS
        }

        // 3. Lưu lại
        userRepository.save(user);
    }

    // ============ HELPER METHODS ============

    private void validateUserCreation(UserCreationRequest request) {
        // Validate username format
        String validationMessage = UsernameValidator.getValidationMessage(request.getUsername());
        if (validationMessage != null) {
            throw new BadRequestException("Invalid username: " + validationMessage);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already registered");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username already taken");
        }

        if (request.getPhone() != null && !request.getPhone().isEmpty() &&
                userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("Phone number already registered");
        }
    }

    private void validateUserUpdate(UserUpdateRequest request, User user) {
        // Check if new email already exists (if being changed)
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email already registered");
            }
        }

        // Check if new phone already exists (if being changed)
        if (request.getPhone() != null && !request.getPhone().equals(user.getPhone())) {
            if (userRepository.existsByPhone(request.getPhone())) {
                throw new DuplicateResourceException("Phone number already registered");
            }
        }
    }

    private void validateStatusChange(User user, UserStatus newStatus) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        // Prevent users from banning themselves
        if (newStatus == UserStatus.BANNED && user.getId().equals(currentUserId)) {
            throw new BadRequestException("Cannot ban yourself");
        }
    }

    private UserStatus parseUserStatus(String status) {
        try {
            return UserStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status value: " + status);
        }
    }

    private void validateUserDeletion(User user) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        // Prevent users from deleting themselves
        if (user.getId().equals(currentUserId)) {
            throw new BadRequestException("Cannot delete your own account");
        }

        // Check if user has active homes (if owned)
        if (!user.getOwnedHomes().isEmpty()) {
            throw new BadRequestException("Cannot delete user with owned homes");
        }
    }

    private void validateRoleRemoval(User user, Set<Role> rolesToRemove) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        boolean removingAdminFromSelf = user.getId().equals(currentUserId) &&
                rolesToRemove.stream()
                        .anyMatch(role -> role.getName().name().equals("ADMIN"));

        if (removingAdminFromSelf) {
            // Check if this is the last ADMIN role
            long adminCount = user.getRoles().stream()
                    .filter(role -> role.getName().name().equals("ADMIN"))
                    .count();

            long removingAdminCount = rolesToRemove.stream()
                    .filter(role -> role.getName().name().equals("ADMIN"))
                    .count();

            if (adminCount <= removingAdminCount) {
                throw new BadRequestException("Cannot remove your last ADMIN role");
            }
        }
    }
}
