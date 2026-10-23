package com.meditrack.user;

import com.meditrack.common.ApiResponse;
import com.meditrack.common.BusinessException;
import com.meditrack.notification.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminApprovalController {

    private final UserRepository userRepository;
    private final PharmacistProfileRepository pharmacistProfileRepository;
    private final DeliveryPartnerProfileRepository deliveryPartnerProfileRepository;
    private final EmailService emailService;
    private final com.meditrack.common.AuditLogService auditLogService;

    public AdminApprovalController(UserRepository userRepository,
                                   PharmacistProfileRepository pharmacistProfileRepository,
                                   DeliveryPartnerProfileRepository deliveryPartnerProfileRepository,
                                   EmailService emailService,
                                   com.meditrack.common.AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.pharmacistProfileRepository = pharmacistProfileRepository;
        this.deliveryPartnerProfileRepository = deliveryPartnerProfileRepository;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/pending-approvals")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPendingApprovals() {
        List<User> pendingUsers = userRepository.findAll().stream()
                .filter(u -> u.getStatus() == UserStatus.PENDING)
                .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_PHARMACIST || r.getName() == RoleType.ROLE_DELIVERY))
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : pendingUsers) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("fullName", u.getFullName());
            map.put("email", u.getEmail());
            map.put("phone", u.getPhone());
            map.put("status", u.getStatus().name());
            map.put("createdAt", u.getCreatedAt());

            boolean isPharmacist = u.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_PHARMACIST);
            if (isPharmacist) {
                map.put("role", "PHARMACIST");
                pharmacistProfileRepository.findById(u.getId()).ifPresent(p -> {
                    map.put("licenseNumber", p.getLicenseNumber());
                    map.put("licenseValidTill", p.getLicenseValidTill());
                    map.put("pharmacyId", p.getPharmacyId());
                });
            } else {
                map.put("role", "DELIVERY");
                deliveryPartnerProfileRepository.findById(u.getId()).ifPresent(dp -> {
                    map.put("vehicleType", dp.getVehicleType());
                    map.put("vehicleNumber", dp.getVehicleNumber());
                    map.put("drivingLicenseNo", dp.getDrivingLicenseNo());
                    map.put("idProofUrl", dp.getIdProofUrl());
                });
            }
            result.add(map);
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/approvals/{userId}/approve")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> approveUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found with id: " + userId, HttpStatus.NOT_FOUND));

        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user.setPhoneVerified(true);
        userRepository.save(user);

        // Update profile if delivery partner
        deliveryPartnerProfileRepository.findById(userId).ifPresent(dp -> {
            dp.setApprovalStatus(UserStatus.APPROVED);
            deliveryPartnerProfileRepository.save(dp);
        });

        // Notify user via email
        emailService.sendHtmlEmail(
                user.getEmail(),
                "MediTrack Professional Account Approved!",
                "<html><body><h2>Congratulations " + user.getFullName() + "!</h2>"
                + "<p>Your professional credentials have been reviewed and approved by MediTrack Administration.</p>"
                + "<p>You may now log in to the MediTrack portal and begin operations.</p>"
                + "</body></html>"
        );

        auditLogService.logAction(
                userId,
                "ROLE_ADMIN",
                "APPROVE_USER",
                "USER",
                user.getId(),
                "Admin approved user application for: " + user.getFullName() + " (" + user.getEmail() + ")",
                "127.0.0.1"
        );

        return ResponseEntity.ok(ApiResponse.ok("User approved successfully", null));
    }

    @PostMapping("/approvals/{userId}/reject")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> rejectUser(
            @PathVariable Long userId,
            @RequestBody(required = false) Map<String, String> body) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found with id: " + userId, HttpStatus.NOT_FOUND));

        String reason = body != null ? body.getOrDefault("reason", "Credentials did not meet regulatory standards") : "Credentials did not meet regulatory standards";
        user.setStatus(UserStatus.REJECTED);
        userRepository.save(user);

        deliveryPartnerProfileRepository.findById(userId).ifPresent(dp -> {
            dp.setApprovalStatus(UserStatus.REJECTED);
            deliveryPartnerProfileRepository.save(dp);
        });

        emailService.sendHtmlEmail(
                user.getEmail(),
                "MediTrack Account Application Status: Rejected",
                "<html><body><h2>Account Application Update</h2>"
                + "<p>Dear " + user.getFullName() + ",</p>"
                + "<p>We regret to inform you that your application could not be approved for the following reason:</p>"
                + "<p><strong>" + reason + "</strong></p>"
                + "<p>Please contact support for further clarification.</p>"
                + "</body></html>"
        );

        auditLogService.logAction(
                userId,
                "ROLE_ADMIN",
                "REJECT_USER",
                "USER",
                user.getId(),
                "Admin rejected user application for: " + user.getFullName() + ". Reason: " + reason,
                "127.0.0.1"
        );

        return ResponseEntity.ok(ApiResponse.ok("User application rejected", null));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<com.meditrack.common.AuditLog>>> getAuditLogs() {
        return ResponseEntity.ok(ApiResponse.ok(auditLogService.getRecentLogs()));
    }
}
