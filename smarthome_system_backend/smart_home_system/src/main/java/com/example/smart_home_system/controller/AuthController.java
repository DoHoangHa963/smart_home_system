package com.example.smart_home_system.controller;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.dto.request.ChangePasswordRequest;
import com.example.smart_home_system.dto.request.LoginRequest;
import com.example.smart_home_system.dto.request.RegisterRequest;
import com.example.smart_home_system.dto.request.UpdateProfileRequest;
import com.example.smart_home_system.dto.response.ApiResponse;
import com.example.smart_home_system.dto.response.AuthResponse;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.service.implement.AuthServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.BadRequestException;
import org.apache.coyote.Response;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping(RequestApi.AUTH)
@RequiredArgsConstructor
public class AuthController {
    private final AuthServiceImpl authService;

    @PostMapping(value = RequestApi.AUTH_REGISTER)
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse authResponse = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", authResponse));
    }

    @PostMapping(value = RequestApi.AUTH_LOGIN)
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse loginRequest = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", loginRequest));
    }

    @GetMapping(value = RequestApi.USER_ME)
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        UserResponse user = authService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success("User create successfully",user));
    }

    @PutMapping(value = RequestApi.USER_UPDATE_PROFILE)
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse user = authService.updateProfile(request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", user));
    }

    @PutMapping(value = RequestApi.AUTH_CHANGE_PASSWORD)
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) throws BadRequestException {
        authService.changePassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    @PostMapping(value = RequestApi.AUTH_LOGOUT)
    public ResponseEntity<ApiResponse<Void>> logout() {
        authService.logout();
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }
}
