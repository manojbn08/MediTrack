package com.meditrack.notification;

import com.meditrack.order.Order;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${meditrack.mail.from:noreply@meditrack.com}")
    private String fromAddress = "noreply@meditrack.com";

    @Value("${meditrack.mail.enabled:false}")
    private boolean mailEnabled;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean isConfigured() {
        return mailSender != null && mailEnabled;
    }

    @Async
    public void sendSignupOtp(String recipientEmail, String fullName, String otp) {
        String subject = "MediTrack Account Verification - One-Time Password (OTP)";
        String htmlBody = "<html><body style='font-family: Arial, sans-serif; color: #333;'>"
                + "<div style='max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;'>"
                + "<h2 style='color: #0f766e;'>Welcome to MediTrack!</h2>"
                + "<p>Hello <strong>" + (fullName != null ? fullName : "Customer") + "</strong>,</p>"
                + "<p>Thank you for registering with MediTrack. Please use the following 6-digit One-Time Password (OTP) to complete your account verification:</p>"
                + "<div style='background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;'>"
                + "<h1 style='margin: 0; font-size: 36px; letter-spacing: 8px; color: #15803d; font-family: monospace;'>" + otp + "</h1>"
                + "</div>"
                + "<p style='color: #6b7280; font-size: 13px;'>This code is valid for 10 minutes. If you did not request this verification, please ignore this email.</p>"
                + "<hr style='border: none; border-top: 1px solid #e5e7eb;'/>"
                + "<small style='color: #9ca3af;'>MediTrack Drug Store & Delivery Platform</small>"
                + "</div></body></html>";
        sendHtmlEmail(recipientEmail, subject, htmlBody);
    }

    @Async
    public void sendOrderConfirmation(Order order, String recipientEmail) {
        String subject = "MediTrack Order Confirmation - #" + order.getOrderNumber();
        String htmlBody = buildOrderConfirmationHtml(order);
        sendHtmlEmail(recipientEmail, subject, htmlBody);
    }

    @Async
    public void sendPrescriptionStatusNotification(String recipientEmail, String patientName, String status, String remarks) {
        String subject = "MediTrack Prescription Update: " + status;
        String htmlBody = "<html><body style='font-family: Arial, sans-serif; color: #333;'>"
                + "<h2 style='color: #0f766e;'>MediTrack Prescription Update</h2>"
                + "<p>Hello <strong>" + patientName + "</strong>,</p>"
                + "<p>Your prescription review status has been updated to: <span style='font-weight: bold; color: " 
                + ("APPROVED".equalsIgnoreCase(status) ? "#15803d" : "#b91c1c") + ";'>" + status + "</span></p>"
                + (remarks != null && !remarks.isBlank() ? "<p><strong>Pharmacist Notes:</strong> " + remarks + "</p>" : "")
                + "<p>Thank you for choosing MediTrack.</p>"
                + "<hr style='border: none; border-top: 1px solid #e5e7eb;'/>"
                + "<small style='color: #6b7280;'>This is an automated notification from MediTrack Drug Store Management System.</small>"
                + "</body></html>";
        sendHtmlEmail(recipientEmail, subject, htmlBody);
    }

    @Async
    public void sendDeliveryOtpNotification(String recipientEmail, String orderNumber, String otp) {
        String subject = "MediTrack Delivery OTP - Order #" + orderNumber;
        String htmlBody = "<html><body style='font-family: Arial, sans-serif; color: #333;'>"
                + "<h2 style='color: #0f766e;'>Your Delivery Verification OTP</h2>"
                + "<p>Your order <strong>#" + orderNumber + "</strong> is out for delivery.</p>"
                + "<div style='background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;'>"
                + "<p style='margin: 0; font-size: 14px; color: #166534;'>Provide this One-Time Password to your delivery agent upon arrival:</p>"
                + "<h1 style='margin: 10px 0; font-size: 32px; letter-spacing: 6px; color: #15803d;'>" + otp + "</h1>"
                + "</div>"
                + "<p style='color: #b91c1c;'><strong>Warning:</strong> Do not share this OTP before receiving and verifying your medicines.</p>"
                + "</body></html>";
        sendHtmlEmail(recipientEmail, subject, htmlBody);
    }

    public boolean sendHtmlEmail(String to, String subject, String htmlContent) {
        if (mailSender == null) {
            log.info("[EMAIL NOT SENT - NO MAILSENDER CONFIGURED] To: {}, Subject: {}", to, subject);
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("[EMAIL DISPATCHED] To: {}, Subject: {}", to, subject);
            return true;
        } catch (Exception ex) {
            log.error("[EMAIL DISPATCH FAILED] To: {}, Subject: {}, Error: {}", to, subject, ex.getMessage());
            return false;
        }
    }

    private String buildOrderConfirmationHtml(Order order) {
        StringBuilder sb = new StringBuilder();
        sb.append("<html><body style='font-family: Arial, sans-serif; color: #333;'>");
        sb.append("<div style='max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;'>");
        sb.append("<h2 style='color: #0f766e; margin-top: 0;'>MediTrack Order Placed Successfully</h2>");
        sb.append("<p>Order Number: <strong>").append(order.getOrderNumber()).append("</strong></p>");
        sb.append("<p>Status: <span style='background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-weight: bold;'>")
          .append(order.getStatus()).append("</span></p>");
        sb.append("<p>Total Amount: <strong>₹").append(String.format("%.2f", order.getTotalAmount() != null ? order.getTotalAmount() : 0.0)).append("</strong></p>");
        if (order.getDeliveryAddressSnapshot() != null) {
            sb.append("<p>Delivery Address: ").append(order.getDeliveryAddressSnapshot()).append("</p>");
        }
        sb.append("<hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;'/>");
        sb.append("<p>You can track the progress of your delivery or download the GST tax invoice anytime through your MediTrack customer portal.</p>");
        sb.append("<p style='color: #6b7280; font-size: 12px;'>MediTrack Healthcare & Pharmacy Services</p>");
        sb.append("</div></body></html>");
        return sb.toString();
    }
}
