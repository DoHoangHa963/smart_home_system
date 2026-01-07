package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.ChangePasswordRequest;
import com.example.smart_home_system.dto.request.UserCreationRequest;
import com.example.smart_home_system.dto.request.UserUpdateRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(RequestApi.USER)
@Tag(name = "02. User Management", description = "APIs for managing users")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    // ==================== CREATE ====================

    @Operation(
            summary = "Create a new user (Admin only)",
            description = "Create a new user with the provided information. Requires ADMIN role."
    )
    @PostMapping(
            value = "",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody UserCreationRequest request
    ) {
        log.info("Creating new user with email: {}", request.getEmail());
        UserResponse userResponse = userService.createUser(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created successfully", userResponse));
    }

    // ==================== READ ====================

    @Operation(
            summary = "Get current user profile",
            description = "Get the profile information of the currently authenticated user."
    )
    @GetMapping(
            value = RequestApi.USER_ME,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        log.debug("Getting current user profile");
        UserResponse userResponse = userService.getCurrentUser();

        return ResponseEntity.ok(ApiResponse.success("User profile retrieved successfully", userResponse));
    }

    @Operation(
            summary = "Get user by ID",
            description = "Get user details by user ID. Requires ADMIN role or being the user themselves."
    )
    @GetMapping(
            value = RequestApi.USER_GET_BY_ID,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(
            @PathVariable("userId") String userId
    ) {
        log.debug("Getting user by ID: {}", userId);
        UserResponse userResponse = userService.getUserById(userId);

        return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", userResponse));
    }

    @Operation(
            summary = "Get all users with pagination (Admin only)",
            description = "Get paginated list of all users. Requires ADMIN role."
    )
    @GetMapping(
            value = RequestApi.USER_LIST,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @Parameter(description = "Page number (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort by field", example = "createdAt")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC/DESC)", example = "DESC")
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        log.debug("Getting all users - page: {}, size: {}, sortBy: {}", page, size, sortBy);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<UserResponse> users = userService.getAllUsers(pageable);

        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }

    @Operation(
            summary = "Search users (Admin only)",
            description = "Search users by keyword. Requires ADMIN role."
    )
    @GetMapping(
            value = RequestApi.USER_SEARCH,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> searchUsers(
            @Parameter(description = "Search keyword")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Page number (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort by field", example = "createdAt")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC/DESC)", example = "DESC")
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        log.debug("Searching users with keyword: {}", keyword);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<UserResponse> users = userService.searchUsers(keyword, pageable);

        return ResponseEntity.ok(ApiResponse.success("Users search completed successfully", users));
    }

    @Operation(
            summary = "Get users by status (Admin only)",
            description = "Get list of users filtered by status. Requires ADMIN role."
    )
    @GetMapping(
            value = "/by-status/{status}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsersByStatus(
            @PathVariable("status") String status
    ) {
        log.debug("Getting users by status: {}", status);
        List<UserResponse> users = userService.getUsersByStatus(status);

        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }

    // ==================== UPDATE ====================

    @Operation(
            summary = "Update current user profile",
            description = "Update the profile of the currently authenticated user."
    )
    @PutMapping(
            value = RequestApi.USER_UPDATE_PROFILE,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUser(
            @Valid @RequestBody UserUpdateRequest request
    ) {
        log.info("Updating current user profile");
        UserResponse userResponse = userService.updateCurrentUser(request);

        return ResponseEntity.ok(ApiResponse.success("User profile updated successfully", userResponse));
    }

    @Operation(
            summary = "Update user by ID (Admin only)",
            description = "Update user details by user ID. Requires ADMIN role."
    )
    @PutMapping(
            value = RequestApi.USER_UPDATE,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable("userId") String userId,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        log.info("Updating user with ID: {}", userId);
        UserResponse userResponse = userService.updateUser(userId, request);

        return ResponseEntity.ok(ApiResponse.success("User updated successfully", userResponse));
    }

    @Operation(
            summary = "Change user password",
            description = "Change the password of the currently authenticated user."
    )
    @PutMapping(
            value = RequestApi.AUTH_CHANGE_PASSWORD,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        log.info("Changing user password");
        userService.changePassword(request);

        return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
    }

    @Operation(
            summary = "Update user status (Admin only)",
            description = "Update the status of a user (ACTIVE, INACTIVE, BANNED). Requires ADMIN role."
    )
    @PutMapping(
            value = RequestApi.USER_CHANGE_STATUS,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable("userId") String userId,
            @RequestBody Map<String, String> requestBody
    ) {
        String status = requestBody.get("status");
        log.info("Updating status for user {} to {}", userId, status);
        UserResponse userResponse = userService.updateUserStatus(userId, status);

        return ResponseEntity.ok(ApiResponse.success("User status updated successfully", userResponse));
    }

    @Operation(
            summary = "Upload user avatar",
            description = "Upload or update avatar for the current user."
    )
    @PostMapping(
            value = RequestApi.USER_UPLOAD_AVATAR,
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<UserResponse>> uploadAvatar(
            @RequestParam("file") MultipartFile file
    ) {
        log.info("Uploading avatar for current user");

        // Validate file
        if (file.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "File is empty");
        }

        // Check file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Only image files are allowed");
        }

        // Check file size (max 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new AppException(ErrorCode.BAD_REQUEST, "File size exceeds 5MB limit");
        }

        UserResponse userResponse = userService.uploadAvatar(file);

        return ResponseEntity.ok(ApiResponse.success("Avatar uploaded successfully", userResponse));
    }

    // ==================== DELETE ====================

    @Operation(
            summary = "Delete user by ID (Admin only)",
            description = "Delete a user by ID. Requires ADMIN role."
    )
    @DeleteMapping(
            value = RequestApi.USER_DELETE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable("userId") String userId
    ) {
        log.info("Deleting user with ID: {}", userId);
        userService.deleteUser(userId);

        return ResponseEntity.ok(ApiResponse.success("User deleted successfully"));
    }

    @Operation(
            summary = "Soft delete user by ID (Admin only)",
            description = "Soft delete a user by ID (mark as deleted). Requires ADMIN role."
    )
    @DeleteMapping(
            value = "/{userId}/soft",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> softDeleteUser(
            @PathVariable("userId") String userId
    ) {
        log.info("Soft deleting user with ID: {}", userId);
        userService.softDeleteUser(userId);

        return ResponseEntity.ok(ApiResponse.success("User soft deleted successfully"));
    }

    @Operation(
            summary = "Restore soft-deleted user (Admin only)",
            description = "Restore a soft-deleted user by ID. Requires ADMIN role."
    )
    @PutMapping(
            value = "/{userId}/restore",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> restoreUser(
            @PathVariable("userId") String userId
    ) {
        log.info("Restoring user with ID: {}", userId);
        UserResponse userResponse = userService.restoreUser(userId);

        return ResponseEntity.ok(ApiResponse.success("User restored successfully", userResponse));
    }

    // ==================== ROLES & PERMISSIONS ====================

    @Operation(
            summary = "Get user roles (Admin only)",
            description = "Get all roles assigned to a user. Requires ADMIN role."
    )
    @GetMapping(
            value = RequestApi.USER_ROLES,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Set<String>>> getUserRoles(
            @PathVariable("userId") String userId
    ) {
        log.debug("Getting roles for user: {}", userId);
        Set<String> roles = userService.getUserRoles(userId);

        return ResponseEntity.ok(ApiResponse.success("User roles retrieved successfully", roles));
    }

    @Operation(
            summary = "Get user permissions",
            description = "Get all permissions assigned to a user (combined from all roles)."
    )
    @GetMapping(
            value = "/{userId}/permissions",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
    public ResponseEntity<ApiResponse<Set<String>>> getUserPermissions(
            @PathVariable("userId") String userId
    ) {
        log.debug("Getting permissions for user: {}", userId);
        Set<String> permissions = userService.getUserPermissions(userId);

        return ResponseEntity.ok(ApiResponse.success("User permissions retrieved successfully", permissions));
    }

    @Operation(
            summary = "Assign roles to user (Admin only)",
            description = "Assign multiple roles to a user. Requires ADMIN role."
    )
    @PostMapping(
            value = "/{userId}/assign-roles",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> assignRolesToUser(
            @PathVariable("userId") String userId,
            @RequestBody Set<Long> roleIds
    ) {
        log.info("Assigning roles {} to user {}", roleIds, userId);
        UserResponse userResponse = userService.assignRolesToUser(userId, roleIds);

        return ResponseEntity.ok(ApiResponse.success("Roles assigned successfully", userResponse));
    }

    @Operation(
            summary = "Remove roles from user (Admin only)",
            description = "Remove multiple roles from a user. Requires ADMIN role."
    )
    @DeleteMapping(
            value = "/{userId}/remove-roles",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> removeRolesFromUser(
            @PathVariable("userId") String userId,
            @RequestBody Set<Long> roleIds
    ) {
        log.info("Removing roles {} from user {}", roleIds, userId);
        UserResponse userResponse = userService.removeRolesFromUser(userId, roleIds);

        return ResponseEntity.ok(ApiResponse.success("Roles removed successfully", userResponse));
    }

    // ==================== VALIDATION ====================

    @Operation(
            summary = "Check if email exists",
            description = "Check if an email address is already registered. Public endpoint."
    )
    @GetMapping(
            value = "/check-email/{email}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<Boolean>> checkEmailExists(
            @PathVariable("email") String email
    ) {
        log.debug("Checking if email exists: {}", email);
        boolean exists = userService.existsByEmail(email);

        return ResponseEntity.ok(
                ApiResponse.success(
                        exists ? "Email already exists" : "Email is available",
                        exists
                )
        );
    }

    @Operation(
            summary = "Check if username exists",
            description = "Check if a username is already taken. Public endpoint."
    )
    @GetMapping(
            value = "/check-username/{username}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<Boolean>> checkUsernameExists(
            @PathVariable("username") String username
    ) {
        log.debug("Checking if username exists: {}", username);
        boolean exists = userService.existsByUsername(username);

        return ResponseEntity.ok(
                ApiResponse.success(
                        exists ? "Username already taken" : "Username is available",
                        exists
                )
        );
    }

    @Operation(
            summary = "Get active users count (Admin only)",
            description = "Get the count of active (non-deleted) users. Requires ADMIN role."
    )
    @GetMapping(
            value = "/count/active",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> getActiveUsersCount() {
        log.debug("Getting active users count");
        long count = userService.countActiveUsers();

        return ResponseEntity.ok(ApiResponse.success("Active users count retrieved", count));
    }

    // ==================== UTILITY ====================

    @Operation(
            summary = "Validate current password",
            description = "Validate if the provided password matches the current user's password."
    )
    @PostMapping(
            value = "/validate-password",
            consumes = MediaType.TEXT_PLAIN_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<Boolean>> validateCurrentPassword(
            @RequestBody String password
    ) {
        log.debug("Validating current password");
        boolean isValid = userService.validateCurrentPassword(password);

        return ResponseEntity.ok(
                ApiResponse.success(
                        isValid ? "Password is valid" : "Password is incorrect",
                        isValid
                )
        );
    }

    @Operation(
            summary = "Get users by home ID",
            description = "Get all users who are members of a specific home. Requires ADMIN or HOME_MEMBER role."
    )
    @GetMapping(
            value = "/by-home/{homeId}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsersByHomeId(
            @PathVariable("homeId") Long homeId
    ) {
        log.debug("Getting users by home ID: {}", homeId);
        List<UserResponse> users = userService.getUsersByHomeId(homeId);

        return ResponseEntity.ok(ApiResponse.success("Home members retrieved successfully", users));
    }
}