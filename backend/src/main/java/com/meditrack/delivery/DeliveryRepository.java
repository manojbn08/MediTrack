package com.meditrack.delivery;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    Optional<Delivery> findByOrderId(Long orderId);
    List<Delivery> findByStatus(DeliveryStatus status);
    List<Delivery> findByPartnerIdOrderByAssignedAtDesc(Long partnerId);
    List<Delivery> findByPartnerIdAndStatus(Long partnerId, DeliveryStatus status);
    List<Delivery> findByStatusAndPartnerIdIsNull(DeliveryStatus status);
}
