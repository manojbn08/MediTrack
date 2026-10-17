package com.meditrack.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliveryPartnerProfileRepository extends JpaRepository<DeliveryPartnerProfile, Long> {
    List<DeliveryPartnerProfile> findByIsOnlineTrueAndApprovalStatus(UserStatus status);
}
