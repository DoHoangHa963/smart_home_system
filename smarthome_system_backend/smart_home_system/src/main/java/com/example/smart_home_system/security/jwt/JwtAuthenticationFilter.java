package com.example.smart_home_system.security.jwt;

import com.example.smart_home_system.security.service.CustomUserDetailService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.annotation.PreDestroy;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailService customUserDetailService;
    
    // Cache user details để tránh query DB mỗi request
    // Key: username, Value: UserDetails với timestamp
    private final ConcurrentHashMap<String, CachedUserDetails> userCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút
    private final ScheduledExecutorService cacheCleaner = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "jwt-user-cache-cleaner");
        t.setDaemon(true);
        return t;
    });
    
    {
        // Clean cache mỗi 1 phút
        cacheCleaner.scheduleAtFixedRate(this::cleanExpiredCache, 1, 1, TimeUnit.MINUTES);
    }
    
    private static class CachedUserDetails {
        final UserDetails userDetails;
        final long timestamp;
        
        CachedUserDetails(UserDetails userDetails) {
            this.userDetails = userDetails;
            this.timestamp = System.currentTimeMillis();
        }
        
        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS;
        }
    }
    
    private void cleanExpiredCache() {
        userCache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String token = getTokenFromRequest(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            String username = jwtTokenProvider.getUsernameFromToken(token);

            // Lấy user details từ cache hoặc load từ DB
            UserDetails userDetails = getUserDetailsFromCache(username);
            
            if (userDetails == null) {
                try {
                    // Load từ DB và cache lại
                    userDetails = customUserDetailService.loadUserByUsername(username);
                    userCache.put(username, new CachedUserDetails(userDetails));
                } catch (Exception e) {
                    log.error("Failed to load user details for username: {}", username, e);
                    // Nếu load thất bại, clear cache entry nếu có
                    userCache.remove(username);
                    filterChain.doFilter(request, response);
                    return;
                }
            }

            // Tạo Authentication object với Principal là userDetails (Object) chứ không phải username (String)
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
            );

            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
    
    private UserDetails getUserDetailsFromCache(String username) {
        CachedUserDetails cached = userCache.get(username);
        if (cached != null && !cached.isExpired()) {
            return cached.userDetails;
        }
        // Remove expired entry
        if (cached != null) {
            userCache.remove(username);
        }
        return null;
    }
    
    @PreDestroy
    public void destroy() {
        cacheCleaner.shutdown();
        try {
            if (!cacheCleaner.awaitTermination(5, TimeUnit.SECONDS)) {
                cacheCleaner.shutdownNow();
            }
        } catch (InterruptedException e) {
            cacheCleaner.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        // First, try to get token from Authorization header (standard way)
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        
        // Fallback: Check query parameter (for SSE connections where EventSource doesn't support custom headers)
        String tokenParam = request.getParameter("token");
        if (StringUtils.hasText(tokenParam)) {
            return tokenParam;
        }
        
        return null;
    }
}
