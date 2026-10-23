package com.meditrack.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderNumber(String orderNumber);
    List<Order> findByCustomerIdOrderByPlacedAtDesc(Long customerId);
    List<Order> findByStatusOrderByPlacedAtAsc(OrderStatus status);
    List<Order> findAllByOrderByPlacedAtDesc();
    List<Order> findByPrescriptionId(Long prescriptionId);
    List<Order> findByStatusInAndPaymentMethodAndPlacedAtBefore(List<OrderStatus> statuses, PaymentMethod paymentMethod, java.time.LocalDateTime placedAt);
}
