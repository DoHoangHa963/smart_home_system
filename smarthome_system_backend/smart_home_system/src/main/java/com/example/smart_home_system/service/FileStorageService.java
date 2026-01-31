package com.example.smart_home_system.service;

import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Service for handling file storage operations in the Smart Home System.
 * 
 * <p>This service provides file management capabilities including:
 * <ul>
 *   <li>File upload with automatic UUID naming</li>
 *   <li>File download by path</li>
 *   <li>File deletion</li>
 *   <li>Directory management</li>
 * </ul>
 * 
 * <p><b>File Organization:</b>
 * Files are stored in subdirectories based on their type:
 * <pre>
 * uploads/
 *   ├── avatars/     - User profile pictures
 *   ├── devices/     - Device images and icons
 *   └── homes/       - Home-related media
 * </pre>
 * 
 * <p><b>File Naming:</b>
 * Uploaded files are renamed using UUID to prevent conflicts:
 * {@code {uuid}.{original_extension}}
 * 
 * <p><b>Configuration:</b>
 * <ul>
 *   <li>{@code file.upload-dir} - Base directory for uploads (default: uploads)</li>
 *   <li>{@code app.base-url} - Base URL for generating file URLs</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 */
@Slf4j
@Service
public class FileStorageService {

    /**
     * Base directory for file uploads, configurable via application properties.
     */
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    /**
     * Base URL for the application, used to generate file access URLs.
     */
    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    /**
     * Uploads a file to the specified folder.
     * 
     * <p>The file is saved with a UUID-based filename to prevent naming conflicts.
     * The original file extension is preserved.
     * 
     * @param file The multipart file to upload
     * @param folder The subfolder to store the file in (e.g., "avatars", "devices")
     * @return The public URL where the file can be accessed
     * @throws AppException if file upload fails
     */
    public String uploadFile(MultipartFile file, String folder) {
        try {
            // Create directory if not exists
            Path uploadPath = Paths.get(uploadDir, folder);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String filename = UUID.randomUUID().toString() + fileExtension;
            Path filePath = uploadPath.resolve(filename);

            // Copy file to target location
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Return file URL
            return baseUrl + "/uploads/" + folder + "/" + filename;

        } catch (IOException e) {
            log.error("Failed to upload file: {}", e.getMessage());
            throw new AppException(ErrorCode.FILE_UPLOAD_ERROR, "Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Downloads a file from the storage.
     * 
     * @param folder The subfolder where the file is stored
     * @param filename The name of the file to download
     * @return The file contents as a byte array
     * @throws AppException if file is not found or read operation fails
     */
    public byte[] downloadFile(String folder, String filename) {
        try {
            Path filePath = Paths.get(uploadDir, folder, filename);
            if (!Files.exists(filePath)) {
                throw new AppException(ErrorCode.NOT_FOUND, "File not found: " + filename);
            }
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            log.error("Failed to download file: {}", e.getMessage());
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Failed to download file");
        }
    }

    /**
     * Deletes a file from the storage.
     * 
     * <p>This method silently succeeds if the file doesn't exist.
     * 
     * @param folder The subfolder where the file is stored
     * @param filename The name of the file to delete
     * @throws AppException if delete operation fails
     */
    public void deleteFile(String folder, String filename) {
        try {
            Path filePath = Paths.get(uploadDir, folder, filename);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
            }
        } catch (IOException e) {
            log.error("Failed to delete file: {}", e.getMessage());
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Failed to delete file");
        }
    }
}