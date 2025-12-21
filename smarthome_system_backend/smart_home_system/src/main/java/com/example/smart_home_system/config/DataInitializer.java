package com.example.smart_home_system.config;

import com.example.smart_home_system.entity.Role;
import com.example.smart_home_system.enums.RoleType;
import com.example.smart_home_system.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        initializeRoles();
    }

    private void initializeRoles() {
        if (roleRepository.count() == 0) {
            log.info("Initializing default roles...");

            Role adminRole = Role.builder()
                    .name(RoleType.ADMIN)
                    .description("Administrator role with full access")
                    .build();

            Role userRole = Role.builder()
                    .name(RoleType.USER)
                    .description("Regular user role with limited access")
                    .build();

            roleRepository.save(adminRole);
            roleRepository.save(userRole);

            log.info("Default roles initialized successfully");
        }
    }
}
