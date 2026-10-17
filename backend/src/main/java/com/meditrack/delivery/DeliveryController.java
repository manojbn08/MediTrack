package com.meditrack.delivery;

import com.meditrack.common.ApiResponse;
import com.meditrack.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    private final DeliveryService deliveryService;

    public DeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @GetMapping("/offers")
    public ResponseEntity<ApiResponse<List<Delivery>>> getOffers() {
        List<Delivery> offers = deliveryService.getAvailableOffers();
        return ResponseEntity.ok(ApiResponse.ok(offers));
    }

    @PostMapping("/offers/{id}/accept")
    public ResponseEntity<ApiResponse<Delivery>> acceptOffer(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Delivery delivery = deliveryService.acceptOffer(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Job accepted", delivery));
    }

    @PostMapping("/{id}/pickup")
    public ResponseEntity<ApiResponse<Delivery>> pickup(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String pickupCode = body.getOrDefault("pickupCode", "");
        Delivery delivery = deliveryService.pickupOrder(id, principal.getId(), pickupCode);
        return ResponseEntity.ok(ApiResponse.ok("Pickup verified and completed", delivery));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<Delivery>> startDelivery(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Delivery delivery = deliveryService.startJourney(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Out for delivery", delivery));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<Delivery>> completeDelivery(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String otp = body.getOrDefault("deliveryOtp", "").toString();
        boolean codCollected = body.containsKey("codCollected") && Boolean.parseBoolean(body.get("codCollected").toString());
        Delivery delivery = deliveryService.completeDelivery(id, principal.getId(), otp, codCollected);
        return ResponseEntity.ok(ApiResponse.ok("Delivery completed successfully", delivery));
    }

    @PostMapping("/{id}/fail")
    public ResponseEntity<ApiResponse<Delivery>> failDelivery(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "Customer unavailable");
        Delivery delivery = deliveryService.failDelivery(id, principal.getId(), reason);
        return ResponseEntity.ok(ApiResponse.ok("Delivery marked as failed", delivery));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<Delivery>>> getHistory(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Delivery> history = deliveryService.getPartnerHistory(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @GetMapping("/earnings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEarnings(
            @AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> earnings = deliveryService.getEarningsSummary(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(earnings));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<Delivery>> getDeliveryForOrder(@PathVariable Long orderId) {
        Delivery delivery = deliveryService.getDeliveryByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.ok(delivery));
    }
}
