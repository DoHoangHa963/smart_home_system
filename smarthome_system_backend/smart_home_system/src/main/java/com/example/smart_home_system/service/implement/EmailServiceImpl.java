package com.example.smart_home_system.service.implement;

import com.example.smart_home_system.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@Slf4j
public class EmailServiceImpl implements EmailService {

    private static final int OTP_VALID_MINUTES = 10;

    private final JavaMailSender mailSender;

    public EmailServiceImpl(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Override
    public void sendPasswordResetOtp(String toEmail, String code) {
        if (mailEnabled && mailSender != null && fromEmail != null && !fromEmail.isBlank()) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
                helper.setFrom(fromEmail);
                helper.setTo(toEmail);
                helper.setSubject("SmartHome – Mã xác thực đặt lại mật khẩu");
                helper.setText(buildPasswordResetHtml(code), true);
                mailSender.send(message);
                log.info("Password reset OTP email sent to {}", toEmail);
            } catch (MessagingException e) {
                log.warn("Failed to send password reset email to {}, logging code to console. Error: {}", toEmail, e.getMessage());
                log.info("[DEV] Password reset OTP for {}: {}", toEmail, code);
            }
        } else {
            log.info("[DEV] Mail not configured. Password reset OTP for {}: {}", toEmail, code);
        }
    }

    private String buildPasswordResetHtml(String code) {
        String html = """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mã xác thực SmartHome</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 32px 24px; text-align: center;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">SmartHome</h1>
                          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Đặt lại mật khẩu</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px 24px;">
                          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Xin chào,</p>
                          <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 1.6;">Bạn đã yêu cầu đặt lại mật khẩu. Sử dụng mã xác thực bên dưới trong ứng dụng SmartHome:</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td align="center" style="padding: 8px 0 24px;">
                                <span style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 8px; padding: 16px 28px; border-radius: 12px;">{{CODE}}</span>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Mã có hiệu lực trong <strong>{{MINUTES}} phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
                          <p style="margin: 0; color: #9ca3af; font-size: 13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 24px 28px; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">SmartHome – Hệ thống nhà thông minh</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
        return html.replace("{{CODE}}", code).replace("{{MINUTES}}", String.valueOf(OTP_VALID_MINUTES));
    }
}
