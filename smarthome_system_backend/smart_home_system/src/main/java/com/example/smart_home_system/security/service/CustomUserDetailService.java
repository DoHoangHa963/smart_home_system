package com.example.smart_home_system.security.service;

import com.example.smart_home_system.dto.CustomUserDetails;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.transaction.annotation.Transactional;

/**
 * Custom implementation of Spring Security's {@link UserDetailsService}.
 * 
 * <p>This service provides user authentication details to Spring Security by:
 * <ul>
 *   <li>Loading user from database by username</li>
 *   <li>Converting User entity to {@link CustomUserDetails}</li>
 *   <li>Providing authorities (roles) for authorization</li>
 * </ul>
 * 
 * <p><b>Usage:</b>
 * This service is automatically used by Spring Security's authentication manager
 * when processing login requests.
 * 
 * <p><b>Transaction:</b>
 * Uses read-only transaction for database access optimization.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see CustomUserDetails
 * @see UserDetailsService
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads user details by username for Spring Security authentication.
     * 
     * @param username The username to search for
     * @return UserDetails containing user information and authorities
     * @throws UsernameNotFoundException if user is not found
     */
    @Override
    @Transactional(readOnly = true, timeout = 5) // Thêm timeout 5 giây để tránh giữ connection quá lâu
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found"));

        return new CustomUserDetails(user);
    }

}
