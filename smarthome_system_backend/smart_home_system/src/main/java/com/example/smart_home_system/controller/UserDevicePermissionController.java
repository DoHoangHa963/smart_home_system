package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.UserDevicePermissionCreateRequest;
import com.example.smart_home_system.dto.request.UserDevicePermissionUpdateRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.UserDevicePermissionResponse;
import com.example.smart_home_system.service.UserDevicePermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(RequestApi.USER_DEVICE_PERMISSION)
@RequiredArgsConstructor
@Slf4j
public class UserDevicePermissionController {

    private final UserDevicePermissionService permissionService;

    @Operation(summary = "Assign permission", description = "Grant device access permissions to a user")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Permission assigned successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Permission already exists"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "User or Device not found")
    })
    @PostMapping(RequestApi.DEVICE_PERMISSION_ASSIGN)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER')")
    public ResponseEntity<ApiResponse<UserDevicePermissionResponse>> assignPermission(
            @Valid @RequestBody UserDevicePermissionCreateRequest request) {

        UserDevicePermissionResponse response = permissionService.assignPermission(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Permission assigned successfully", response));
    }

    @Operation(summary = "Update permission", description = "Update existing device access permissions")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Permission updated successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Permission not found")
    })
    @PutMapping(RequestApi.DEVICE_PERMISSION_UPDATE)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER')")
    public ResponseEntity<ApiResponse<UserDevicePermissionResponse>> updatePermission(
            @Parameter(description = "Permission ID", required = true)
            @PathVariable Long permissionId,
            @Valid @RequestBody UserDevicePermissionUpdateRequest request) {

        UserDevicePermissionResponse response = permissionService.updatePermission(permissionId, request);

        return ResponseEntity.ok(ApiResponse.success("Permission updated successfully", response));
    }

    @Operation(summary = "Revoke permission", description = "Remove device access permissions from a user")
    @DeleteMapping(RequestApi.DEVICE_PERMISSION_REVOKE)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER')")
    public ResponseEntity<ApiResponse<Void>> revokePermission(
            @Parameter(description = "Permission ID", required = true)
            @PathVariable Long permissionId) {

        permissionService.revokePermission(permissionId);

        return ResponseEntity.ok(ApiResponse.success("Permission revoked successfully", null));
    }

    @Operation(summary = "Get permissions by User", description = "List all device permissions granted to a specific user")
    @GetMapping(RequestApi.DEVICE_PERMISSION_BY_USER)
    @PreAuthorize("hasAnyRole('ADMIN') or #userId == authentication.name")
    public ResponseEntity<ApiResponse<List<UserDevicePermissionResponse>>> getPermissionsByUserId(
            @Parameter(description = "User ID", required = true)
            @PathVariable String userId) {

        List<UserDevicePermissionResponse> response = permissionService.getPermissionsByUserId(userId);

        return ResponseEntity.ok(ApiResponse.success("Permissions retrieved successfully", response));
    }

    @Operation(summary = "Get permissions by Device", description = "List all users who have access to a specific device")
    @GetMapping(RequestApi.DEVICE_PERMISSION_BY_DEVICE)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'READ')")
    public ResponseEntity<ApiResponse<List<UserDevicePermissionResponse>>> getPermissionsByDeviceId(
            @Parameter(description = "Device ID", required = true)
            @PathVariable Long deviceId) {

        List<UserDevicePermissionResponse> response = permissionService.getPermissionsByDeviceId(deviceId);

        return ResponseEntity.ok(ApiResponse.success("Permissions retrieved successfully", response));
    }

    @Operation(summary = "Get permission by ID", description = "Get detailed information of a specific permission record")
    @GetMapping(RequestApi.DEVICE_PERMISSION_GET_BY_ID)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER')")
    public ResponseEntity<ApiResponse<UserDevicePermissionResponse>> getPermissionById(
            @Parameter(description = "Permission ID", required = true)
            @PathVariable Long id) {

        UserDevicePermissionResponse response = permissionService.getPermissionById(id);

        return ResponseEntity.ok(ApiResponse.success("Permission retrieved successfully", response));
    }
}