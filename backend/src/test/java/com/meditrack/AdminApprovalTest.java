package com.meditrack;

import com.meditrack.common.ApiResponse;
import com.meditrack.common.AuditLogService;
import com.meditrack.common.BusinessException;
import com.meditrack.notification.EmailService;
import com.meditrack.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdminApprovalTest {

    private UserRepository userRepository;
    private PharmacistProfileRepository pharmacistProfileRepository;
    private DeliveryPartnerProfileRepository deliveryPartnerProfileRepository;
    private EmailService emailService;
    private AuditLogService auditLogService;
    private AdminApprovalController controller;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        pharmacistProfileRepository = mock(PharmacistProfileRepository.class);
        deliveryPartnerProfileRepository = mock(DeliveryPartnerProfileRepository.class);
        emailService = mock(EmailService.class);
        auditLogService = mock(AuditLogService.class);

        controller = new AdminApprovalController(
                userRepository,
                pharmacistProfileRepository,
                deliveryPartnerProfileRepository,
                emailService,
                auditLogService
        );
    }

    @Test
    @DisplayName("Lists all pending pharmacists and delivery partners with credential profiles")
    void testGetPendingApprovals() {
        Role pharmacistRole = new Role();
        pharmacistRole.setName(RoleType.ROLE_PHARMACIST);

        User pendingPharmacist = new User();
        pendingPharmacist.setId(10L);
        pendingPharmacist.setFullName("Kavita Iyer");
        pendingPharmacist.setEmail("kavita@pharmacy.com");
        pendingPharmacist.setStatus(UserStatus.PENDING);
        pendingPharmacist.setRoles(Set.of(pharmacistRole));

        PharmacistProfile profile = new PharmacistProfile();
        profile.setUserId(10L);
        profile.setLicenseNumber("KA-LIC-1029");

        when(userRepository.findAll()).thenReturn(List.of(pendingPharmacist));
        when(pharmacistProfileRepository.findById(10L)).thenReturn(Optional.of(profile));

        ResponseEntity<ApiResponse<List<Map<String, Object>>>> response = controller.getPendingApprovals();

        assertNotNull(response.getBody());
        List<Map<String, Object>> list = response.getBody().getData();
        assertEquals(1, list.size());
        assertEquals("PHARMACIST", list.get(0).get("role"));
        assertEquals("KA-LIC-1029", list.get(0).get("licenseNumber"));
    }

    @Test
    @DisplayName("Approving a partner activates user, updates status, and dispatches approval email")
    void testApproveUser() {
        User pendingUser = new User();
        pendingUser.setId(25L);
        pendingUser.setFullName("Rider Suresh");
        pendingUser.setEmail("suresh@fleet.com");
        pendingUser.setStatus(UserStatus.PENDING);
        pendingUser.setEmailVerified(false);

        DeliveryPartnerProfile dpProfile = new DeliveryPartnerProfile();
        dpProfile.setUserId(25L);
        dpProfile.setApprovalStatus(UserStatus.PENDING);

        when(userRepository.findById(25L)).thenReturn(Optional.of(pendingUser));
        when(deliveryPartnerProfileRepository.findById(25L)).thenReturn(Optional.of(dpProfile));

        ResponseEntity<ApiResponse<Void>> response = controller.approveUser(25L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(UserStatus.ACTIVE, pendingUser.getStatus());
        assertTrue(pendingUser.isEmailVerified());
        assertEquals(UserStatus.APPROVED, dpProfile.getApprovalStatus());

        verify(userRepository).save(pendingUser);
        verify(deliveryPartnerProfileRepository).save(dpProfile);
        verify(emailService).sendHtmlEmail(eq("suresh@fleet.com"), contains("Approved"), anyString());
        verify(auditLogService).logAction(eq(25L), eq("ROLE_ADMIN"), eq("APPROVE_USER"), eq("USER"), eq(25L), anyString(), anyString());
    }

    @Test
    @DisplayName("Rejecting a partner marks user and profile as REJECTED with reason")
    void testRejectUser() {
        User pendingUser = new User();
        pendingUser.setId(30L);
        pendingUser.setFullName("Applicant Vijay");
        pendingUser.setEmail("vijay@fleet.com");
        pendingUser.setStatus(UserStatus.PENDING);

        when(userRepository.findById(30L)).thenReturn(Optional.of(pendingUser));
        when(deliveryPartnerProfileRepository.findById(30L)).thenReturn(Optional.empty());

        ResponseEntity<ApiResponse<Void>> response = controller.rejectUser(
                30L,
                Map.of("reason", "Driving license expired")
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals(UserStatus.REJECTED, pendingUser.getStatus());
        verify(userRepository).save(pendingUser);
        verify(emailService).sendHtmlEmail(eq("vijay@fleet.com"), contains("Rejected"), contains("Driving license expired"));
        verify(auditLogService).logAction(eq(30L), eq("ROLE_ADMIN"), eq("REJECT_USER"), eq("USER"), eq(30L), anyString(), anyString());
    }
}
