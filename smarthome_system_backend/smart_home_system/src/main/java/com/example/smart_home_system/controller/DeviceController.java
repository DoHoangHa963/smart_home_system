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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
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
    @PostMapping(RequestApi.DEVICE_CREATE)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#request.roomId, 'ROOM', 'WRITE')")
    public ResponseEntity<ApiResponse<DeviceResponse>> createDevice(
            @Valid @RequestBody DeviceCreateRequest request) {
        DeviceResponse deviceResponse = deviceService.createDevice(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Device has been created", deviceResponse));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'READ')")
    public ResponseEntity<ApiResponse<DeviceResponse>> getDeviceById(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId) {
        DeviceResponse response = deviceService.getDeviceById(deviceId);
        return ResponseEntity.ok(ApiResponse.success("Device retrieved successfully", response));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceCode, 'DEVICE', 'READ')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER')")
    public ResponseEntity<ApiResponse<List<DeviceListResponse>>> getAllDevices() {
        List<DeviceListResponse> devices = deviceService.getAllDevices();
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#roomId, 'ROOM', 'READ')")
    public ResponseEntity<ApiResponse<List<DeviceListResponse>>> getDevicesByRoom(
            @Parameter(description = "Room ID", required = true, example = "1")
            @PathVariable @NotBlank Long roomId) {

        List<DeviceListResponse> devices = deviceService.getDevicesByRoom(roomId);
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#homeId, 'HOME', 'READ')")
    public ResponseEntity<ApiResponse<List<DeviceListResponse>>> getDevicesByHome(
            @Parameter(description = "Home ID", required = true, example = "1")
            @PathVariable @NotBlank Long homeId) {
        List<DeviceListResponse> devices = deviceService.getDevicesByHome(homeId);
        return ResponseEntity.ok(ApiResponse.success("Devices retrieved successfully", devices));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'WRITE')")
    public ResponseEntity<ApiResponse<DeviceResponse>> updateDevice(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId,
            @Valid @RequestBody DeviceUpdateRequest request) {
        DeviceResponse response = deviceService.updateDevice(deviceId, request);
        return ResponseEntity.ok(ApiResponse.success("Device updated successfully", response));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteDevice(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId) {
        deviceService.deleteDevice(deviceId);
        return ResponseEntity.ok(ApiResponse.success("Device deleted successfully", null));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'WRITE')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'CONTROL')")
    public ResponseEntity<ApiResponse<Void>> sendCommand(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId,
            @Parameter(description = "Command to execute", required = true, example = "TURN_ON")
            @RequestParam @NotBlank String command,
            @RequestBody(required = false) Map<String, Object> payload) {
        log.info("Sending command to device {}: {}", deviceId, command);

        // Get device code first
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'CONTROL')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'CONTROL')")
    public ResponseEntity<ApiResponse<Void>> turnOffDevice(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId) {
        log.info("Turning off device: {}", deviceId);
        DeviceResponse device = deviceService.getDeviceById(deviceId);
        deviceService.sendCommandToDevice(device.getDeviceCode(), "TURN_OFF", null);
        return ResponseEntity.ok(ApiResponse.success("Device turned off", null));
    }

    @Operation(
            summary = "Toggle device state",
            description = "Toggle the on/off state of a device"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Device toggled successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Device not found"
            )
    })
    @PostMapping(RequestApi.DEVICE_TOGGLE)
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'CONTROL')")
    public ResponseEntity<ApiResponse<Void>> toggleDevice(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId) {
        log.info("Toggling device: {}", deviceId);
        DeviceResponse device = deviceService.getDeviceById(deviceId);
        deviceService.sendCommandToDevice(device.getDeviceCode(), "TOGGLE", null);
        return ResponseEntity.ok(ApiResponse.success("Device toggled", null));
    }

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
    public ResponseEntity<ApiResponse<List<DeviceListResponse>>> getDevicesByStatus(
            @Parameter(description = "Device status", required = true, example = "ONLINE")
            @PathVariable DeviceStatus status) {
        log.debug("Fetching devices with status: {}", status);
        List<DeviceListResponse> devices = deviceService.getDevicesByStatus(status);
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
        return ResponseEntity.ok(ApiResponse.success("Search functionality will be implemented", null));
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
        String stateJson = convertMapToJson(state);
        deviceService.updateDeviceState(deviceCode, stateJson);
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HOME_OWNER') or hasPermission(#deviceId, 'DEVICE', 'READ')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeviceStatistics(
            @Parameter(description = "Device ID", required = true, example = "1")
            @PathVariable Long deviceId) {
        log.debug("Fetching statistics for device: {}", deviceId);
        Map<String, Object> stats = Map.of(
                "deviceId", deviceId,
                "message", "Statistics functionality will be implemented"
        );
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