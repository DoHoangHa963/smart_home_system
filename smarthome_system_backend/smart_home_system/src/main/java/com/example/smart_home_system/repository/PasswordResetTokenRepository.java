package com.example.smart_home_system.repository;

import com.example.smart_home_system.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {

    Optional<PasswordResetToken> findByEmailAndCodeAndExpiresAtAfter(String email, String code, Instant now);

    void deleteByEmail(String email);

    void deleteByExpiresAtBefore(Instant instant);
}
