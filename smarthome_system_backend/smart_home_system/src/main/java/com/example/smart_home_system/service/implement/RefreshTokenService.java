package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.entity.RefreshToken;
import com.example.smart_home_system.exception.GlobalExceptionHandler;
import com.example.smart_home_system.exception.ResourceNotFoundException;
import com.example.smart_home_system.repository.RefreshTokenRepository;
import com.example.smart_home_system.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Service for managing JWT Refresh Token lifecycle.
 * 
 * <p>This service handles refresh token operations including:
 * <ul>
 *   <li>Creating new refresh tokens on login</li>
 *   <li>Verifying token expiration</li>
 *   <li>Token rotation on refresh</li>
 *   <li>Token deletion on logout</li>
 * </ul>
 * 
 * <p><b>Token Lifecycle:</b>
 * <ol>
 *   <li>Token created on successful login</li>
 *   <li>Token used to refresh access token before expiry</li>
 *   <li>Token rotated (new UUID) on each refresh request</li>
 *   <li>Token deleted on logout or expiration</li>
 * </ol>
 * 
 * <p><b>Configuration:</b>
 * The refresh token duration is configured via {@code jwt.refreshable-duration}
 * property in application.yaml (default: 36000 seconds = 10 hours).
 * 
 * <p><b>Storage:</b>
 * Each user can have only one active refresh token at a time.
 * Creating a new token for a user replaces the existing one.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see AuthServiceImpl
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    /**
     * Refresh token validity duration in seconds, configured via application properties.
     */
    @Value("${jwt.refreshable-duration}")
    private Long refreshTokenDurationMs;

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    /**
     * Creates a new refresh token for the specified user.
     * 
     * <p>If the user already has a refresh token, it will be replaced with the new one.
     * The token is generated using UUID and has an expiry date based on configured duration.
     * 
     * @param userId The ID of the user to create token for
     * @return The created RefreshToken entity
     * @throws ResourceNotFoundException if user is not found
     */
    public RefreshToken createRefreshToken(String userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
                .orElse(new RefreshToken());

        refreshToken.setUser(user);
        refreshToken.setExpiryDate(Instant.now().plusSeconds(refreshTokenDurationMs));
        refreshToken.setToken(UUID.randomUUID().toString());

        return refreshTokenRepository.save(refreshToken);
    }

    /**
     * Verifies that a refresh token has not expired.
     * 
     * <p>If the token is expired, it is deleted from the database and an exception is thrown.
     * 
     * @param token The refresh token to verify
     * @return The same token if valid
     * @throws RuntimeException if token is expired
     */
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token was expired. Please make a new signin request");
        }
        return token;
    }

    /**
     * Finds a refresh token by its token string.
     * 
     * @param token The token string to search for
     * @return The RefreshToken entity
     * @throws RuntimeException if token is not found
     */
    public RefreshToken findByToken(String token) {
        return refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    /**
     * Deletes all refresh tokens for a specific user.
     * 
     * <p>Used during logout to invalidate all user sessions.
     * 
     * @param userId The ID of the user whose tokens should be deleted
     */
    @Transactional
    public void deleteByUserId(String userId) {
        userRepository.findById(userId).ifPresent(refreshTokenRepository::deleteByUser);
    }
}