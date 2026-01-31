package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.EventLogResponse;
import com.example.smart_home_system.service.EventLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping(RequestApi.LOGS)
@Tag(name = "Event Logs", description = "APIs for viewing activity logs")
@SecurityRequirement(name = "bearerAuth")
public class EventLogController {

    private final EventLogService eventLogService;

    @Operation(
            summary = "Get event logs for a home",
            description = "Retrieve paginated event logs for a specific home with optional filters"
    )
    @GetMapping("/home/{homeId}")
    @PreAuthorize("hasRole('ADMIN') or hasPermission(#homeId, 'HOME', 'HOME_LOGS_VIEW')")
    public ResponseEntity<ApiResponse<Page<EventLogResponse>>> getLogsByHome(
            @Parameter(description = "Home ID", required = true)
            @PathVariable Long homeId,
            
            @Parameter(description = "Event type filter (e.g., DEVICE_CREATE, DEVICE_TURN_ON)")
            @RequestParam(required = false) String eventType,
            
            @Parameter(description = "Start date filter (format: yyyy-MM-dd HH:mm:ss)")
            @RequestParam(required = false) 
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startDate,
            
            @Parameter(description = "End date filter (format: yyyy-MM-dd HH:mm:ss)")
            @RequestParam(required = false) 
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endDate,
            
            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,
            
            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,
            
            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "createdAt") String sortBy,
            
            @Parameter(description = "Sort direction")
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        
        log.info("Getting logs for home {} with filters: eventType={}, startDate={}, endDate={}, page={}, size={}", 
                 homeId, eventType, startDate, endDate, page, size);
        
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<EventLogResponse> logs = eventLogService.getLogsByHome(homeId, eventType, startDate, endDate, pageable);
        
        return ResponseEntity.ok(ApiResponse.success("Event logs retrieved successfully", logs));
    }
}
