package com.meditrack.order;

import com.meditrack.common.ApiResponse;
import com.meditrack.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pharmacist/orders")
public class PharmacistOrderController {

    private final OrderService orderService;

    public PharmacistOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Order>>> getQueue(
            @RequestParam(required = false) OrderStatus status) {
        List<Order> orders = orderService.getPharmacistQueue(status);
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Order>> getOrder(@PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.ok(order));
    }

    @PostMapping("/{id}/rx-approve")
    public ResponseEntity<ApiResponse<Order>> approveRx(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Order order = orderService.pharmacistApproveRxOrder(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Prescription approved for order", order));
    }

    @PostMapping("/{id}/rx-reject")
    public ResponseEntity<ApiResponse<Order>> rejectRx(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "Prescription rejected by pharmacist");
        Order order = orderService.pharmacistRejectRxOrder(id, principal.getId(), reason);
        return ResponseEntity.ok(ApiResponse.ok("Prescription rejected", order));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<Order>> acceptOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Order order = orderService.pharmacistAcceptOrder(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Order processing started", order));
    }

    @PostMapping("/{id}/ready")
    public ResponseEntity<ApiResponse<Order>> markReady(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Order order = orderService.pharmacistMarkReadyForPickup(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Order is packed and ready for pickup", order));
    }

    @PostMapping("/verify-pickup")
    public ResponseEntity<ApiResponse<Order>> verifyPickup(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body) {
        String orderNumber = body.get("orderNumber");
        String pickupCode = body.get("pickupCode");
        Order order = orderService.pharmacistVerifyAndDeliverPickup(orderNumber, pickupCode, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Pickup verified and order marked as DELIVERED", order));
    }
}
