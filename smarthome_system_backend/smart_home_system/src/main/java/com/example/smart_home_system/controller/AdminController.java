package com.example.smart_home_system.controller;

import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.DeviceListResponse;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.dto.response.admin.AdminDashboardResponse;
import com.example.smart_home_system.service.implement.AdminServiceImpl;
import com.example.smart_home_system.service.ExcelExportService;
import com.example.smart_home_system.service.UserService;
import com.example.smart_home_system.service.implement.DeviceServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Dashboard", description = "System Administration")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminServiceImpl adminService;
    private final UserService userService;
    private final DeviceServiceImpl deviceService;
    private final ExcelExportService excelExportService;

    @Operation(summary = "Get Detailed Dashboard", description = "Returns comprehensive stats for admin dashboard widgets and charts")
    @GetMapping("/dashboard/detail")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> getDetailedDashboard() {
        return ResponseEntity.ok(ApiResponse.success(
                "Dashboard data retrieved successfully",
                adminService.getDetailedDashboard()
        ));
    }

    // 2. API Quản lý User
    @Operation(summary = "Get All Users", description = "Retrieve paginated list of all users")
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {

        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        return ResponseEntity.ok(ApiResponse.success("Users retrieved", userService.getAllUsers(pageable)));
    }

    // 3. API Quản lý Device (Global)
    @Operation(summary = "Get All Devices Global", description = "Retrieve all devices across all homes")
    @GetMapping("/devices")
    public ResponseEntity<ApiResponse<Page<DeviceListResponse>>> getAllDevicesGlobal(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ApiResponse.success("Global devices retrieved", deviceService.getAllDevices(pageable)));
    }

    // 4. API Khóa/Mở khóa User
    @Operation(summary = "Ban/Unban User")
    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<ApiResponse<Void>> changeUserStatus(
            @PathVariable String userId,
            @RequestParam String status) { // Client gửi lên "ACTIVE" hoặc "BANNED"
        userService.changeStatus(userId, status);
        return ResponseEntity.ok(ApiResponse.success("User status updated", null));
    }

    // 5. API Export Users to Excel
    @Operation(summary = "Export Users to Excel", description = "Export all users to Excel file")
    @GetMapping("/users/export/excel")
    public void exportUsersToExcel(HttpServletResponse response) throws IOException {
        // Get all users without pagination for export
        Pageable allPageable = PageRequest.of(0, Integer.MAX_VALUE, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserResponse> usersPage = userService.getAllUsers(allPageable);
        List<UserResponse> users = usersPage.getContent();
        
        excelExportService.exportUsersToExcel(users, response);
    }
}