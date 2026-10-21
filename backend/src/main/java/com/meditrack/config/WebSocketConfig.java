package com.meditrack.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    @Value("${meditrack.rabbitmq.enabled:false}")
    private boolean rabbitMqEnabled;

    @Value("${meditrack.rabbitmq.host:localhost}")
    private String rabbitMqHost;

    @Value("${meditrack.rabbitmq.stomp-port:61613}")
    private int rabbitMqStompPort;

    @Value("${meditrack.rabbitmq.username:guest}")
    private String rabbitMqUsername;

    @Value("${meditrack.rabbitmq.password:guest}")
    private String rabbitMqPassword;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        if (rabbitMqEnabled) {
            log.info("[WEBSOCKET] Enabling RabbitMQ STOMP Broker Relay at {}:{}", rabbitMqHost, rabbitMqStompPort);
            config.enableStompBrokerRelay("/topic", "/queue")
                    .setRelayHost(rabbitMqHost)
                    .setRelayPort(rabbitMqStompPort)
                    .setClientLogin(rabbitMqUsername)
                    .setClientPasscode(rabbitMqPassword)
                    .setSystemLogin(rabbitMqUsername)
                    .setSystemPasscode(rabbitMqPassword)
                    .setSystemHeartbeatReceiveInterval(10000)
                    .setSystemHeartbeatSendInterval(10000);
        } else {
            log.info("[WEBSOCKET] Enabling In-Memory SimpleBroker (/topic, /queue)");
            config.enableSimpleBroker("/topic", "/queue");
        }
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        registry.addEndpoint("/ws-raw")
                .setAllowedOriginPatterns("*");
    }
}
