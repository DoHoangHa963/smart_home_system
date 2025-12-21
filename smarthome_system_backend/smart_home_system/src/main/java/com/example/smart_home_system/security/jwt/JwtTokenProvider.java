package com.example.smart_home_system.security.jwt;

import com.example.smart_home_system.dto.CustomUserDetails;
import com.example.smart_home_system.security.service.CustomUserDetailService;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Component
@Slf4j
public class JwtTokenProvider {
    @Value("${jwt.secret}")
    private String SIGNER_KEY;

    @Value("${jwt.expiration}")
    private long EXPIRATION_TIME;

    public String generateToken(Authentication authentication) {
        CustomUserDetails userPrincipal = (CustomUserDetails) authentication.getPrincipal();

        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        String scope = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(" "));

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .subject(userPrincipal.getUsername())
                .issuer("smart-home-system")
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + (EXPIRATION_TIME * 1000)))
                .claim("scope", scope)
                .claim("userId", userPrincipal.getId())
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claimsSet);

        try {
            JWSSigner signer = new MACSigner(SIGNER_KEY.getBytes());
            signedJWT.sign(signer);
        } catch (JOSEException e) {
            log.error("Error signing JWT token", e);
            throw new RuntimeException("Cannot create JWT token", e);
        }

        return signedJWT.serialize();
    }

    public boolean validateToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes());

            if(!signedJWT.verify(verifier)) return false;

            Date expirationTime = signedJWT.getJWTClaimsSet().getExpirationTime();

            if (expirationTime == null || expirationTime.before(new Date())) return false;

            return true;
        } catch (ParseException e) {
            log.error("Invalid JWT token format");
        } catch (JOSEException e) {
            log.error("Error verifying JWT token");
        }
        return false;
    }

    public List<GrantedAuthority> getAuthoritiesFromToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            JWTClaimsSet claimsSet = signedJWT.getJWTClaimsSet();

            String scope = claimsSet.getStringClaim("scope");

            List<GrantedAuthority> authorities = new ArrayList<>();
            if (scope != null && !scope.isEmpty()) {
                String[] scopeArray = scope.split(" ");
                for (String role : scopeArray) {
                    if (!role.startsWith("ROLE_")) {
                        role = "ROLE_" + role;
                    }
                    authorities.add(new SimpleGrantedAuthority(role));
                }
            }
            return authorities;
        } catch (ParseException e) {
            log.error("Cannot parse JWT to get authorities", e);
            return new ArrayList<>();
        }
    }

    public String getUsernameFromToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            return signedJWT.getJWTClaimsSet().getSubject();
        } catch (ParseException e) {
            log.error("Cannot parse JWT to get username", e);
            return null;
        }
    }
}
