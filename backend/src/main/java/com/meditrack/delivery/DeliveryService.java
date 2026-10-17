package com.meditrack.delivery;

import com.meditrack.common.BusinessException;
import com.meditrack.order.Order;
import com.meditrack.order.OrderRepository;
import com.meditrack.order.OrderStatus;
import com.meditrack.order.OrderStateMachine;
import com.meditrack.order.RealtimeTrackingService;
import com.meditrack.payment.Payment;
import com.meditrack.payment.PaymentRepository;
import com.meditrack.payment.PaymentStatus;
import com.meditrack.user.DeliveryPartnerProfile;
import com.meditrack.user.DeliveryPartnerProfileRepository;
import com.meditrack.user.User;
import com.meditrack.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final OrderStateMachine orderStateMachine;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final RealtimeTrackingService realtimeTrackingService;
    private final DeliveryPartnerProfileRepository deliveryPartnerProfileRepository;

    public DeliveryService(DeliveryRepository deliveryRepository,
                           OrderRepository orderRepository,
                           OrderStateMachine orderStateMachine,
                           UserRepository userRepository,
                           PaymentRepository paymentRepository,
                           RealtimeTrackingService realtimeTrackingService,
                           DeliveryPartnerProfileRepository deliveryPartnerProfileRepository) {
        this.deliveryRepository = deliveryRepository;
        this.orderRepository = orderRepository;
        this.orderStateMachine = orderStateMachine;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.realtimeTrackingService = realtimeTrackingService;
        this.deliveryPartnerProfileRepository = deliveryPartnerProfileRepository;
    }

    @Transactional(readOnly = true)
    public List<Delivery> getAvailableOffers() {
        return deliveryRepository.findByStatus(DeliveryStatus.SEARCHING);
    }

    @Transactional(readOnly = true)
    public List<Delivery> getPartnerHistory(Long partnerId) {
        return deliveryRepository.findByPartnerIdOrderByAssignedAtDesc(partnerId);
    }

    @Transactional(readOnly = true)
    public Delivery getDeliveryByOrderId(Long orderId) {
        return deliveryRepository.findByOrderId(orderId)
                .orElseThrow(() -> new BusinessException("Delivery not found for order id: " + orderId, HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Delivery acceptOffer(Long deliveryId, Long partnerId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new BusinessException("Delivery offer not found", HttpStatus.NOT_FOUND));

        if (delivery.getStatus() != DeliveryStatus.SEARCHING) {
            throw new BusinessException("Delivery already accepted by another partner", HttpStatus.CONFLICT);
        }

        User partner = userRepository.findById(partnerId)
                .orElseThrow(() -> new BusinessException("Partner not found", HttpStatus.NOT_FOUND));

        delivery.setPartnerId(partnerId);
        delivery.setPartnerName(partner.getFullName());
        delivery.setPartnerPhone(partner.getPhone());
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        delivery.setAssignedAt(LocalDateTime.now());

        Optional<DeliveryPartnerProfile> profileOpt = deliveryPartnerProfileRepository.findById(partnerId);
        if (profileOpt.isPresent()) {
            DeliveryPartnerProfile profile = profileOpt.get();
            if (profile.getCurrentLat() != null && profile.getCurrentLng() != null) {
                delivery.setCurrentLat(profile.getCurrentLat());
                delivery.setCurrentLng(profile.getCurrentLng());
            }
        }

        delivery = deliveryRepository.save(delivery);

        Order order = orderRepository.findById(delivery.getOrderId()).orElseThrow();
        orderStateMachine.transition(order, OrderStatus.ASSIGNED, "DELIVERY", "Assigned to partner " + partner.getFullName());
        orderRepository.save(order);

        String vehicleNo = deliveryPartnerProfileRepository.findById(partnerId)
                .map(DeliveryPartnerProfile::getVehicleNumber).orElse("KA-01-EQ-9999");

        realtimeTrackingService.publishCourierAssignedToPharmacist(order.getId(), partner.getFullName(), partner.getPhone(), vehicleNo);
        realtimeTrackingService.publishOrderStatus(
                order.getId(),
                order.getOrderNumber(),
                OrderStatus.ASSIGNED.name(),
                "Delivery partner " + partner.getFullName() + " accepted the pickup"
        );

        return delivery;
    }

    @Transactional
    public Delivery pickupOrder(Long deliveryId, Long partnerId, String pickupCode) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new BusinessException("Delivery not found", HttpStatus.NOT_FOUND));

        if (!delivery.getPickupCode().equalsIgnoreCase(pickupCode.trim())) {
            throw new BusinessException("Invalid pickup code. Pharmacist verification failed.", HttpStatus.BAD_REQUEST);
        }

        delivery.setStatus(DeliveryStatus.PICKED_UP);
        delivery.setPickedUpAt(LocalDateTime.now());
        delivery = deliveryRepository.save(delivery);

        Order order = orderRepository.findById(delivery.getOrderId()).orElseThrow();
        orderStateMachine.transition(order, OrderStatus.PICKED_UP, "DELIVERY", "Picked up from pharmacy counter");
        orderRepository.save(order);

        realtimeTrackingService.publishOrderStatus(
                order.getId(),
                order.getOrderNumber(),
                OrderStatus.PICKED_UP.name(),
                "Order picked up from pharmacy by partner"
        );

        return delivery;
    }

    @Transactional
    public Delivery startJourney(Long deliveryId, Long partnerId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new BusinessException("Delivery not found", HttpStatus.NOT_FOUND));

        delivery.setStatus(DeliveryStatus.IN_TRANSIT);

        Order order = orderRepository.findById(delivery.getOrderId()).orElseThrow();
        orderStateMachine.transition(order, OrderStatus.OUT_FOR_DELIVERY, "DELIVERY", "Partner is on the way. Delivery OTP generated.");
        orderRepository.save(order);

        double roadDistanceKm = calculateRoadDistance(delivery.getPickupLat(), delivery.getPickupLng(), delivery.getDeliveryLat(), delivery.getDeliveryLng());
        double etaMinutes = Math.max(10.0, Math.round(4.0 + (roadDistanceKm / 22.0) * 60.0));

        delivery.setDistanceKm(roadDistanceKm);
        delivery.setEtaMinutes((int) etaMinutes);
        delivery = deliveryRepository.save(delivery);

        realtimeTrackingService.publishOrderStatus(
                order.getId(),
                order.getOrderNumber(),
                OrderStatus.OUT_FOR_DELIVERY.name(),
                "Partner is on the way with your medicines. ETA: " + (int)etaMinutes + " mins (" + roadDistanceKm + " km)",
                etaMinutes
        );

        return delivery;
    }

    @Transactional
    public Delivery updateLocation(Long deliveryId, Long partnerId, Double lat, Double lng) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new BusinessException("Delivery not found", HttpStatus.NOT_FOUND));

        deliveryPartnerProfileRepository.findById(partnerId).ifPresent(p -> {
            p.setCurrentLat(lat);
            p.setCurrentLng(lng);
            p.setLastLocationAt(LocalDateTime.now());
            deliveryPartnerProfileRepository.save(p);
        });

        // Compute straight-line distance to destination and apply road circuity factor (1.35x)
        double straightKm = calculateHaversine(lat, lng, delivery.getDeliveryLat(), delivery.getDeliveryLng());
        // Cap straightKm to operational zone boundary (15.0 km) to safeguard against invalid remote GPS
        double effectiveStraightKm = Math.min(15.0, straightKm);
        double remainingRoadKm = Math.max(0.2, Math.round(effectiveStraightKm * 1.35 * 10.0) / 10.0);
        double etaMinutes = Math.max(2.0, Math.round(2.0 + (remainingRoadKm / 22.0) * 60.0));

        delivery.setCurrentLat(lat);
        delivery.setCurrentLng(lng);
        delivery.setDistanceKm(remainingRoadKm);
        delivery.setEtaMinutes((int) etaMinutes);
        delivery = deliveryRepository.save(delivery);

        realtimeTrackingService.publishDeliveryLocation(
                delivery.getOrderId(),
                lat,
                lng,
                delivery.getStatus().name(),
                remainingRoadKm,
                etaMinutes
        );

        return delivery;
    }

    @Transactional
    public Delivery completeDelivery(Long deliveryId, Long partnerId, String deliveryOtp, boolean codCollected) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new BusinessException("Delivery not found", HttpStatus.NOT_FOUND));

        if (!delivery.getDeliveryOtp().equals(deliveryOtp.trim())) {
            throw new BusinessException("Invalid customer Delivery OTP", HttpStatus.BAD_REQUEST);
        }

        delivery.setStatus(DeliveryStatus.DELIVERED);
        delivery.setDeliveredAt(LocalDateTime.now());
        delivery.setCodCollected(codCollected);
        delivery = deliveryRepository.save(delivery);

        Order order = orderRepository.findById(delivery.getOrderId()).orElseThrow();
        orderStateMachine.transition(order, OrderStatus.DELIVERED, "DELIVERY", "Delivered successfully with customer OTP verification");
        orderRepository.save(order);

        // Update Payment status if COD
        if (codCollected) {
            paymentRepository.findByOrderId(order.getId()).ifPresent(p -> {
                p.setStatus(PaymentStatus.COD_COLLECTED);
                p.setPaidAt(LocalDateTime.now());
                paymentRepository.save(p);
            });
        }

        realtimeTrackingService.publishOrderStatus(
                order.getId(),
                order.getOrderNumber(),
                OrderStatus.DELIVERED.name(),
                "Delivered successfully"
        );

        return delivery;
    }

    @Transactional
    public Delivery failDelivery(Long deliveryId, Long partnerId, String reason) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new BusinessException("Delivery not found", HttpStatus.NOT_FOUND));

        delivery.setStatus(DeliveryStatus.FAILED);
        delivery = deliveryRepository.save(delivery);

        Order order = orderRepository.findById(delivery.getOrderId()).orElseThrow();
        orderStateMachine.transition(order, OrderStatus.DELIVERY_FAILED, "DELIVERY", "Delivery failed: " + reason);
        orderRepository.save(order);

        realtimeTrackingService.publishOrderStatus(
                order.getId(),
                order.getOrderNumber(),
                OrderStatus.DELIVERY_FAILED.name(),
                "Delivery attempt failed: " + reason
        );

        return delivery;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEarningsSummary(Long partnerId) {
        List<Delivery> delivered = deliveryRepository.findByPartnerIdAndStatus(partnerId, DeliveryStatus.DELIVERED);
        double totalPayout = delivered.size() * 50.0; // Flat ₹50 per delivery
        int count = delivered.size();
        return Map.of(
                "partnerId", partnerId,
                "totalDelivered", count,
                "earningsPerDelivery", 50.0,
                "totalEarnings", totalPayout,
                "currency", "INR"
        );
    }

    public double calculateHaversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in KM
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 100.0) / 100.0;
    }

    public double calculateRoadDistance(double lat1, double lon1, double lat2, double lon2) {
        double straight = calculateHaversine(lat1, lon1, lat2, lon2);
        // Standard urban road circuity factor 1.35x
        return Math.max(0.2, Math.round(straight * 1.35 * 10.0) / 10.0);
    }
}
