package com.meditrack.order;

import com.meditrack.common.ApiResponse;
import com.meditrack.common.BusinessException;
import com.meditrack.security.UserPrincipal;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/orders")
public class CustomerOrderController {

    private final OrderService orderService;
    private final InvoicePdfService invoicePdfService;
    private final QrCodeService qrCodeService;
    private final OrderReturnRepository orderReturnRepository;

    public CustomerOrderController(OrderService orderService,
                                   InvoicePdfService invoicePdfService,
                                   QrCodeService qrCodeService,
                                   OrderReturnRepository orderReturnRepository) {
        this.orderService = orderService;
        this.invoicePdfService = invoicePdfService;
        this.qrCodeService = qrCodeService;
        this.orderReturnRepository = orderReturnRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Order>> placeOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody OrderService.CheckoutRequest request) {
        Order order = orderService.placeOrder(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Order placed successfully", order));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Order>>> getMyOrders(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Order> orders = orderService.getCustomerOrders(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(orders));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Order>> getOrderDetails(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        verifyOrderOwnership(order, principal);
        return ResponseEntity.ok(ApiResponse.ok(order));
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        verifyOrderOwnership(order, principal);

        byte[] pdfBytes = invoicePdfService.generateInvoicePdf(order);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "invoice-" + order.getOrderNumber() + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    @GetMapping("/{id}/pickup-qr")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPickupQr(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        Order order = orderService.getOrderById(id);
        verifyOrderOwnership(order, principal);

        String payload = qrCodeService.generateOrderPickupPayload(order);
        String qrBase64 = qrCodeService.generateQrCodeBase64(payload, 250, 250);

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.getId());
        response.put("orderNumber", order.getOrderNumber());
        response.put("pickupCode", order.getPickupCode());
        response.put("qrCodeImage", qrBase64);
        response.put("instructions", "Present this QR code or pickup code to the counter pharmacist to collect your order.");

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/{id}/return")
    public ResponseEntity<ApiResponse<OrderReturn>> requestReturn(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Order order = orderService.getOrderById(id);
        verifyOrderOwnership(order, principal);

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BusinessException("Only delivered orders can be requested for return", HttpStatus.BAD_REQUEST);
        }

        String reason = body.getOrDefault("reason", "Medicine defect or incorrect item");
        OrderReturn orderReturn = new OrderReturn(order.getId(), order.getOrderNumber(), principal.getId(), reason, order.getTotalAmount());
        orderReturn = orderReturnRepository.save(orderReturn);

        return ResponseEntity.ok(ApiResponse.ok("Return request submitted for pharmacist inspection", orderReturn));
    }

    @GetMapping("/returns")
    public ResponseEntity<ApiResponse<List<OrderReturn>>> getMyReturns(@AuthenticationPrincipal UserPrincipal principal) {
        List<OrderReturn> returns = orderReturnRepository.findByCustomerIdOrderByCreatedAtDesc(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(returns));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Order>> cancelOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        Order order = orderService.getOrderById(id);
        verifyOrderOwnership(order, principal);

        String reason = body != null ? body.getOrDefault("reason", "Cancelled by customer") : "Cancelled by customer";
        Order cancelledOrder = orderService.cancelOrder(id, principal.getId(), reason);
        return ResponseEntity.ok(ApiResponse.ok("Order cancelled", cancelledOrder));
    }

    private void verifyOrderOwnership(Order order, UserPrincipal principal) {
        if (principal == null) {
            throw new BusinessException("Unauthorized", HttpStatus.UNAUTHORIZED);
        }
        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !order.getCustomerId().equals(principal.getId())) {
            throw new BusinessException("Access denied: You do not have permission to view this order", HttpStatus.FORBIDDEN);
        }
    }
}
