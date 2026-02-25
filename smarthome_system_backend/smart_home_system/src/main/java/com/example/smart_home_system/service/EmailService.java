package com.example.smart_home_system.service;

/**
 * Service for sending emails (e.g. password reset OTP).
 */
public interface EmailService {

    /**
     * Send password reset OTP (6 digits) to the given email.
     * @param toEmail recipient email
     * @param code 6-digit OTP code
     */
    void sendPasswordResetOtp(String toEmail, String code);
}
