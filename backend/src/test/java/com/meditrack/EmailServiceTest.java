package com.meditrack;

import com.meditrack.notification.EmailService;
import com.meditrack.order.Order;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmailServiceTest {

    @Test
    @DisplayName("Verify EmailService builds and dispatches HTML email using JavaMailSender")
    void testEmailDispatchSuccess() {
        JavaMailSender mailSender = Mockito.mock(JavaMailSender.class);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        EmailService emailService = new EmailService(mailSender);

        Order order = new Order();
        order.setOrderNumber("MT-20261017-5555");
        order.setCustomerName("Anita Rao");
        order.setTotalAmount(780.0);

        emailService.sendOrderConfirmation(order, "anita@example.com");

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Verify EmailService handles absent JavaMailSender without crashing (graceful fallback)")
    void testEmailFallbackWhenUnconfigured() {
        // null mail sender represents production without SMTP server configured yet
        EmailService emailService = new EmailService(null);

        assertFalse(emailService.isConfigured());

        Order order = new Order();
        order.setOrderNumber("MT-20261017-7777");

        // Should not throw any exception
        assertDoesNotThrow(() -> {
            emailService.sendOrderConfirmation(order, "customer@example.com");
            emailService.sendPrescriptionStatusNotification("customer@example.com", "Patient", "APPROVED", "Clear scan");
            emailService.sendDeliveryOtpNotification("customer@example.com", "MT-7777", "9812");
        });
    }
}
