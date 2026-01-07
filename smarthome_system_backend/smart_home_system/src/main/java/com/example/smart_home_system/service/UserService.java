package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.ChangePasswordRequest;
import com.example.smart_home_system.dto.request.UserCreationRequest;
import com.example.smart_home_system.dto.request.UserUpdateRequest;
import com.example.smart_home_system.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

public interface UserService {

    // Create
    UserResponse createUser(UserCreationRequest request);

    // Read
    UserResponse getUserById(String id);
    UserResponse getUserByEmail(String email);
    UserResponse getUserByUsername(String username);
    UserResponse getCurrentUser();
    Page<UserResponse> getAllUsers(Pageable pageable);
    Page<UserResponse> searchUsers(String keyword, Pageable pageable);
    List<UserResponse> getUsersByStatus(String status);
    List<UserResponse> getUsersByHomeId(Long homeId);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    long countActiveUsers();

    // Update
    UserResponse updateUser(String id, UserUpdateRequest request);
    UserResponse updateCurrentUser(UserUpdateRequest request);
    UserResponse updateUserStatus(String id, String status);
    void changePassword(ChangePasswordRequest request);
    UserResponse uploadAvatar(MultipartFile file);
    UserResponse updateAvatar(String id, String avatarUrl);

    // Delete
    void deleteUser(String id);
    void softDeleteUser(String id);
    UserResponse restoreUser(String id);

    // Roles & Permissions
    UserResponse assignRolesToUser(String userId, Set<Long> roleIds);
    UserResponse removeRolesFromUser(String userId, Set<Long> roleIds);
    Set<String> getUserRoles(String userId);
    Set<String> getUserPermissions(String userId);

    // Validation
    boolean validateCurrentPassword(String password);
}