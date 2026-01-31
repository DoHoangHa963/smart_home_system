package com.example.smart_home_system.security.mcu;

import com.example.smart_home_system.entity.MCUGateway;
import lombok.Getter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;
import java.util.List;

/**
 * Custom Spring Security Authentication object for MCU Gateway authentication.
 * 
 * <p>This authentication token is used in the SecurityContext when an ESP32 MCU Gateway
 * successfully authenticates using its API key via the {@link MCUApiKeyFilter}.
 * 
 * <p><b>Authentication Details:</b>
 * <ul>
 *   <li><b>Principal:</b> The {@link MCUGateway} entity representing the authenticated device</li>
 *   <li><b>Credentials:</b> The API key used for authentication</li>
 *   <li><b>Authorities:</b> {@code ROLE_MCU_GATEWAY} for role-based access control</li>
 * </ul>
 * 
 * <p><b>Usage:</b>
 * <pre>{@code
 * // In MCUApiKeyFilter
 * MCUAuthentication auth = new MCUAuthentication(apiKey, mcuGateway);
 * SecurityContextHolder.getContext().setAuthentication(auth);
 * 
 * // In service layer
 * MCUAuthentication auth = (MCUAuthentication) SecurityContextHolder.getContext().getAuthentication();
 * MCUGateway gateway = auth.getMcuGateway();
 * }</pre>
 * 
 * <p><b>Security Model:</b>
 * The {@code ROLE_MCU_GATEWAY} authority allows differentiation between user and device
 * authentication in security configurations using {@code hasRole('MCU_GATEWAY')}.
 * 
 * @author Smart Home System Team
 * @version 1.0
 * @since 2025-01-01
 * @see MCUApiKeyFilter
 * @see AbstractAuthenticationToken
 */
@Getter
public class MCUAuthentication extends AbstractAuthenticationToken {
    
    private final String apiKey;
    private final MCUGateway mcuGateway;
    
    public MCUAuthentication(String apiKey, MCUGateway mcuGateway) {
        super(getMCUAuthorities());
        this.apiKey = apiKey;
        this.mcuGateway = mcuGateway;
        setAuthenticated(true);
    }
    
    private static List<GrantedAuthority> getMCUAuthorities() {
        // MCU Gateway có role MCU_GATEWAY để phân biệt với user authentication
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_MCU_GATEWAY"));
    }
    
    // Note: getAuthorities() is already inherited from AbstractAuthenticationToken
    // We set it in the constructor via super(getMCUAuthorities())
    
    @Override
    public Object getCredentials() {
        return apiKey;
    }
    
    @Override
    public Object getPrincipal() {
        return mcuGateway;
    }
}
