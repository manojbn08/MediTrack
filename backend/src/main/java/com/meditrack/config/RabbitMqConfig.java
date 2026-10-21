package com.meditrack.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

/**
 * RabbitMQ AMQP Configuration for MediTrack.
 * Configures transactional order processing queues with Dead Letter Exchange (DLQ)
 * for guaranteed delivery, audit compliance, and resilient background processing.
 */
@Configuration
@ConditionalOnProperty(name = "meditrack.rabbitmq.enabled", havingValue = "true", matchIfMissing = false)
public class RabbitMqConfig {

    private static final Logger log = LoggerFactory.getLogger(RabbitMqConfig.class);

    // Exchanges
    public static final String ORDER_EXCHANGE = "meditrack.order.exchange";
    public static final String DEAD_LETTER_EXCHANGE = "meditrack.dlx.exchange";

    // Routing Keys
    public static final String ORDER_ROUTING_KEY = "order.placed.#";
    public static final String ORDER_PLACED_KEY = "order.placed.success";
    public static final String DEAD_LETTER_KEY = "order.deadletter";

    // Queues
    public static final String ORDER_QUEUE = "order.processing.queue";
    public static final String DEAD_LETTER_QUEUE = "order.deadletter.queue";

    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange(ORDER_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    public Queue orderProcessingQueue() {
        Map<String, Object> args = new HashMap<>();
        // Route unhandled or failed messages to Dead Letter Exchange after 3 retries or TTL
        args.put("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE);
        args.put("x-dead-letter-routing-key", DEAD_LETTER_KEY);
        // Message TTL: 24 hours before auto-expiring to DLQ if unconsumed
        args.put("x-message-ttl", 86400000);
        return new Queue(ORDER_QUEUE, true, false, false, args);
    }

    @Bean
    public Queue deadLetterQueue() {
        // Durable DLQ storing poison messages for admin inspection
        return new Queue(DEAD_LETTER_QUEUE, true);
    }

    @Bean
    public Binding orderBinding(Queue orderProcessingQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(orderProcessingQueue).to(orderExchange).with(ORDER_ROUTING_KEY);
    }

    @Bean
    public Binding deadLetterBinding(Queue deadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with(DEAD_LETTER_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        log.info("[RABBITMQ CONFIG] Initialized RabbitTemplate with JSON MessageConverter and DLQ bindings");
        return template;
    }
}
