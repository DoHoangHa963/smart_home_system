package com.example.smart_home_system.service;

import com.example.smart_home_system.dto.request.*;
import com.example.smart_home_system.dto.response.AuthResponse;
import com.example.smart_home_system.dto.response.UserResponse;
import org.apache.coyote.BadRequestException;

/**
 * Service interface for authentication and authorization operations.
 * 
 * <p>This service provides secure authentication mechanisms including:
 * <ul>
 *   <li>User registration with automatic role assignment</li>
 *   <li>JWT-based login authentication</li>
 *   <li>Token refresh for session management</li>
 *   <li>Profile management and password changes</li>
 *   <li>Secure logout with token invalidation</li>
 * </ul>
 * 
 * <p><b>Authentication Flow:</b>
 * <ol>
 *   <li>User submits credentials (login) or registration data</li>
 *   <li>Server validates and generates JWT access token + refresh token</li>
 *   <li>Client uses access token for API requests</li>
 *   <li>When access token expires, client uses refresh token to get new one</li>
 *   <li>Logout invalidates all tokens for the user</li>
 * </ol>
 * 
 * <p><b>Security Features:</b>
 * <ul>
 *   <li>BCrypt password hashing</li>
 *   <li>JWT token with configurable expiration</li>
 *   <li>Refresh token rotation</li>
 *   <li>Account status verification (ACTIVE, BANNED, etc.)</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see AuthServiceImpl
 * @see RefreshTokenService
 */
public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    UserResponse getCurrentUser();
    UserResponse updateProfile(UpdateProfileRequest request);
    void changePassword(ChangePasswordRequest request) throws BadRequestException;
    void logout();
}
