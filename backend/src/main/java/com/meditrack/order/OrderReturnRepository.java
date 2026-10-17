package com.meditrack.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderReturnRepository extends JpaRepository<OrderReturn, Long> {
    List<OrderReturn> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<OrderReturn> findByStatusOrderByCreatedAtAsc(OrderReturn.ReturnStatus status);
}
