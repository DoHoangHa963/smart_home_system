package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.RoomRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.RoomResponse;
import com.example.smart_home_system.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(RequestApi.ROOM)
@Tag(name = "05. Room Management", description = "APIs for managing rooms in homes")
@SecurityRequirement(name = "bearerAuth")
public class RoomController {

    private final RoomService roomService;

    @Operation(
            summary = "Create a new room",
            description = "Create a new room in a home. Requires ADMIN or OWNER role in the home."
    )
    @PostMapping(
            value = RequestApi.ROOM_CREATE,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@homeService.hasHomePermission(#request.homeId, 'ADMIN')")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(
            @Valid @RequestBody RoomRequest request
    ) {
        log.info("Creating new room: {} in home {}", request.getName(), request.getHomeId());
        RoomResponse roomResponse = roomService.createRoom(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Room created successfully", roomResponse));
    }

    @Operation(
            summary = "Get room by ID",
            description = "Get room details by ID. User must be a member of the home."
    )
    @GetMapping(
            value = RequestApi.ROOM_GET_BY_ID,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@roomService.hasRoomAccess(#roomId)")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoomById(
            @PathVariable("roomId") Long roomId
    ) {
        log.debug("Getting room by ID: {}", roomId);
        RoomResponse roomResponse = roomService.getRoomById(roomId);

        return ResponseEntity.ok(ApiResponse.success("Room retrieved successfully", roomResponse));
    }

    @Operation(
            summary = "Update room",
            description = "Update room information. Requires ADMIN or OWNER role in the home."
    )
    @PutMapping(
            value = RequestApi.ROOM_UPDATE,
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@roomService.hasRoomWritePermission(#roomId)")
    public ResponseEntity<ApiResponse<RoomResponse>> updateRoom(
            @PathVariable("roomId") Long roomId,
            @Valid @RequestBody RoomRequest request
    ) {
        log.info("Updating room with ID: {}", roomId);
        RoomResponse roomResponse = roomService.updateRoom(roomId, request);

        return ResponseEntity.ok(ApiResponse.success("Room updated successfully", roomResponse));
    }

    @Operation(
            summary = "Delete room",
            description = "Delete a room. Requires ADMIN or OWNER role in the home."
    )
    @DeleteMapping(
            value = RequestApi.ROOM_DELETE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@roomService.hasRoomWritePermission(#roomId)")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable("roomId") Long roomId
    ) {
        log.info("Deleting room with ID: {}", roomId);
        roomService.deleteRoom(roomId);

        return ResponseEntity.ok(ApiResponse.success("Room deleted successfully"));
    }

    @Operation(
            summary = "Get rooms by home ID",
            description = "Get all rooms in a home. User must be a member of the home."
    )
    @GetMapping(
            value = RequestApi.ROOM_LIST_BY_HOME,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<Page<RoomResponse>>> getRoomsByHomeId(
            @PathVariable("homeId") Long homeId,
            @Parameter(description = "Pagination parameters")
            @PageableDefault(size = 20, sort = "name") Pageable pageable
    ) {
        log.debug("Getting rooms for home: {} with pageable: {}", homeId, pageable);
        Page<RoomResponse> rooms = roomService.getRoomsByHomeId(homeId, pageable);

        return ResponseEntity.ok(ApiResponse.success("Rooms retrieved successfully", rooms));
    }

    @Operation(
            summary = "Search rooms in home",
            description = "Search rooms by name in a home with pagination. User must be a member of the home."
    )
    @GetMapping(
            value = "/home/{homeId}/search",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<Page<RoomResponse>>> searchRooms(
            @PathVariable("homeId") Long homeId,
            @RequestParam(value = "name", required = false) String name,
            @Parameter(description = "Pagination parameters")
            @PageableDefault(size = 20, sort = "name") Pageable pageable
    ) {
        log.debug("Searching rooms in home: {}, name: {}", homeId, name);
        Page<RoomResponse> rooms = roomService.searchRooms(homeId, name, pageable);

        return ResponseEntity.ok(ApiResponse.success("Rooms retrieved successfully", rooms));
    }

    @Operation(
            summary = "Move device to room",
            description = "Move a device to a different room. Requires ADMIN or OWNER role in the home."
    )
    @PutMapping(
            value = RequestApi.ROOM_MOVE_DEVICE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@roomService.hasRoomWritePermission(#roomId) and @deviceService.hasDevicePermission(#deviceId, 'CONTROL')")
    public ResponseEntity<ApiResponse<Void>> moveDeviceToRoom(
            @PathVariable("roomId") Long roomId,
            @PathVariable("deviceId") Long deviceId
    ) {
        log.info("Moving device {} to room {}", deviceId, roomId);
        roomService.moveDeviceToRoom(roomId, deviceId);

        return ResponseEntity.ok(ApiResponse.success("Device moved successfully"));
    }

    @Operation(
            summary = "Get room statistics",
            description = "Get statistics for a room (device count, types, etc.)."
    )
    @GetMapping(
            value = "/{roomId}/statistics",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @PreAuthorize("@roomService.hasRoomAccess(#roomId)")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoomStatistics(
            @PathVariable("roomId") Long roomId
    ) {
        log.debug("Getting statistics for room: {}", roomId);
        RoomResponse roomResponse = roomService.getRoomWithStatistics(roomId);

        return ResponseEntity.ok(ApiResponse.success("Room statistics retrieved successfully", roomResponse));
    }
}