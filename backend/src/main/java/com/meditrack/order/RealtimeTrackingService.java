package com.meditrack.order;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class RealtimeTrackingService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeTrackingService.class);

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeTrackingService(@Autowired(required = false) SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishOrderStatus(Long orderId, String orderNumber, String status, String note) {
        if (messagingTemplate == null) {
            log.debug("WebSocket broker not available, skipping status publish for order {}", orderId);
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("orderNumber", orderNumber);
        payload.put("status", status);
        payload.put("note", note);
        payload.put("timestamp", LocalDateTime.now().toString());

        String destination = "/topic/orders/" + orderId + "/status";
        messagingTemplate.convertAndSend(destination, payload);
        log.info("[WEBSOCKET DISPATCH] Sent status update {} to {}", status, destination);
    }

    public void publishDeliveryLocation(Long orderId, Double latitude, Double longitude, String status) {
        if (messagingTemplate == null) {
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("latitude", latitude);
        payload.put("longitude", longitude);
        payload.put("status", status);
        payload.put("timestamp", LocalDateTime.now().toString());

        String destination = "/topic/orders/" + orderId + "/location";
        messagingTemplate.convertAndSend(destination, payload);
        log.info("[WEBSOCKET DISPATCH] Sent location ({}, {}) to {}", latitude, longitude, destination);
    }
}
