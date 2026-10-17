package com.meditrack.auth;

import com.meditrack.common.BusinessException;
import com.meditrack.security.JwtUtil;
import com.meditrack.security.UserPrincipal;
import com.meditrack.user.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final DeliveryPartnerProfileRepository deliveryPartnerProfileRepository;
    private final PharmacistProfileRepository pharmacistProfileRepository;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       DeliveryPartnerProfileRepository deliveryPartnerProfileRepository,
                       PharmacistProfileRepository pharmacistProfileRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.deliveryPartnerProfileRepository = deliveryPartnerProfileRepository;
        this.pharmacistProfileRepository = pharmacistProfileRepository;
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

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtUtil.generateAccessToken(principal);

        List<String> roles = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toList());

        return new AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), roles);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email already in use", HttpStatus.CONFLICT);
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

        Role role = roleRepository.findByName(roleType)
                .orElseGet(() -> roleRepository.save(new Role(RoleType.ROLE_CUSTOMER)));

        User user = new User(
                request.getFullName(),
                request.getEmail(),
                request.getPhone(),
                passwordEncoder.encode(request.getPassword())
        );
        user.getRoles().add(role);
        user = userRepository.save(user);

        // If delivery partner, create initial profile
        if (roleType == RoleType.ROLE_DELIVERY) {
            DeliveryPartnerProfile profile = new DeliveryPartnerProfile(
                    user.getId(), "BIKE", "KA-01-EQ-9999", "DL-2026-KA01-0001"
            );
            deliveryPartnerProfileRepository.save(profile);
        } else if (roleType == RoleType.ROLE_PHARMACIST) {
            PharmacistProfile profile = new PharmacistProfile(
                    user.getId(), "KA-PHARM-2026-001", java.time.LocalDate.now().plusYears(3), 1L
            );
            pharmacistProfileRepository.save(profile);
        }

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtUtil.generateAccessToken(principal);

        List<String> roles = List.of(role.getName().name());
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), roles);
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
}
