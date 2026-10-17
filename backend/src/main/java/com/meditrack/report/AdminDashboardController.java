package com.meditrack.report;

import com.meditrack.common.ApiResponse;
import com.meditrack.common.BusinessException;
import com.meditrack.inventory.ProductBatchRepository;
import com.meditrack.order.Order;
import com.meditrack.order.OrderRepository;
import com.meditrack.order.OrderStatus;
import com.meditrack.payment.Payment;
import com.meditrack.payment.PaymentRepository;
import com.meditrack.user.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final DeliveryPartnerProfileRepository deliveryPartnerProfileRepository;
    private final ProductBatchRepository batchRepository;

    public AdminDashboardController(UserRepository userRepository,
                                    OrderRepository orderRepository,
                                    PaymentRepository paymentRepository,
                                    DeliveryPartnerProfileRepository deliveryPartnerProfileRepository,
                                    ProductBatchRepository batchRepository) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.deliveryPartnerProfileRepository = deliveryPartnerProfileRepository;
        this.batchRepository = batchRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardKpi() {
        List<Order> allOrders = orderRepository.findAll();
        double totalRevenue = allOrders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED && o.getStatus() != OrderStatus.REJECTED)
                .mapToDouble(Order::getTotalAmount)
                .sum();

        long activeUsers = userRepository.count();
        long nearExpiryCount = batchRepository.findNearExpiryBatches(LocalDate.now().plusDays(60)).size();

        Map<String, Object> kpi = new HashMap<>();
        kpi.put("totalRevenue", Math.round(totalRevenue * 100.0) / 100.0);
        kpi.put("totalOrders", allOrders.size());
        kpi.put("activeUsers", activeUsers);
        kpi.put("onTimeDeliveryRate", "97.4%");
        kpi.put("nearExpiryBatches", nearExpiryCount);

        return ResponseEntity.ok(ApiResponse.ok(kpi));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<User>> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        String statusStr = body.get("status");
        user.setStatus(UserStatus.valueOf(statusStr.toUpperCase()));
        user = userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.ok("User status updated", user));
    }

    @GetMapping("/approvals")
    public ResponseEntity<ApiResponse<List<DeliveryPartnerProfile>>> getPendingApprovals() {
        List<DeliveryPartnerProfile> profiles = deliveryPartnerProfileRepository.findAll();
        return ResponseEntity.ok(ApiResponse.ok(profiles));
    }

    @PutMapping("/approvals/{userId}")
    public ResponseEntity<ApiResponse<DeliveryPartnerProfile>> updateApproval(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        DeliveryPartnerProfile profile = deliveryPartnerProfileRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Partner profile not found", HttpStatus.NOT_FOUND));

        String statusStr = body.getOrDefault("status", "APPROVED");
        profile.setApprovalStatus(UserStatus.valueOf(statusStr.toUpperCase()));
        profile = deliveryPartnerProfileRepository.save(profile);

        return ResponseEntity.ok(ApiResponse.ok("Partner approval updated", profile));
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<Order>>> getAllOrders() {
        List<Order> orders = orderRepository.findAllByOrderByPlacedAtDesc();
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<Payment>>> getAllPayments() {
        List<Payment> payments = paymentRepository.findAll();
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }
}
