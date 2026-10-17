package com.meditrack.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SignupOtpRepository extends JpaRepository<SignupOtp, Long> {
    Optional<SignupOtp> findTopByEmailAndVerifiedFalseOrderByExpiresAtDesc(String email);
    void deleteByEmail(String email);
}
