package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.response.UserResponse;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

/**
 * Service interface for exporting data to Excel files.
 * 
 * <p>This service provides functionality to export system data to Microsoft Excel format (.xlsx)
 * for reporting and administrative purposes.
 * 
 * <p><b>Supported Exports:</b>
 * <ul>
 *   <li>User list export - Exports all user information to Excel</li>
 * </ul>
 * 
 * <p><b>File Format:</b>
 * <ul>
 *   <li>Format: Microsoft Excel 2007+ (.xlsx)</li>
 *   <li>Library: Apache POI XSSF</li>
 *   <li>Filename pattern: {entity}_export_{timestamp}.xlsx</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see ExcelExportServiceImpl
 */
public interface ExcelExportService {
    
    /**
     * Exports a list of users to an Excel file and writes it to the HTTP response.
     * 
     * <p>The generated Excel file includes:
     * <ul>
     *   <li>User ID</li>
     *   <li>Username</li>
     *   <li>Email</li>
     *   <li>Phone number</li>
     *   <li>Roles</li>
     *   <li>Status</li>
     *   <li>Created date</li>
     *   <li>Updated date</li>
     * </ul>
     * 
     * <p><b>Response Headers:</b>
     * <ul>
     *   <li>Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet</li>
     *   <li>Content-Disposition: attachment; filename="users_export_{timestamp}.xlsx"</li>
     * </ul>
     * 
     * @param users List of {@link UserResponse} objects to export
     * @param response HTTP servlet response to write the Excel file to
     * @throws IOException if an error occurs while writing the file to the response
     */
    void exportUsersToExcel(List<UserResponse> users, HttpServletResponse response) throws IOException;
}
