package com.example.smart_home_system.security.mcu;

import com.example.smart_home_system.entity.MCUGateway;
import com.example.smart_home_system.exception.AppException;
import com.example.smart_home_system.exception.ErrorCode;
import com.example.smart_home_system.repository.MCUGatewayRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Spring Security Filter for authenticating ESP32 MCU Gateways using API Keys.
 * 
 * <p>This filter intercepts requests to MCU endpoints ({@code /api/v1/mcu/*}) and
 * validates the API key provided in the {@code X-MCU-API-Key} header.
 * 
 * <p><b>Authentication Flow:</b>
 * <ol>
 *   <li>Check if request path starts with MCU API prefix</li>
 *   <li>Extract API key from header (or query parameter as fallback)</li>
 *   <li>Validate API key against database</li>
 *   <li>Create {@link MCUAuthentication} and set in SecurityContext</li>
 * </ol>
 * 
 * <p><b>Filter Order:</b>
 * This filter runs before {@code JwtAuthenticationFilter} to prioritize API key
 * authentication for MCU endpoints. Non-MCU endpoints are skipped.
 * 
 * <p><b>Headers:</b>
 * <ul>
 *   <li>{@code X-MCU-API-Key}: Primary authentication header</li>
 *   <li>{@code apiKey} query parameter: Fallback authentication method</li>
 * </ul>
 * 
 * <p><b>Security Considerations:</b>
 * <ul>
 *   <li>API keys are validated against the database on each request</li>
 *   <li>Invalid API keys are logged but don't block the request (handled by security config)</li>
 *   <li>Pairing requests (without API key) are passed to JWT authentication</li>
 * </ul>
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUAuthentication
 * @see MCUGatewayRepository
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MCUApiKeyFilter extends OncePerRequestFilter {

    private static final String MCU_API_KEY_HEADER = "X-MCU-API-Key";
    private static final String MCU_API_PATH_PREFIX = "/api/v1/mcu/";

    private final MCUGatewayRepository mcuGatewayRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String requestPath = request.getRequestURI();
        
        // Chỉ xử lý các request đến MCU endpoints
        if (requestPath.startsWith(MCU_API_PATH_PREFIX)) {
            String apiKey = getApiKeyFromRequest(request);
            
            if (StringUtils.hasText(apiKey)) {
                try {
                    // Verify API Key và lấy MCU Gateway
                    MCUGateway mcuGateway = mcuGatewayRepository.findByApiKey(apiKey)
                            .orElseThrow(() -> new AppException(ErrorCode.MCU_INVALID_API_KEY));

                    // Tạo MCUAuthentication và set vào SecurityContext
                    MCUAuthentication authentication = new MCUAuthentication(apiKey, mcuGateway);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    log.debug("MCU Gateway authenticated: serialNumber={}, homeId={}", 
                            mcuGateway.getSerialNumber(), 
                            mcuGateway.getHome() != null ? mcuGateway.getHome().getId() : "null");
                    
                } catch (AppException e) {
                    log.warn("Invalid MCU API Key: {}", apiKey);
                    // Let it pass through to be handled by exception handler
                }
            } else {
                // Không có API Key trong request đến MCU endpoints
                // Có thể là pairing request (chưa có API Key), để JWT filter xử lý
                log.debug("No MCU API Key found for request: {}", requestPath);
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extract API Key từ header X-MCU-API-Key
     */
    private String getApiKeyFromRequest(HttpServletRequest request) {
        String apiKey = request.getHeader(MCU_API_KEY_HEADER);
        
        // Cũng có thể check query parameter như fallback (optional)
        if (!StringUtils.hasText(apiKey)) {
            apiKey = request.getParameter("apiKey");
        }
        
        return apiKey;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Chỉ filter các request đến MCU endpoints
        String path = request.getRequestURI();
        return !path.startsWith(MCU_API_PATH_PREFIX);
    }
}
