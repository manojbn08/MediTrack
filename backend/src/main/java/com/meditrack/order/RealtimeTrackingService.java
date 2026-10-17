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
        publishOrderStatus(orderId, orderNumber, status, note, null);
    }

    public void publishOrderStatus(Long orderId, String orderNumber, String status, String note, Double etaMinutes) {
        if (messagingTemplate == null) return;

        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("orderNumber", orderNumber);
        payload.put("status", status);
        payload.put("note", note);
        if (etaMinutes != null) {
            payload.put("etaMinutes", etaMinutes);
        }
        payload.put("timestamp", LocalDateTime.now().toString());

        String destination = "/topic/orders/" + orderId + "/status";
        messagingTemplate.convertAndSend(destination, payload);
        log.info("[WEBSOCKET DISPATCH] Sent status update {} to {}", status, destination);
    }

    public void publishDeliveryLocation(Long orderId, Double latitude, Double longitude, String status) {
        publishDeliveryLocation(orderId, latitude, longitude, status, null, null);
    }

    public void publishDeliveryLocation(Long orderId, Double latitude, Double longitude, String status, Double remainingDistanceKm, Double etaMinutes) {
        if (messagingTemplate == null) return;

        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("latitude", latitude);
        payload.put("longitude", longitude);
        payload.put("status", status);
        if (remainingDistanceKm != null) {
            payload.put("remainingDistanceKm", remainingDistanceKm);
        }
        if (etaMinutes != null) {
            payload.put("etaMinutes", etaMinutes);
        }
        payload.put("timestamp", LocalDateTime.now().toString());

        String destination = "/topic/orders/" + orderId + "/location";
        messagingTemplate.convertAndSend(destination, payload);
        log.info("[WEBSOCKET DISPATCH] Sent location ({}, {}) to {}", latitude, longitude, destination);
    }

    public void publishNewOrderToPharmacists(Order order) {
        if (messagingTemplate == null) return;

        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", order.getId());
        payload.put("orderNumber", order.getOrderNumber());
        payload.put("customerName", order.getCustomerName());
        payload.put("hasRxItems", order.isHasRxItems());
        payload.put("totalAmount", order.getTotalAmount());
        payload.put("status", order.getStatus().name());
        payload.put("timestamp", LocalDateTime.now().toString());

        messagingTemplate.convertAndSend("/topic/pharmacist/orders", payload);
        log.info("[WEBSOCKET DISPATCH] Broadcast new order {} to /topic/pharmacist/orders", order.getOrderNumber());
    }

    public void publishAvailablePickupToCouriers(Order order) {
        if (messagingTemplate == null) return;

        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", order.getId());
        payload.put("orderNumber", order.getOrderNumber());
        payload.put("pickupCode", order.getPickupCode());
        payload.put("deliveryAddress", order.getDeliveryAddressSnapshot());
        payload.put("deliveryLat", order.getDeliveryLat());
        payload.put("deliveryLng", order.getDeliveryLng());
        payload.put("totalAmount", order.getTotalAmount());
        payload.put("paymentMethod", order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "ONLINE");
        payload.put("timestamp", LocalDateTime.now().toString());

        messagingTemplate.convertAndSend("/topic/delivery/available-pickups", payload);
        log.info("[WEBSOCKET DISPATCH] Broadcast available pickup {} to /topic/delivery/available-pickups", order.getOrderNumber());
    }

    public void publishCourierAssignedToPharmacist(Long orderId, String courierName, String courierPhone, String vehicleNumber) {
        if (messagingTemplate == null) return;

        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("courierName", courierName);
        payload.put("courierPhone", courierPhone);
        payload.put("vehicleNumber", vehicleNumber);
        payload.put("timestamp", LocalDateTime.now().toString());

        String destination = "/topic/pharmacist/orders/" + orderId + "/courier";
        messagingTemplate.convertAndSend(destination, payload);
        log.info("[WEBSOCKET DISPATCH] Notified pharmacist of assigned courier for order {}", orderId);
    }
}
