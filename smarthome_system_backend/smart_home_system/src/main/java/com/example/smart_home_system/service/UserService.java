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

/**
 * Service interface for comprehensive User management operations.
 * 
 * <p>This service provides complete user lifecycle management including:
 * <ul>
 *   <li>User CRUD operations</li>
 *   <li>User search and filtering</li>
 *   <li>Password management</li>
 *   <li>Avatar/profile picture management</li>
 *   <li>Role and permission assignment</li>
 *   <li>Account status management</li>
 * </ul>
 * 
 * <p><b>User Status Types:</b>
 * <ul>
 *   <li><b>ACTIVE</b> - Normal user with full access</li>
 *   <li><b>INACTIVE</b> - Deactivated account</li>
 *   <li><b>BANNED</b> - Permanently banned user</li>
 *   <li><b>PENDING</b> - Awaiting email verification</li>
 * </ul>
 * 
 * <p><b>Role Management:</b>
 * Users can have multiple system-level roles (USER, ADMIN) which are
 * different from home-level roles (OWNER, MEMBER, GUEST).
 * 
 * <p><b>Soft Delete:</b>
 * Users are soft-deleted by default to preserve audit trails and
 * can be restored by administrators.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see UserServiceImpl
 * @see AuthService
 */
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

    void changeStatus(String userId, String statusStr);
}