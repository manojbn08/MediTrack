package com.meditrack;

import com.meditrack.notification.EmailService;
import com.meditrack.order.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class OrderEventConsumerTest {

    private OrderRepository orderRepository;
    private EmailService emailService;
    private InvoicePdfService invoicePdfService;
    private OrderEventConsumer consumer;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        emailService = mock(EmailService.class);
        invoicePdfService = mock(InvoicePdfService.class);

        consumer = new OrderEventConsumer(orderRepository, emailService, invoicePdfService);
    }

    @Test
    @DisplayName("Verify OrderEventConsumer dispatches email and pre-renders invoice on receiving OrderPlacedEvent")
    void testHandleOrderPlacedSuccess() {
        Order order = new Order();
        order.setId(101L);
        order.setOrderNumber("MT-20261023-1111");
        order.setTotalAmount(540.0);
        order.setStatus(OrderStatus.CONFIRMED);

        when(orderRepository.findById(101L)).thenReturn(Optional.of(order));
        when(invoicePdfService.generateInvoicePdf(order)).thenReturn(new byte[]{1, 2, 3});

        OrderPlacedEvent event = new OrderPlacedEvent(
                101L,
                "MT-20261023-1111",
                5L,
                "customer@meditrack.com",
                "Rahul Sharma",
                540.0,
                "CONFIRMED",
                LocalDateTime.now()
        );

        consumer.handleOrderPlaced(event);

        verify(orderRepository).findById(101L);
        verify(emailService).sendOrderConfirmation(order, "customer@meditrack.com");
        verify(invoicePdfService).generateInvoicePdf(order);
    }

    @Test
    @DisplayName("Verify OrderEventConsumer re-throws exceptions to trigger DLQ retry")
    void testHandleOrderPlacedReThrowsOnFailure() {
        OrderPlacedEvent event = new OrderPlacedEvent(
                999L,
                "MT-20261023-9999",
                5L,
                "fail@example.com",
                "Tester",
                100.0,
                "CONFIRMED",
                LocalDateTime.now()
        );

        when(orderRepository.findById(999L)).thenThrow(new RuntimeException("DB Connection Timeout"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> consumer.handleOrderPlaced(event));
        assertTrue(ex.getMessage().contains("DB Connection Timeout"));
    }
}
