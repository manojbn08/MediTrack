package com.meditrack.order;

import com.meditrack.config.RabbitMqConfig;
import com.meditrack.notification.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * RabbitMQ Consumer for asynchronous, decoupled post-checkout order processing.
 * Handles invoice pre-rendering and email delivery with automatic Dead Letter Queue (DLQ)
 * retry mechanism.
 */
@Component
@ConditionalOnProperty(name = "meditrack.rabbitmq.enabled", havingValue = "true", matchIfMissing = false)
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);

    private final OrderRepository orderRepository;
    private final EmailService emailService;
    private final InvoicePdfService invoicePdfService;

    @Autowired
    public OrderEventConsumer(OrderRepository orderRepository,
                              EmailService emailService,
                              InvoicePdfService invoicePdfService) {
        this.orderRepository = orderRepository;
        this.emailService = emailService;
        this.invoicePdfService = invoicePdfService;
    }

    @RabbitListener(queues = RabbitMqConfig.ORDER_QUEUE)
    public void handleOrderPlaced(OrderPlacedEvent event) {
        log.info("[RABBITMQ CONSUMER] Received OrderPlacedEvent from queue for Order #{} (ID: {})",
                event.getOrderNumber(), event.getOrderId());

        try {
            Order order = orderRepository.findById(event.getOrderId()).orElse(null);
            if (order == null) {
                log.warn("[RABBITMQ CONSUMER] Order #{} not found in DB, skipping notification", event.getOrderId());
                return;
            }

            // 1. Asynchronously dispatch order confirmation email via Angus Mail / Mailpit
            if (event.getCustomerEmail() != null && !event.getCustomerEmail().isBlank()) {
                emailService.sendOrderConfirmation(order, event.getCustomerEmail());
                log.info("[RABBITMQ CONSUMER] Dispatched email notification to {}", event.getCustomerEmail());
            }

            // 2. Pre-generate GST tax invoice in background
            try {
                byte[] pdfBytes = invoicePdfService.generateInvoicePdf(order);
                log.info("[RABBITMQ CONSUMER] Pre-rendered GST invoice PDF ({} bytes) for Order #{}",
                        pdfBytes.length, order.getOrderNumber());
            } catch (Exception ex) {
                log.warn("[RABBITMQ CONSUMER] Non-fatal invoice pre-generation warning: {}", ex.getMessage());
            }

            log.info("[RABBITMQ CONSUMER] Successfully completed async post-checkout tasks for Order #{}",
                    order.getOrderNumber());

        } catch (Exception ex) {
            log.error("[RABBITMQ CONSUMER ERROR] Failed processing OrderPlacedEvent #{}: {}. Message will be retried or routed to DLQ.",
                    event.getOrderId(), ex.getMessage(), ex);
            throw ex; // Re-throw to trigger RabbitMQ DLQ retry mechanism
        }
    }
}
