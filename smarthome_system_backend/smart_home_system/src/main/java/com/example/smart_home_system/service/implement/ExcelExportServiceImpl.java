package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.service.ExcelExportService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Implementation of {@link ExcelExportService} for generating Excel exports.
 * 
 * <p>This service uses Apache POI library to create properly formatted Excel files
 * with professional styling including:
 * <ul>
 *   <li>Bold headers with dark blue background</li>
 *   <li>Bordered cells for better readability</li>
 *   <li>Auto-sized columns with padding</li>
 *   <li>Centered alignment for headers</li>
 * </ul>
 * 
 * <p><b>Technical Details:</b>
 * <ul>
 *   <li>Uses XSSF workbook for .xlsx format (Excel 2007+)</li>
 *   <li>Streams directly to HTTP response for memory efficiency</li>
 *   <li>Generates unique filenames with timestamps</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see ExcelExportService
 */
@Slf4j
@Service
public class ExcelExportServiceImpl implements ExcelExportService {

    /**
     * Date formatter for Excel date columns
     */
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * {@inheritDoc}
     * 
     * <p>This implementation creates an Excel workbook with a single sheet named "Users"
     * containing all user data with formatted headers and auto-sized columns.
     */
    @Override
    public void exportUsersToExcel(List<UserResponse> users, HttpServletResponse response) throws IOException {
        log.info("Exporting {} users to Excel", users.size());

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Users");

            // Create header row style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 12);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Create data row style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Create header row
            Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "Tên đăng nhập", "Email", "Số điện thoại", "Vai trò", "Trạng thái", "Ngày tạo", "Ngày cập nhật"};
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Create data rows
            int rowNum = 1;
            for (UserResponse user : users) {
                Row row = sheet.createRow(rowNum++);
                
                createCell(row, 0, user.getId(), dataStyle);
                createCell(row, 1, user.getUsername(), dataStyle);
                createCell(row, 2, user.getEmail(), dataStyle);
                createCell(row, 3, user.getPhone() != null ? user.getPhone() : "", dataStyle);
                createCell(row, 4, String.join(", ", user.getRoles()), dataStyle);
                createCell(row, 5, user.getStatus().toString(), dataStyle);
                createCell(row, 6, user.getCreatedAt() != null ? user.getCreatedAt().format(DATE_FORMATTER) : "", dataStyle);
                createCell(row, 7, user.getUpdatedAt() != null ? user.getUpdatedAt().format(DATE_FORMATTER) : "", dataStyle);
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                // Add some padding
                sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1000);
            }

            // Set response headers
            String filename = "users_export_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".xlsx";
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");

            // Write workbook to response
            workbook.write(response.getOutputStream());
            response.getOutputStream().flush();
            
            log.info("Successfully exported {} users to Excel", users.size());
        }
    }

    /**
     * Creates a styled cell in the given row at the specified column.
     * 
     * @param row The row to create the cell in
     * @param column The column index (0-based)
     * @param value The string value to set (null values are converted to empty string)
     * @param style The cell style to apply
     */
    private void createCell(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

}
