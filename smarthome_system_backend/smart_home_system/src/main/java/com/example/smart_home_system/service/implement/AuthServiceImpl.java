package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.dto.CustomUserDetails;
import com.example.smart_home_system.dto.request.ChangePasswordRequest;
import com.example.smart_home_system.dto.request.LoginRequest;
import com.example.smart_home_system.dto.request.RegisterRequest;
import com.example.smart_home_system.dto.request.UpdateProfileRequest;
import com.example.smart_home_system.dto.response.AuthResponse;
import com.example.smart_home_system.dto.response.UserResponse;
import com.example.smart_home_system.entity.Role;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.RoleType;
import com.example.smart_home_system.enums.UserStatus;
import com.example.smart_home_system.exception.DuplicateResourceException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.exception.GlobalExceptionHandler;
import com.example.smart_home_system.exception.UnauthorizedException;
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

        Role userRole = roleRepository.findByName(RoleType.USER)
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException("Default USER role not found"));

        Set<Role> roles = new HashSet<>();
        roles.add(userRole);

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(roles)
                .email(request.getEmail())
                .phone(request.getPhone())
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = jwtTokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .accessToken(token)
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
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.USER_NOT_FOUND.getMessage()));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException(ErrorCode.ACCOUNT_DISABLED);
        }

        String token = jwtTokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .user(userMapper.toUserResponse(user))
                .build();
    }

    @Override
    public UserResponse getCurrentUser() {
        String userId = getCurrentUserId();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.USER_NOT_FOUND.getMessage()));

        return userMapper.toUserResponse(user);
    }

    @Override
    public UserResponse updateProfile(UpdateProfileRequest request) {
        String userId = getCurrentUserId();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.USER_NOT_FOUND.getMessage()));

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
                .orElseThrow(() -> new GlobalExceptionHandler.ResourceNotFoundException(ErrorCode.USER_NOT_FOUND.getMessage()));

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
