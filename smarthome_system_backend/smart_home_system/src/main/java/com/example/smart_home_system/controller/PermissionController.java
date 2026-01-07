package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.PermissionRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.PermissionResponse;
import com.example.smart_home_system.service.PermissionService;
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
@RequestMapping(RequestApi.PERMISSION)
@RequiredArgsConstructor
@Slf4j
public class PermissionController {

    private final PermissionService permissionService;

    @Operation(summary = "Create a new permission", description = "Define a new system permission")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Permission created successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Permission already exists")
    })
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PermissionResponse>> createPermission(@Valid @RequestBody PermissionRequest request) {
        PermissionResponse response = permissionService.createPermission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Permission created successfully", response));
    }

    @Operation(summary = "Get all permissions", description = "Retrieve a list of all available permissions")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        List<PermissionResponse> permissions = permissionService.getAllPermissions();
        return ResponseEntity.ok(ApiResponse.success("Permissions retrieved successfully", permissions));
    }

    @Operation(summary = "Get permission by ID", description = "Retrieve a specific permission")
    @GetMapping(RequestApi.PERMISSION_GET_BY_ID)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PermissionResponse>> getPermissionById(
            @Parameter(description = "Permission ID", required = true)
            @PathVariable Long id) {
        PermissionResponse response = permissionService.getPermissionById(id);
        return ResponseEntity.ok(ApiResponse.success("Permission retrieved successfully", response));
    }

    @Operation(summary = "Delete a permission", description = "Remove a permission from the system")
    @DeleteMapping(RequestApi.PERMISSION_DELETE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePermission(
            @Parameter(description = "Permission ID", required = true)
            @PathVariable Long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok(ApiResponse.success("Permission deleted successfully", null));
    }
}