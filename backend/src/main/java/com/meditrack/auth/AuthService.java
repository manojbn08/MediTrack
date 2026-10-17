package com.meditrack.auth;

import com.meditrack.common.BusinessException;
import com.meditrack.notification.EmailService;
import com.meditrack.security.JwtUtil;
import com.meditrack.security.TokenBlacklistService;
import com.meditrack.security.UserPrincipal;
import com.meditrack.user.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final DeliveryPartnerProfileRepository deliveryPartnerProfileRepository;
    private final PharmacistProfileRepository pharmacistProfileRepository;
    private final SignupOtpRepository signupOtpRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailService emailService;
    private final AddressRepository addressRepository;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       DeliveryPartnerProfileRepository deliveryPartnerProfileRepository,
                       PharmacistProfileRepository pharmacistProfileRepository,
                       SignupOtpRepository signupOtpRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       TokenBlacklistService tokenBlacklistService,
                       EmailService emailService,
                       AddressRepository addressRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.deliveryPartnerProfileRepository = deliveryPartnerProfileRepository;
        this.pharmacistProfileRepository = pharmacistProfileRepository;
        this.signupOtpRepository = signupOtpRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenBlacklistService = tokenBlacklistService;
        this.emailService = emailService;
        this.addressRepository = addressRepository;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("Invalid email or password", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("Invalid email or password", HttpStatus.UNAUTHORIZED);
        }

        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new BusinessException("Your account has been suspended. Please contact admin.", HttpStatus.FORBIDDEN);
        }

        boolean isCustomer = user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_CUSTOMER);
        boolean isPharmacist = user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_PHARMACIST);
        boolean isDelivery = user.getRoles().stream().anyMatch(r -> r.getName() == RoleType.ROLE_DELIVERY);

        // Check verification & approval status
        if (user.getStatus() == UserStatus.PENDING) {
            if (isCustomer) {
                throw new BusinessException("Please verify your email using the OTP sent to your inbox before logging in.", HttpStatus.FORBIDDEN);
            } else if (isPharmacist) {
                throw new BusinessException("Your pharmacist account is pending administrator approval. You will receive an email once your license credentials are verified.", HttpStatus.FORBIDDEN);
            } else if (isDelivery) {
                throw new BusinessException("Your delivery partner account is pending administrator approval. You will receive an email once your driving license and vehicle are verified.", HttpStatus.FORBIDDEN);
            } else {
                throw new BusinessException("Your account is pending administrator approval.", HttpStatus.FORBIDDEN);
            }
        }

        if (user.getStatus() == UserStatus.REJECTED) {
            throw new BusinessException("Your account application was reviewed and rejected by the administrator.", HttpStatus.FORBIDDEN);
        }

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtUtil.generateAccessToken(principal);
        RefreshToken refreshToken = createRefreshToken(user);

        List<String> roles = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toList());

        return new AuthResponse(token, refreshToken.getToken(), user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), roles, user.getStatus().name());
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email already in use", HttpStatus.CONFLICT);
        }

        // Prohibit direct Admin registration
        if (request.getRole() != null && request.getRole().toUpperCase().contains("ADMIN")) {
            throw new BusinessException("Admin registration is not allowed", HttpStatus.FORBIDDEN);
        }

        RoleType roleType = RoleType.ROLE_CUSTOMER;
        if (request.getRole() != null) {
            try {
                String roleStr = request.getRole().toUpperCase();
                if (!roleStr.startsWith("ROLE_")) {
                    roleStr = "ROLE_" + roleStr;
                }
                roleType = RoleType.valueOf(roleStr);
            } catch (IllegalArgumentException e) {
                roleType = RoleType.ROLE_CUSTOMER;
            }
        }

        final RoleType finalRoleType = roleType;
        Role role = roleRepository.findByName(finalRoleType)
                .orElseGet(() -> roleRepository.save(new Role(finalRoleType)));

        // Create user in PENDING status
        User user = new User(
                request.getFullName(),
                request.getEmail(),
                request.getPhone(),
                passwordEncoder.encode(request.getPassword())
        );
        user.setStatus(UserStatus.PENDING);
        user.setEmailVerified(false);
        user.setPhoneVerified(false);
        user.getRoles().add(role);
        user = userRepository.save(user);

        if (roleType == RoleType.ROLE_CUSTOMER) {
            // Save address if provided
            if (request.getAddressLine1() != null && !request.getAddressLine1().isBlank()) {
                Address address = new Address();
                address.setUserId(user.getId());
                address.setLabel("Home");
                address.setLine1(request.getAddressLine1());
                address.setCity(request.getCity() != null ? request.getCity() : "Bengaluru");
                address.setState(request.getState() != null ? request.getState() : "Karnataka");
                address.setPincode(request.getPincode() != null ? request.getPincode() : "560001");
                address.setDefault(true);
                addressRepository.save(address);
            }

            // Generate 6-digit OTP
            String otpCode = String.format("%06d", new Random().nextInt(1000000));
            signupOtpRepository.deleteByEmail(user.getEmail());
            signupOtpRepository.save(new SignupOtp(user.getEmail(), otpCode, LocalDateTime.now().plusMinutes(10)));

            // Dispatch OTP email
            emailService.sendSignupOtp(user.getEmail(), user.getFullName(), otpCode);

            return AuthResponse.pendingOtp(user.getEmail(), "Registration successful! A 6-digit verification code has been dispatched to " + user.getEmail() + ".");
        } else if (roleType == RoleType.ROLE_PHARMACIST) {
            // Create pending pharmacist profile
            PharmacistProfile profile = new PharmacistProfile(
                    user.getId(),
                    request.getLicenseNumber() != null ? request.getLicenseNumber() : "KA-PHARM-PENDING",
                    java.time.LocalDate.now().plusYears(3),
                    request.getPharmacyId() != null ? request.getPharmacyId() : 1L
            );
            pharmacistProfileRepository.save(profile);

            return AuthResponse.pendingApproval(user.getEmail(), "Pharmacist registration submitted successfully! Your credentials will be verified by the administrator before your account is activated.");
        } else if (roleType == RoleType.ROLE_DELIVERY) {
            // Create pending delivery partner profile
            DeliveryPartnerProfile profile = new DeliveryPartnerProfile(
                    user.getId(),
                    request.getVehicleType() != null ? request.getVehicleType() : "BIKE",
                    request.getVehicleNumber() != null ? request.getVehicleNumber() : "KA-PENDING",
                    request.getDrivingLicenseNo() != null ? request.getDrivingLicenseNo() : "DL-PENDING"
            );
            profile.setApprovalStatus(UserStatus.PENDING);
            profile.setIdProofUrl(request.getIdProofUrl());
            deliveryPartnerProfileRepository.save(profile);

            return AuthResponse.pendingApproval(user.getEmail(), "Delivery partner registration submitted successfully! Your vehicle and driving license will be reviewed by the administrator before activation.");
        }

        return AuthResponse.pendingOtp(user.getEmail(), "Registration initiated.");
    }

    @Transactional
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        SignupOtp otp = signupOtpRepository.findTopByEmailAndVerifiedFalseOrderByExpiresAtDesc(request.getEmail())
                .orElseThrow(() -> new BusinessException("No pending OTP found for " + request.getEmail(), HttpStatus.BAD_REQUEST));

        if (LocalDateTime.now().isAfter(otp.getExpiresAt())) {
            throw new BusinessException("OTP has expired. Please request a new verification code.", HttpStatus.BAD_REQUEST);
        }

        if (!otp.getOtp().equals(request.getOtp().trim())) {
            throw new BusinessException("Invalid OTP code. Please check and try again.", HttpStatus.BAD_REQUEST);
        }

        otp.setVerified(true);
        signupOtpRepository.save(otp);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("User not found: " + request.getEmail(), HttpStatus.NOT_FOUND));

        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        user = userRepository.save(user);

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtUtil.generateAccessToken(principal);
        RefreshToken refreshToken = createRefreshToken(user);

        List<String> roles = user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toList());
        return new AuthResponse(token, refreshToken.getToken(), user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), roles, "ACTIVE");
    }

    @Transactional
    public void resendOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("User not found with email: " + email, HttpStatus.NOT_FOUND));

        if (user.isEmailVerified()) {
            throw new BusinessException("Email is already verified. Please proceed to login.", HttpStatus.BAD_REQUEST);
        }

        String otpCode = String.format("%06d", new Random().nextInt(1000000));
        signupOtpRepository.deleteByEmail(email);
        signupOtpRepository.save(new SignupOtp(email, otpCode, LocalDateTime.now().plusMinutes(10)));

        emailService.sendSignupOtp(user.getEmail(), user.getFullName(), otpCode);
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenStr) {
        RefreshToken token = refreshTokenRepository.findByTokenAndRevokedFalse(refreshTokenStr)
                .orElseThrow(() -> new BusinessException("Invalid or revoked refresh token", HttpStatus.UNAUTHORIZED));

        if (token.isExpired()) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            throw new BusinessException("Refresh token has expired. Please log in again.", HttpStatus.UNAUTHORIZED);
        }

        User user = token.getUser();
        if (user.getStatus() != UserStatus.ACTIVE && user.getStatus() != UserStatus.APPROVED) {
            throw new BusinessException("User account is not active", HttpStatus.FORBIDDEN);
        }

        // Rotate token
        token.setRevoked(true);
        refreshTokenRepository.save(token);

        RefreshToken newRefreshToken = createRefreshToken(user);
        UserPrincipal principal = UserPrincipal.create(user);
        String newAccessToken = jwtUtil.generateAccessToken(principal);

        List<String> roles = user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toList());
        return new AuthResponse(newAccessToken, newRefreshToken.getToken(), user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), roles, user.getStatus().name());
    }

    @Transactional
    public void logout(String bearerToken, String refreshTokenStr) {
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            String jwt = bearerToken.substring(7);
            try {
                Date expiration = jwtUtil.getExpirationDateFromToken(jwt);
                if (expiration != null) {
                    tokenBlacklistService.blacklistToken(jwt, expiration.getTime());
                }
            } catch (Exception ignored) {}
        }

        if (refreshTokenStr != null && !refreshTokenStr.isBlank()) {
            refreshTokenRepository.findByTokenAndRevokedFalse(refreshTokenStr)
                    .ifPresent(rt -> {
                        rt.setRevoked(true);
                        refreshTokenRepository.save(rt);
                    });
        }
    }

    @Transactional(readOnly = true)
    public AuthResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtUtil.generateAccessToken(principal);
        List<String> roles = user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toList());

        return new AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), roles);
    }

    private RefreshToken createRefreshToken(User user) {
        String tokenStr = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        RefreshToken rt = new RefreshToken(user, tokenStr, LocalDateTime.now().plusDays(7));
        return refreshTokenRepository.save(rt);
    }
}
