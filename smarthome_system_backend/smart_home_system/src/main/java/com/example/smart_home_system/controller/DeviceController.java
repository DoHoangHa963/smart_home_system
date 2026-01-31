package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.DeviceCreateRequest;
import com.example.smart_home_system.dto.request.DeviceUpdateRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.DeviceResponse;
import com.example.smart_home_system.enums.DeviceStatus;
import com.example.smart_home_system.service.implement.DeviceServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@Validated
@RequestMapping(RequestApi.DEVICE)
@RequiredArgsConstructor
@Slf4j
public class DeviceController {

    private final DeviceServiceImpl deviceService;

    @Operation(
            summary = "Create a new device",
            description = "Create a new smart home device with the provided details"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "Device created successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid input data"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "409",
                    description = "Device code already exists"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Room not found"
            )
    })
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#request.homeId, 'HOME', 'DEVICE_CREATE')")
    public ResponseEntity<ApiResponse<DeviceResponse>> createDevice(
            @Valid @RequestBody DeviceCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Device created successfully", deviceService.createDevice(request)));
    }

    @Operation(
            summary = "Get device by ID",
            description = "Retrieve detailed information of a specific device"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device retrieved successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @GetMapping(RequestApi.DEVICE_GET_BY_ID)
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#deviceId, 'DEVICE', 'DEVICE_VIEW')")
    public ResponseEntity<ApiResponse<DeviceResponse>> getDeviceById(@PathVariable Long deviceId) {
        return ResponseEntity.ok(ApiResponse.success("Device retrieved", deviceService.getDeviceById(deviceId)));
    }

    @Operation(
            summary = "Get device by code",
            description = "Retrieve device information by its unique device code"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device retrieved successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @GetMapping(RequestApi.DEVICE_GET_BY_CODE)
    @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<DeviceResponse>> getDeviceByCode(
            @Parameter(description = "Device unique code", required = true, example = "LIGHT_001")
            @PathVariable @NotBlank String deviceCode) {
        return ResponseEntity.ok(ApiResponse.success("Device retrieved successfully", deviceService.getDeviceByCode(deviceCode)));
    }

    @Operation(
            summary = "Get all devices",
            description = "Retrieve a list of all devices in the system"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Devices retrieved successfully"
            )
    })
    @GetMapping(RequestApi.DEVICE_LIST)
    @PreAuthorize("hasAnyRole('ADMIN', 'USER') or @homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<Page<DeviceListResponse>>> getAllDevices(
            @Parameter(description = "Page number (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "10")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort by field", example = "createdAt")
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction (ASC/DESC)", example = "DESC")
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<DeviceListResponse> devices = deviceService.getAllDevices(pageable);
        return ResponseEntity.ok(ApiResponse.success("Devices retrieved successfully", devices));
    }

    @Operation(
            summary = "Get devices by room",
            description = "Retrieve all devices in a specific room"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Devices retrieved successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Room not found"
            )
    })
    @GetMapping(RequestApi.DEVICE_LIST_BY_ROOM)
    @PreAuthorize("hasRole('ADMIN') or @houseSecurity.isMemberByRoomId(#roomId, authentication)")
    public ResponseEntity<ApiResponse<Page<DeviceListResponse>>> getDevicesByRoom(
            @Parameter(description = "Room ID", required = true, example = "1")
            @PathVariable Long roomId,
            @Parameter(description = "Page number (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "10")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort by field", example = "createdAt")
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction (ASC/DESC)", example = "DESC")
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<DeviceListResponse> devices = deviceService.getDevicesByRoom(roomId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Devices retrieved successfully", devices));
    }

    @Operation(
            summary = "Get devices by home",
            description = "Retrieve all devices in a specific home"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Devices retrieved successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Home not found"
            )
    })

    @GetMapping(RequestApi.DEVICE_LIST_BY_HOME)
    @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<Page<DeviceListResponse>>> getDevicesByHome(
            @PathVariable Long homeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {

        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(ApiResponse.success("Devices retrieved", deviceService.getDevicesByHome(homeId, pageable)));
    }

    @Operation(
            summary = "Update device information",
            description = "Update the details of an existing device"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device updated successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid input data"
            )
    })
    @PutMapping(RequestApi.DEVICE_UPDATE)
    @PreAuthorize("hasRole('ADMIN') or @deviceService.isDeviceOwner(#deviceId)")
    public ResponseEntity<ApiResponse<DeviceResponse>> updateDevice(
            @PathVariable Long deviceId,
            @Valid @RequestBody DeviceUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Device updated", deviceService.updateDevice(deviceId, request)));
    }

    @Operation(
            summary = "Delete a device",
            description = "Soft delete a device (mark as deleted)"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device deleted successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @DeleteMapping(RequestApi.DEVICE_DELETE)
    @PreAuthorize("hasRole('ADMIN') or @deviceService.isDeviceOwner(#deviceId) or hasPermission(#deviceId, 'DEVICE', 'DEVICE_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteDevice(@PathVariable Long deviceId) {
        deviceService.deleteDevice(deviceId);
        return ResponseEntity.ok(ApiResponse.success("Device deleted", null));
    }

    @Operation(
            summary = "Update device status",
            description = "Update the operational status of a device"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device status updated successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @PatchMapping(RequestApi.DEVICE_UPDATE_STATUS)
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#deviceId, 'DEVICE', 'DEVICE_UPDATE')")
    public ResponseEntity<ApiResponse<DeviceResponse>> updateDeviceStatus(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId,
            @Parameter(description = "New device status", required = true, example = "ONLINE")
            @RequestParam @NotNull DeviceStatus status) {
        DeviceResponse response = deviceService.updateDeviceStatus(deviceId, status);
        return ResponseEntity.ok(ApiResponse.success("Device status updated successfully", response));
    }

    @Operation(
            summary = "Send command to device",
            description = "Send a control command to a specific device"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Command sent successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Device is offline"
            )
    })
    @PostMapping("/{deviceId}/command")
    @PreAuthorize("hasRole('ADMIN') or @homeService.isHomeMember(#homeId)")
    public ResponseEntity<ApiResponse<Void>> sendCommand(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId,
            @Parameter(description = "Command to execute", required = true, example = "TURN_ON")
            @RequestParam @NotBlank String command,
            @RequestBody(required = false) Map<String, Object> payload) {
        log.info("Sending command to device {}: {}", deviceId, command);
        DeviceResponse device = deviceService.getDeviceById(deviceId);
        deviceService.sendCommandToDevice(device.getDeviceCode(), command, payload);
        return ResponseEntity.ok(ApiResponse.success("Command sent to device", null));
    }

    @Operation(
            summary = "Turn on device",
            description = "Send turn on command to a device"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device turned on successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @PostMapping(RequestApi.DEVICE_TURN_ON)
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#deviceId, 'DEVICE', 'DEVICE_CONTROL')")
    public ResponseEntity<ApiResponse<Void>> turnOnDevice(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId) {
        log.info("Turning on device: {}", deviceId);
        DeviceResponse device = deviceService.getDeviceById(deviceId);
        deviceService.sendCommandToDevice(device.getDeviceCode(), "TURN_ON", null);
        return ResponseEntity.ok(ApiResponse.success("Device turned on", null));
    }

    @Operation(
            summary = "Turn off device",
            description = "Send turn off command to a device"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device turned off successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @PostMapping(RequestApi.DEVICE_TURN_OFF)
    @PreAuthorize(value = "hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'DEVICE_CONTROL')")
    public ResponseEntity<ApiResponse<Void>> turnOffDevice(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId) {
        log.info("Turning off device: {}", deviceId);
        DeviceResponse device = deviceService.getDeviceById(deviceId);
        deviceService.sendCommandToDevice(device.getDeviceCode(), "TURN_OFF", null);
        return ResponseEntity.ok(ApiResponse.success("Device turned off", null));
    }

//    @Operation(
//            summary = "Toggle device state",
//            description = "Toggle the on/off state of a device"
//    )
//    @ApiResponses({
//            @io.swagger.v3.oas.annotations.responses.ApiResponse(
//                    responseCode = "200",
//                    description = "Device toggled successfully"
//            ),
//            @io.swagger.v3.oas.annotations.responses.ApiResponse(
//                    responseCode = "404",
//                    description = "Device not found"
//            )
//    })
//    @PostMapping(RequestApi.DEVICE_TOGGLE)
//    @PreAuthorize("hasRole('ADMIN') or @deviceService.isDeviceMember(#deviceId) or hasPermission(#deviceId, 'DEVICE', 'CONTROL')")
//    public ResponseEntity<ApiResponse<DeviceResponse>> toggleDevice(@PathVariable Long deviceId) {
//        return ResponseEntity.ok(ApiResponse.success("Device status toggled", deviceService.toggleDevice(deviceId)));
//    }

    @Operation(
            summary = "Get devices by status",
            description = "Retrieve devices filtered by their current status"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Devices retrieved successfully"
            )
    })
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER')")
    public ResponseEntity<ApiResponse<Page<DeviceListResponse>>> getDevicesByStatus(
            @Parameter(description = "Device status", required = true, example = "ONLINE")
            @PathVariable DeviceStatus status,
            @Parameter(description = "Page number (0-based)", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "10")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort by field", example = "createdAt")
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction (ASC/DESC)", example = "DESC")
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        log.debug("Fetching devices with status: {}", status);
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<DeviceListResponse> devices = deviceService.getDevicesByStatus(status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Devices retrieved successfully", devices));
    }

    @Operation(
            summary = "Search devices",
            description = "Search devices by name or code"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Devices retrieved successfully"
            )
    })
    @GetMapping(RequestApi.DEVICE_SEARCH)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER')")
    public ResponseEntity<ApiResponse<List<DeviceListResponse>>> searchDevices(
            @Parameter(description = "Search query", example = "light")
            @RequestParam(required = false) String query,
            @Parameter(description = "Device type", example = "LIGHT")
            @RequestParam(required = false) String deviceType,
            @Parameter(description = "Room ID", example = "1")
            @RequestParam(required = false) Long roomId) {
        log.debug("Searching devices with query: {}, type: {}, room: {}", query, deviceType, roomId);
        List<DeviceListResponse> devices = deviceService.searchDevices(query, deviceType, roomId);
        return ResponseEntity.ok(ApiResponse.success("Devices retrieved successfully", devices));
    }

    @Operation(
            summary = "Update device state",
            description = "Update the current state of a device (usually from device itself)"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device state updated successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @PostMapping("/{deviceCode}/state")
    public ResponseEntity<ApiResponse<Void>> updateDeviceState(
            @Parameter(description = "Device code", required = true, example = "LIGHT_001")
            @PathVariable String deviceCode,
            @RequestBody Map<String, Object> state) {
        log.info("Updating state for device {}: {}", deviceCode, state);
        deviceService.updateDeviceState(deviceCode, state);
        return ResponseEntity.ok(ApiResponse.success("Device state updated", null));
    }

    @Operation(
            summary = "Get device statistics",
            description = "Get usage statistics for a device"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Statistics retrieved successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @GetMapping(RequestApi.DEVICE_STATISTICS)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'DEVICE_VIEW')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeviceStatistics(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId) {
        log.debug("Fetching statistics for device: {}", deviceId);
        Map<String, Object> stats = deviceService.getDeviceStatistics(deviceId);
        return ResponseEntity.ok(ApiResponse.success("Statistics retrieved", stats));
    }

    private String convertMapToJson(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return "{}";
        }

        StringBuilder json = new StringBuilder("{");
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            json.append("\"").append(entry.getKey()).append("\":");
            if (entry.getValue() instanceof String) {
                json.append("\"").append(entry.getValue()).append("\"");
            } else {
                json.append(entry.getValue());
            }
            json.append(",");
        }
        json.deleteCharAt(json.length() - 1);
        json.append("}");

        return json.toString();
    }
}