package com.meditrack.order;

import com.meditrack.inventory.InventoryService;
import com.meditrack.payment.Payment;
import com.meditrack.payment.PaymentRepository;
import com.meditrack.payment.PaymentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
public class OrderExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(OrderExpiryScheduler.class);

    private final OrderRepository orderRepository;
    private final OrderStateMachine orderStateMachine;
    private final InventoryService inventoryService;
    private final PaymentRepository paymentRepository;
    private final RealtimeTrackingService realtimeTrackingService;

    public OrderExpiryScheduler(OrderRepository orderRepository,
                                OrderStateMachine orderStateMachine,
                                InventoryService inventoryService,
                                PaymentRepository paymentRepository,
                                RealtimeTrackingService realtimeTrackingService) {
        this.orderRepository = orderRepository;
        this.orderStateMachine = orderStateMachine;
        this.inventoryService = inventoryService;
        this.paymentRepository = paymentRepository;
        this.realtimeTrackingService = realtimeTrackingService;
    }

    // Run every 60 seconds
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cancelUnpaidOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(15);
        List<Order> activeOrders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() == OrderStatus.PLACED || o.getStatus() == OrderStatus.PRESCRIPTION_PENDING || o.getStatus() == OrderStatus.CONFIRMED)
                .filter(o -> o.getPlacedAt() != null && o.getPlacedAt().isBefore(cutoff))
                .filter(o -> o.getPaymentMethod() == PaymentMethod.ONLINE)
                .toList();

        for (Order order : activeOrders) {
            Optional<Payment> optPayment = paymentRepository.findByOrderId(order.getId());
            boolean isPaid = optPayment.isPresent() && optPayment.get().getStatus() == PaymentStatus.SUCCESS;

            if (!isPaid) {
                log.info("[SCHEDULER] Auto-cancelling expired unpaid order: {}", order.getOrderNumber());
                try {
                    orderStateMachine.transition(
                            order,
                            OrderStatus.CANCELLED,
                            "SYSTEM_SCHEDULER",
                            "Auto-cancelled: Payment not completed within 15-minute window"
                    );

                    // Release reserved batch stock
                    for (OrderItem item : order.getItems()) {
                        if (item.getBatchId() != null) {
                            inventoryService.releaseReservedStock(item.getBatchId(), item.getQuantity(), order.getId());
                        }
                    }

                    orderRepository.save(order);

                    realtimeTrackingService.publishOrderStatus(
                            order.getId(),
                            order.getOrderNumber(),
                            OrderStatus.CANCELLED.name(),
                            "Order auto-cancelled due to payment timeout (15 mins)"
                    );
                } catch (Exception ex) {
                    log.error("[SCHEDULER ERROR] Failed to auto-cancel order {}: {}", order.getOrderNumber(), ex.getMessage());
                }
            }
        }
    }
}
