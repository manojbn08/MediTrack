package com.meditrack;

import com.meditrack.inventory.InventoryService;
import com.meditrack.order.*;
import com.meditrack.payment.Payment;
import com.meditrack.payment.PaymentRepository;
import com.meditrack.payment.PaymentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class OrderExpirySchedulerTest {

    private OrderRepository orderRepository;
    private OrderStateMachine orderStateMachine;
    private InventoryService inventoryService;
    private PaymentRepository paymentRepository;
    private RealtimeTrackingService realtimeTrackingService;
    private OrderExpiryScheduler scheduler;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        orderStateMachine = mock(OrderStateMachine.class);
        inventoryService = mock(InventoryService.class);
        paymentRepository = mock(PaymentRepository.class);
        realtimeTrackingService = mock(RealtimeTrackingService.class);

        scheduler = new OrderExpiryScheduler(
                orderRepository,
                orderStateMachine,
                inventoryService,
                paymentRepository,
                realtimeTrackingService
        );
    }

    @Test
    @DisplayName("Auto-cancels unpaid online orders older than 15 minutes and releases batch inventory")
    void testCancelUnpaidExpiredOrders() {
        Order expiredOrder = new Order();
        expiredOrder.setId(101L);
        expiredOrder.setOrderNumber("MT-101");
        expiredOrder.setStatus(OrderStatus.PLACED);
        expiredOrder.setPaymentMethod(PaymentMethod.ONLINE);
        expiredOrder.setPlacedAt(LocalDateTime.now().minusMinutes(20));

        OrderItem item = new OrderItem();
        item.setBatchId(55L);
        item.setQuantity(2);
        expiredOrder.setItems(List.of(item));

        when(orderRepository.findAll()).thenReturn(List.of(expiredOrder));
        when(paymentRepository.findTopByOrderIdOrderByCreatedAtDesc(101L)).thenReturn(Optional.empty());

        scheduler.cancelUnpaidOrders();

        verify(orderStateMachine).transition(
                eq(expiredOrder),
                eq(OrderStatus.CANCELLED),
                eq("SYSTEM_SCHEDULER"),
                contains("15-minute window")
        );
        verify(inventoryService).releaseReservedStock(55L, 2, 101L);
        verify(realtimeTrackingService).publishOrderStatus(eq(101L), eq("MT-101"), eq("CANCELLED"), any());
    }

    @Test
    @DisplayName("Does not cancel recently placed orders (< 15 mins)")
    void testDoNotCancelRecentOrders() {
        Order recentOrder = new Order();
        recentOrder.setId(102L);
        recentOrder.setStatus(OrderStatus.PLACED);
        recentOrder.setPaymentMethod(PaymentMethod.ONLINE);
        recentOrder.setPlacedAt(LocalDateTime.now().minusMinutes(5));

        when(orderRepository.findAll()).thenReturn(List.of(recentOrder));

        scheduler.cancelUnpaidOrders();

        verify(orderStateMachine, never()).transition(any(), any(), any(), any());
        verify(inventoryService, never()).releaseReservedStock(anyLong(), anyInt(), anyLong());
    }

    @Test
    @DisplayName("Does not cancel orders with successful payments")
    void testDoNotCancelPaidOrders() {
        Order paidOrder = new Order();
        paidOrder.setId(103L);
        paidOrder.setStatus(OrderStatus.PLACED);
        paidOrder.setPaymentMethod(PaymentMethod.ONLINE);
        paidOrder.setPlacedAt(LocalDateTime.now().minusMinutes(25));

        Payment successPayment = new Payment();
        successPayment.setStatus(PaymentStatus.SUCCESS);

        when(orderRepository.findAll()).thenReturn(List.of(paidOrder));
        when(paymentRepository.findTopByOrderIdOrderByCreatedAtDesc(103L)).thenReturn(Optional.of(successPayment));

        scheduler.cancelUnpaidOrders();

        verify(orderStateMachine, never()).transition(any(), any(), any(), any());
    }
}
