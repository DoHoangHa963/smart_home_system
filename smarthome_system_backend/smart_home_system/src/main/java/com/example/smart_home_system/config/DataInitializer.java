package com.example.smart_home_system.config;

import com.example.smart_home_system.entity.Role;
import com.example.smart_home_system.entity.User;
import com.example.smart_home_system.enums.RoleType;
import com.example.smart_home_system.enums.UserStatus;
import com.example.smart_home_system.repository.RoleRepository;
import com.example.smart_home_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        initializeRoles();
        initializeUsers();
    }

    private void initializeRoles() {
        if (roleRepository.count() == 0) {
            log.info("Dang khoi tao Roles...");
            Role adminRole = Role.builder().name(RoleType.ADMIN).description("Quan tri vien").build();
            Role userRole = Role.builder().name(RoleType.USER).description("Nguoi dung").build();
            roleRepository.save(adminRole);
            roleRepository.save(userRole);
        }
    }

    private void initializeUsers() {
        log.info("Dang kiem tra va khoi tao Users...");

        // 1. Tìm Role
        Role adminRole = roleRepository.findByName(RoleType.ADMIN)
                .orElseThrow(() -> new RuntimeException("Loi: Khong tim thay Role ADMIN"));
        Role userRole = roleRepository.findByName(RoleType.USER)
                .orElseThrow(() -> new RuntimeException("Loi: Khong tim thay Role USER"));

        // 2. Kiểm tra và tạo Admin nếu chưa có
        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@smarthome.com")
                    .password(passwordEncoder.encode("123456")) // Pass: 123456
                    .phone("0987654321")
                    .status(UserStatus.ACTIVE)
                    .roles(new HashSet<>(Set.of(adminRole)))
                    .build();
            userRepository.save(admin);
            log.info("Da tao user ADMIN (pass: 123456)");
        } else {
            log.info("User ADMIN da ton tai -> Bo qua.");
        }

        // 3. Kiểm tra và tạo User thường nếu chưa có
        if (!userRepository.existsByUsername("user")) {
            User user = User.builder()
                    .username("user")
                    .email("user@smarthome.com")
                    .password(passwordEncoder.encode("123456")) // Pass: 123456
                    .phone("0123456789")
                    .status(UserStatus.ACTIVE)
                    .roles(new HashSet<>(Set.of(userRole)))
                    .build();
            userRepository.save(user);
            log.info("Da tao user USER (pass: 123456)");
        } else {
            log.info("User USER da ton tai -> Bo qua.");
        }
    }
}