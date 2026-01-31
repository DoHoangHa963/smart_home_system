package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.CustomUserDetails;
import com.example.smart_home_system.dto.request.*;
import com.example.smart_home_system.dto.response.AuthResponse;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.entity.RefreshToken;
import com.example.smart_home_system.entity.Role;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.RoleType;
import com.example.smart_home_system.enums.UserStatus;
import com.example.smart_home_system.exception.*;
import com.example.smart_home_system.mapper.UserMapper;
import com.example.smart_home_system.repository.RoleRepository;
import com.example.smart_home_system.repository.UserRepository;
import com.example.smart_home_system.security.jwt.JwtTokenProvider;
import com.example.smart_home_system.service.AuthService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

/**
 * Implementation of {@link AuthService} for authentication and authorization operations.
 * 
 * <p>This service provides secure authentication mechanisms including:
 * <ul>
 *   <li>User registration with password hashing and role assignment</li>
 *   <li>Login with JWT token generation</li>
 *   <li>Token refresh for session management</li>
 *   <li>Profile updates and password changes</li>
 *   <li>Secure logout with token invalidation</li>
 * </ul>
 * 
 * <p><b>Security Implementation:</b>
 * <ul>
 *   <li>Passwords are hashed using BCrypt encoder</li>
 *   <li>JWT tokens are generated using RSA or HMAC algorithm</li>
 *   <li>Refresh tokens are stored in database for validation</li>
 *   <li>Account status is verified before allowing login</li>
 * </ul>
 * 
 * <p><b>Registration Process:</b>
 * <ol>
 *   <li>Validate username and email uniqueness</li>
 *   <li>Hash password with BCrypt</li>
 *   <li>Assign default USER role</li>
 *   <li>Generate JWT and refresh tokens</li>
 * </ol>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see AuthService
 * @see JwtTokenProvider
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;
    private final RefreshTokenService refreshTokenService;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username is already taken");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email is already taken");
        }

        User user = userMapper.toUser(request);

        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.ACTIVE);

        Role userRole = roleRepository.findByName(RoleType.USER)
                .orElseThrow(() -> new ResourceNotFoundException("Default USER role not found"));

        Set<Role> roles = new HashSet<>();
        roles.add(userRole);
        user.setRoles(roles);

        User savedUser = userRepository.save(user);

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = jwtTokenProvider.generateToken(authentication);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(savedUser.getId());

        return AuthResponse.builder()
                .accessToken(token)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .user(userMapper.toUserResponse(savedUser))
                .build();
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );
        } catch (Exception e) {
            throw new UnauthorizedException(ErrorCode.INVALID_CREDENTIALS);
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND.getMessage()));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException(ErrorCode.ACCOUNT_DISABLED);
        }

        String token = jwtTokenProvider.generateToken(authentication);

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(token)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .user(userMapper.toUserResponse(user))
                .build();
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken token = refreshTokenService.findByToken(request.getRefreshToken());

        token = refreshTokenService.verifyExpiration(token);

        User user = token.getUser();

        CustomUserDetails userDetails = new CustomUserDetails(user);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );

        String newAccessToken = jwtTokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(request.getRefreshToken())
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .user(userMapper.toUserResponse(user))
                .build();
    }

    @Override
    public UserResponse getCurrentUser() {
        String userId = getCurrentUserId();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND.getMessage()));

        return userMapper.toUserResponse(user);
    }

    @Override
    public UserResponse updateProfile(UpdateProfileRequest request) {
        String userId = getCurrentUserId();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND.getMessage()));

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email is already registered");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        User updatedUser = userRepository.save(user);

        return userMapper.toUserResponse(updatedUser);
    }

    @Override
    public void changePassword(ChangePasswordRequest request) throws BadRequestException {
        String userId = getCurrentUserId();

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException(ErrorCode.INVALID_CREDENTIALS.getMessage());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.USER_NOT_FOUND.getMessage()));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public void logout() {
        String userId = getCurrentUserId();
        refreshTokenService.deleteByUserId(userId);
        SecurityContextHolder.clearContext();
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails) {
            return ((CustomUserDetails) principal).getId();
        }

        throw new UnauthorizedException(ErrorCode.USER_NOT_FOUND);
    }
}
