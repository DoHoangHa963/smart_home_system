package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.AddMemberRequest;
import com.example.smart_home_system.dto.request.UpdatePermissionsRequest;
import com.example.smart_home_system.dto.request.UpdateRoleRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.HomeMemberResponse;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.HomePermission;
import com.example.smart_home_system.exception.ResourceNotFoundException;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.service.HomeMemberService;
import com.example.smart_home_system.service.HomePermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(RequestApi.HOME)
@Tag(name = "04. Home Member Management", description = "APIs for managing home members")
@SecurityRequirement(name = "bearerAuth")
public class HomeMemberController {

    private final HomeMemberService homeMemberService;
    private final HomePermissionService homePermissionService;
    private final UserRepository userRepository;

    @GetMapping("/{homeId}/members/me")
    @PreAuthorize("@homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<HomeMemberResponse>> getMyHomeMember(
            @PathVariable Long homeId,
            Authentication authentication
    ) {
        String username = authentication.getName();

        // Lấy userId từ username
        String userId = userRepository.findByUsername(username)
                .map(User::getId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        HomeMemberResponse member = homeMemberService.getMemberByHomeIdAndUserId(homeId, userId);

        return ResponseEntity.ok(ApiResponse.success("Member info retrieved", member));
    }

    @Operation(
            summary = "Get home members",
            description = "Get all members of a home. User must be a member of this home."
    )
    @GetMapping(
            value = RequestApi.HOME_MEMBERS,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<List<HomeMemberResponse>>> getHomeMembers(
            @PathVariable("homeId") Long homeId
    ) {
        log.debug("Getting members of home: {}", homeId);
        List<HomeMemberResponse> members = homeMemberService.getHomeMembers(homeId);

        return ResponseEntity.ok(ApiResponse.success("Home members retrieved successfully", members));
    }

    @Operation(
            summary = "Add member to home",
            description = "Add a new member to a home. Requires ADMIN or OWNER role in the home."
    )
    @PostMapping(
            value = RequestApi.HOME_ADD_MEMBER,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId) or @homeService.hasHomePermissionByName(#homeId, 'MEMBER_INVITE')")
    public ResponseEntity<ApiResponse<HomeMemberResponse>> addMember(
            @PathVariable("homeId") Long homeId,
            @Valid @RequestBody AddMemberRequest request
    ) {
        log.info("Adding member to home {} with identifier: {}", homeId, request.getIdentifier());
        HomeMemberResponse memberResponse = homeMemberService.addMember(homeId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Member added successfully", memberResponse));
    }

    @Operation(
            summary = "Remove member from home",
            description = "Remove a member from a home. Requires appropriate permissions based on roles."
    )
    @DeleteMapping(
            value = RequestApi.HOME_REMOVE_MEMBER,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeOwner(#homeId) or @homeService.hasHomePermissionByName(#homeId, 'MEMBER_REMOVE')")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable("homeId") Long homeId,
            @PathVariable("userId") String userId
    ) {
        log.info("Removing member {} from home {}", userId, homeId);
        homeMemberService.removeMember(homeId, userId);

        return ResponseEntity.ok(ApiResponse.success("Member removed successfully"));
    }

    @Operation(
            summary = "Update member role",
            description = "Update the role of a home member. Only OWNER can change roles."
    )
    @PutMapping(
            value = RequestApi.HOME_UPDATE_MEMBER_ROLE,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@homeService.isHomeOwner(#homeId)")
    public ResponseEntity<ApiResponse<HomeMemberResponse>> updateMemberRole(
            @PathVariable("homeId") Long homeId,
            @PathVariable("userId") String userId,
            @Valid @RequestBody UpdateRoleRequest request
    ) {
        log.info("Updating role for member {} in home {} to {}", userId, homeId, request.getNewRole());
        HomeMemberResponse memberResponse = homeMemberService.updateMemberRole(homeId, userId, request);

        return ResponseEntity.ok(ApiResponse.success("Member role updated successfully", memberResponse));
    }

    @Operation(
            summary = "Update member permissions",
            description = "Update custom permissions for a member. Only OWNER can update permissions."
    )
    @PutMapping(
            value = "/{homeId}/members/{userId}/permissions",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or @homePermissionService.isOwner(#homeId)")
    public ResponseEntity<ApiResponse<Void>> updatePermissions(
            @PathVariable("homeId") Long homeId,
            @PathVariable("userId") String userId,
            @Valid @RequestBody UpdatePermissionsRequest request
    ) {
        log.info("Updating permissions for member {} in home {}", userId, homeId);
        homePermissionService.updateMemberPermissions(homeId, userId, request.getPermissions());

        return ResponseEntity.ok(ApiResponse.success("Permissions updated successfully"));
    }

    @Operation(
            summary = "Get member permissions",
            description = "Get all permissions of a specific member in a home."
    )
    @GetMapping(
            value = "/{homeId}/members/{userId}/permissions",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("hasRole('ADMIN') or @homePermissionService.hasPermission(#homeId, T(com.example.smart_home_system.enums.HomePermission).MEMBER_VIEW)")
    public ResponseEntity<ApiResponse<Set<String>>> getMemberPermissions(
            @PathVariable("homeId") Long homeId,
            @PathVariable("userId") String userId
    ) {
        log.debug("Getting permissions for member {} in home {}", userId, homeId);
        Set<String> permissions = homePermissionService.getMemberPermissions(homeId, userId);

        return ResponseEntity.ok(ApiResponse.success("Permissions retrieved successfully", permissions));
    }

    @Operation(
            summary = "Get member details",
            description = "Get details of a specific member in a home."
    )
    @GetMapping(
            value = "/{homeId}/members/{userId}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<HomeMemberResponse>> getMember(
            @PathVariable("homeId") Long homeId,
            @PathVariable("userId") String userId
    ) {
        log.debug("Getting member {} from home {}", userId, homeId);
        // Implement this method in service if needed
        // Hiện tại trả về null, bạn có thể implement sau
        return ResponseEntity.ok(ApiResponse.success("Member details retrieved successfully", null));
    }

    @Operation(
            summary = "Check if user is home member",
            description = "Check if a user is a member of a specific home."
    )
    @GetMapping(
            value = "/{homeId}/members/check/{userId}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<Boolean>> checkMember(
            @PathVariable("homeId") Long homeId,
            @PathVariable("userId") String userId
    ) {
        log.debug("Checking if user {} is member of home {}", userId, homeId);
        boolean isMember = homeMemberService.isMember(homeId, userId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        isMember ? "User is a member" : "User is not a member",
                        isMember
                )
        );
    }
}