package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.HomeRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.HomeResponse;
import com.example.smart_home_system.dto.response.admin.RecentActivityResponse;
import com.example.smart_home_system.service.HomeService;
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

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(RequestApi.HOME)
@Tag(name = "03. Home Management", description = "APIs for managing homes")
@SecurityRequirement(name = "bearerAuth")
public class HomeController {

    private final HomeService homeService;

    // ==================== CREATE ====================
    @Operation(summary = "Create a new home", description = "Create a new smart home for the current user")
    @PostMapping(
            value = RequestApi.HOME_CREATE,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<HomeResponse>> createHome(@Valid @RequestBody HomeRequest request) {
        log.info("Creating new home: {}", request.getName());
        HomeResponse homeResponse = homeService.createHome(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Home created successfully", homeResponse));
    }

    // ==================== READ ====================
    @Operation(summary = "Get home by ID", description = "Get basic home details by ID.")
    @GetMapping(
            value = RequestApi.HOME_GET_BY_ID,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
//    @PreAuthorize("@homeService.isHomeMember(#homeId)")
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'HOME_VIEW')")
    public ResponseEntity<ApiResponse<HomeResponse>> getHomeById(@PathVariable("homeId") Long homeId) {
        log.debug("Getting home by ID: {}", homeId);
        HomeResponse homeResponse = homeService.getHomeById(homeId);
        return ResponseEntity.ok(ApiResponse.success("Home retrieved successfully", homeResponse));
    }

    @Operation(summary = "Get home with members", description = "Get home details including full member list.")
    @GetMapping(
            value = RequestApi.HOME_WITH_MEMBERS,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
//    @PreAuthorize("@homeService.isHomeMember(#homeId)")
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'MEMBER_VIEW')")
    public ResponseEntity<ApiResponse<HomeResponse>> getHomeWithMembers(@PathVariable("homeId") Long homeId) {
        log.debug("Getting home with members: {}", homeId);
        HomeResponse homeResponse = homeService.getHomeWithMembers(homeId);
        return ResponseEntity.ok(ApiResponse.success("Home details retrieved successfully", homeResponse));
    }

    @Operation(summary = "Get all homes of current user", description = "Get paginated list of all homes where the current user is a member")
    @GetMapping(
            value = RequestApi.HOME_MY_HOMES,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ApiResponse<Page<HomeResponse>>> getMyHomes(
            @Parameter(description = "Page number (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort by field", example = "createdAt")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC/DESC)", example = "DESC")
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        log.debug("Getting homes of current user - page: {}, size: {}, sortBy: {}", page, size, sortBy);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<HomeResponse> homes = homeService.getMyHomes(pageable);
        return ResponseEntity.ok(ApiResponse.success("Homes retrieved successfully", homes));
    }

    @Operation(summary = "Get all homes with pagination (Admin only)", description = "Get paginated list of all homes. Requires ADMIN role.")
    @GetMapping(
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<HomeResponse>>> getAllHomes(
            @Parameter(description = "Page number (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Page size", example = "20")
            @RequestParam(defaultValue = "20") int size,

            @Parameter(description = "Sort by field", example = "createdAt")
            @RequestParam(defaultValue = "createdAt") String sortBy,

            @Parameter(description = "Sort direction (ASC/DESC)", example = "DESC")
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        log.debug("Getting all homes - page: {}, size: {}, sortBy: {}", page, size, sortBy);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<HomeResponse> homes = homeService.getAllHomes(pageable);
        return ResponseEntity.ok(ApiResponse.success("All homes retrieved successfully", homes));
    }

    // ==================== UPDATE ====================
    @Operation(summary = "Update home", description = "Update home information. Only the owner can update the home.")
    @PutMapping(
            value = RequestApi.HOME_UPDATE,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'HOME_UPDATE')")
    public ResponseEntity<ApiResponse<HomeResponse>> updateHome(
            @PathVariable("homeId") Long homeId,
            @Valid @RequestBody HomeRequest request
    ) {
        log.info("Updating home with ID: {}", homeId);
        HomeResponse homeResponse = homeService.updateHome(homeId, request);
        return ResponseEntity.ok(ApiResponse.success("Home updated successfully", homeResponse));
    }

    @Operation(summary = "Transfer home ownership", description = "Transfer ownership to another member.")
    @PostMapping(
            value = RequestApi.HOME_TRANSFER_OWNERSHIP,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'HOME_TRANSFER_OWNERSHIP')")
    public ResponseEntity<ApiResponse<Void>> transferOwnership(
            @PathVariable("homeId") Long homeId,
            @Parameter(description = "ID of the new owner") @RequestParam String newOwnerId
    ) {
        log.info("Transferring ownership of home {} to user {}", homeId, newOwnerId);
        homeService.transferOwnership(homeId, newOwnerId);
        return ResponseEntity.ok(ApiResponse.success("Ownership transferred successfully"));
    }

    // ==================== DELETE / LEAVE ====================
    @Operation(summary = "Delete home", description = "Delete a home. Only the owner can delete the home.")
    @DeleteMapping(
            value = RequestApi.HOME_DELETE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'HOME_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteHome(@PathVariable("homeId") Long homeId) {
        log.info("Deleting home with ID: {}", homeId);
        homeService.deleteHome(homeId);
        return ResponseEntity.ok(ApiResponse.success("Home deleted successfully"));
    }

    @Operation(summary = "Leave home", description = "Leave a home as a member.")
    @PostMapping(
            value = RequestApi.HOME_LEAVE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasPermission(#homeId, 'HOME', 'HOME_VIEW')")
    public ResponseEntity<ApiResponse<Void>> leaveHome(@PathVariable("homeId") Long homeId) {
        log.info("User leaving home: {}", homeId);
        homeService.leaveHome(homeId);
        return ResponseEntity.ok(ApiResponse.success("Successfully left the home"));
    }

    // ==================== RECENT ACTIVITIES ====================
    @Operation(summary = "Get recent activities", description = "Get recent activity logs for a home")
    @GetMapping(
            value = "/{homeId}/recent-activities",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'HOME_LOGS_VIEW')")
    public ResponseEntity<ApiResponse<List<RecentActivityResponse>>> getRecentActivities(
            @Parameter(description = "Home ID", required = true, example = "1")
            @PathVariable("homeId") Long homeId,
            @Parameter(description = "Number of activities to retrieve", example = "10")
            @RequestParam(defaultValue = "10") int limit
    ) {
        log.debug("Getting recent activities for home: {}, limit: {}", homeId, limit);
        List<RecentActivityResponse> activities = homeService.getRecentActivities(homeId, limit);
        return ResponseEntity.ok(ApiResponse.success("Recent activities retrieved successfully", activities));
    }
}