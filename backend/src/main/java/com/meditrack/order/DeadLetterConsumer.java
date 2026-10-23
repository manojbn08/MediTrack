package com.meditrack.order;

import com.meditrack.common.AuditLogService;
import com.meditrack.config.RabbitMqConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Consumer for dead-lettered messages in the Dead Letter Queue (DLQ).
 * Captures poison messages, logs critical alerts, and records an immutable audit log
 * for administrative and compliance review.
 */
@Component
@ConditionalOnProperty(name = "meditrack.rabbitmq.enabled", havingValue = "true", matchIfMissing = false)
public class DeadLetterConsumer {

    private static final Logger log = LoggerFactory.getLogger(DeadLetterConsumer.class);

    private final AuditLogService auditLogService;

    public DeadLetterConsumer(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @RabbitListener(queues = RabbitMqConfig.DEAD_LETTER_QUEUE)
    public void handleDeadLetterMessage(Message message) {
        String payload = new String(message.getBody(), StandardCharsets.UTF_8);
        String routingKey = message.getMessageProperties().getReceivedRoutingKey();
        log.error("[RABBITMQ DLQ ALERT] Poison/Failed message received on DLQ '{}'. Payload: {}",
                RabbitMqConfig.DEAD_LETTER_QUEUE, payload);

        try {
            auditLogService.logAction(
                    0L,
                    "SYSTEM_RABBITMQ_DLQ",
                    "POISON_MESSAGE_CAPTURED",
                    "DLQ_MESSAGE",
                    null,
                    "Failed message on DLQ with routing key: " + routingKey + ". Payload: " + payload,
                    "127.0.0.1"
            );
        } catch (Exception ex) {
            log.error("[RABBITMQ DLQ ERROR] Failed to record audit log for DLQ message: {}", ex.getMessage());
        }
    }
}
