package com.example.smart_home_system.security.config;

import com.example.smart_home_system.constant.RequestApi;
import com.example.smart_home_system.security.jwt.JwtAuthenticationEntryPoint;
import com.example.smart_home_system.security.jwt.JwtAuthenticationFilter;
import com.example.smart_home_system.security.service.CustomPermissionEvaluator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthenticationProvider authenticationProvider;
    private final CustomPermissionEvaluator customPermissionEvaluator;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final WebConfig webConfig;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(webConfig.corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                RequestApi.AUTH + RequestApi.AUTH_LOGIN,
                                RequestApi.AUTH + RequestApi.AUTH_REGISTER,
                                RequestApi.AUTH + RequestApi.AUTH_VERIFY_EMAIL,
                                RequestApi.AUTH + RequestApi.AUTH_RESEND_VERIFICATION,
                                RequestApi.AUTH + RequestApi.AUTH_FORGOT_PASSWORD,
                                RequestApi.AUTH + RequestApi.AUTH_RESET_PASSWORD,
                                RequestApi.AUTH + RequestApi.AUTH_VERIFY_OTP,
                                RequestApi.AUTH + RequestApi.AUTH_REFRESH_TOKEN,
                                "v3/api-docs/**", "swagger-ui/**", "swagger-ui.html"
                        ).permitAll()

                        .requestMatchers(RequestApi.HEALTH + "/**").permitAll()
                        .requestMatchers(RequestApi.ADMIN + "/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, RequestApi.FILE + "/download/**").permitAll()
                        .requestMatchers("/api/v1/rooms/**").authenticated()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public MethodSecurityExpressionHandler methodSecurityExpressionHandler() {
        DefaultMethodSecurityExpressionHandler expressionHandler =
                new DefaultMethodSecurityExpressionHandler();
        expressionHandler.setPermissionEvaluator(customPermissionEvaluator);
        return expressionHandler;
    }
}

