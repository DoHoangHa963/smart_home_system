package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.ChangePasswordRequest;
import com.example.smart_home_system.dto.request.LoginRequest;
import com.example.smart_home_system.dto.request.RegisterRequest;
import com.example.smart_home_system.dto.request.UpdateProfileRequest;
import com.example.smart_home_system.dto.response.AuthResponse;
import com.example.smart_home_system.dto.response.UserResponse;
import org.apache.coyote.BadRequestException;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    UserResponse getCurrentUser();
    UserResponse updateProfile(UpdateProfileRequest request);
    void changePassword(ChangePasswordRequest request) throws BadRequestException;
    void logout();
}
