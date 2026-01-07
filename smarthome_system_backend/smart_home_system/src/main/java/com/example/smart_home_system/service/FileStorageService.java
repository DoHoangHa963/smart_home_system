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

@Slf4j
@Service
public class FileStorageService {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

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