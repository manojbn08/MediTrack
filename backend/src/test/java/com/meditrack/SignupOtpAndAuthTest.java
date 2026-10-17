package com.meditrack;

import com.meditrack.auth.*;
import com.meditrack.common.BusinessException;
import com.meditrack.notification.EmailService;
import com.meditrack.security.JwtUtil;
import com.meditrack.security.TokenBlacklistService;
import com.meditrack.security.UserPrincipal;
import com.meditrack.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SignupOtpAndAuthTest {

    private UserRepository userRepository;
    private RoleRepository roleRepository;
    private PasswordEncoder passwordEncoder;
    private JwtUtil jwtUtil;
    private DeliveryPartnerProfileRepository deliveryPartnerProfileRepository;
    private PharmacistProfileRepository pharmacistProfileRepository;
    private SignupOtpRepository signupOtpRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private TokenBlacklistService tokenBlacklistService;
    private EmailService emailService;
    private AddressRepository addressRepository;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        roleRepository = mock(RoleRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtUtil = mock(JwtUtil.class);
        deliveryPartnerProfileRepository = mock(DeliveryPartnerProfileRepository.class);
        pharmacistProfileRepository = mock(PharmacistProfileRepository.class);
        signupOtpRepository = mock(SignupOtpRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        tokenBlacklistService = mock(TokenBlacklistService.class);
        emailService = mock(EmailService.class);
        addressRepository = mock(AddressRepository.class);

        authService = new AuthService(
                userRepository,
                roleRepository,
                passwordEncoder,
                jwtUtil,
                deliveryPartnerProfileRepository,
                pharmacistProfileRepository,
                signupOtpRepository,
                refreshTokenRepository,
                tokenBlacklistService,
                emailService,
                addressRepository
        );
    }

    @Test
    @DisplayName("Customer signup creates user, dispatches 6-digit OTP, and saves OTP record")
    void testCustomerSignupGeneratesOtp() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("customer@example.com");
        req.setPassword("Password123!");
        req.setFullName("Rahul Dravid");
        req.setPhone("9876543210");
        req.setRole("CUSTOMER");

        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded_pass");

        Role role = new Role();
        role.setId(1L);
        role.setName(RoleType.ROLE_CUSTOMER);
        when(roleRepository.findByName(RoleType.ROLE_CUSTOMER)).thenReturn(Optional.of(role));

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });

        AuthResponse resp = authService.register(req);

        assertNotNull(resp);
        assertEquals("PENDING_OTP", resp.getStatus());

        // Verify OTP entity created
        ArgumentCaptor<SignupOtp> otpCaptor = ArgumentCaptor.forClass(SignupOtp.class);
        verify(signupOtpRepository).save(otpCaptor.capture());
        SignupOtp savedOtp = otpCaptor.getValue();
        assertEquals("customer@example.com", savedOtp.getEmail());
        assertNotNull(savedOtp.getOtp());
        assertEquals(6, savedOtp.getOtp().length());

        // Verify notification sent
        verify(emailService).sendSignupOtp(eq("customer@example.com"), eq("Rahul Dravid"), anyString());
    }

    @Test
    @DisplayName("Pharmacist and Delivery Partner signup sets PENDING status requiring admin verification")
    void testPartnerSignupSetsPendingStatus() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("pharmacist@meditrack.com");
        req.setPassword("PharmacistPass123!");
        req.setFullName("Dr. Meera Nair");
        req.setPhone("9876543211");
        req.setRole("PHARMACIST");
        req.setLicenseNumber("KA-PHARM-2024-9988");

        when(userRepository.existsByEmail(req.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded_pass");

        Role role = new Role();
        role.setId(2L);
        role.setName(RoleType.ROLE_PHARMACIST);
        when(roleRepository.findByName(RoleType.ROLE_PHARMACIST)).thenReturn(Optional.of(role));

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(20L);
            return u;
        });

        AuthResponse resp = authService.register(req);

        assertEquals("PENDING_APPROVAL", resp.getStatus());
        verify(pharmacistProfileRepository).save(any(PharmacistProfile.class));
    }

    @Test
    @DisplayName("Admin role cannot be registered via public registration endpoint")
    void testAdminRegistrationBlocked() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("hacker@admin.com");
        req.setRole("ROLE_ADMIN");

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.register(req));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("Valid OTP verification activates customer account and issues JWT tokens")
    void testVerifyOtpSuccess() {
        User user = new User();
        user.setId(50L);
        user.setEmail("user@example.com");
        user.setFullName("Test User");
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(false);
        user.setRoles(Set.of());

        SignupOtp otp = new SignupOtp("user@example.com", "123456", LocalDateTime.now().plusMinutes(10));

        when(signupOtpRepository.findTopByEmailAndVerifiedFalseOrderByExpiresAtDesc("user@example.com"))
                .thenReturn(Optional.of(otp));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtUtil.generateAccessToken(any(UserPrincipal.class))).thenReturn("mock_jwt_access");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        VerifyOtpRequest verifyReq = new VerifyOtpRequest();
        verifyReq.setEmail("user@example.com");
        verifyReq.setOtp("123456");

        AuthResponse resp = authService.verifyOtp(verifyReq);

        assertNotNull(resp);
        assertEquals("mock_jwt_access", resp.getToken());
        assertTrue(user.isEmailVerified());
        assertTrue(otp.isVerified());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Pending user login attempt is blocked with informative compliance message")
    void testPendingUserLoginBlocked() {
        Role riderRole = new Role();
        riderRole.setName(RoleType.ROLE_DELIVERY);

        User user = new User();
        user.setId(88L);
        user.setEmail("rider@meditrack.com");
        user.setPasswordHash("hashed_pw");
        user.setStatus(UserStatus.PENDING);
        user.setRoles(Set.of(riderRole));

        when(userRepository.findByEmail("rider@meditrack.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("RiderPass123!", "hashed_pw")).thenReturn(true);

        LoginRequest req = new LoginRequest();
        req.setEmail("rider@meditrack.com");
        req.setPassword("RiderPass123!");

        BusinessException ex = assertThrows(BusinessException.class, () -> authService.login(req));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertTrue(ex.getMessage().contains("pending administrator approval"));
    }

    @Test
    @DisplayName("Logout blacklists access token and revokes user refresh tokens")
    void testLogoutRevokesTokens() {
        Date expiration = new Date(System.currentTimeMillis() + 3600000);
        when(jwtUtil.getExpirationDateFromToken("mock_jwt_token")).thenReturn(expiration);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken("mock_refresh_token");
        refreshToken.setRevoked(false);

        when(refreshTokenRepository.findByTokenAndRevokedFalse("mock_refresh_token"))
                .thenReturn(Optional.of(refreshToken));

        authService.logout("Bearer mock_jwt_token", "mock_refresh_token");

        verify(tokenBlacklistService).blacklistToken("mock_jwt_token", expiration.getTime());
        assertTrue(refreshToken.isRevoked());
        verify(refreshTokenRepository).save(refreshToken);
    }
}
