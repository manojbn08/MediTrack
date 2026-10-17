package com.meditrack.order;

import com.meditrack.cart.Cart;
import com.meditrack.cart.CartItem;
import com.meditrack.cart.CartService;
import com.meditrack.catalog.Product;
import com.meditrack.common.BusinessException;
import com.meditrack.delivery.Delivery;
import com.meditrack.delivery.DeliveryRepository;
import com.meditrack.delivery.DeliveryStatus;
import com.meditrack.inventory.InventoryService;
import com.meditrack.payment.Payment;
import com.meditrack.payment.PaymentRepository;
import com.meditrack.payment.PaymentStatus;
import com.meditrack.prescription.Prescription;
import com.meditrack.prescription.PrescriptionRepository;
import com.meditrack.prescription.PrescriptionStatus;
import com.meditrack.user.User;
import com.meditrack.user.UserRepository;
import com.meditrack.notification.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStateMachine orderStateMachine;
    private final CartService cartService;
    private final InventoryService inventoryService;
    private final PrescriptionRepository prescriptionRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final DeliveryRepository deliveryRepository;
    private final EmailService emailService;
    private final RealtimeTrackingService realtimeTrackingService;

    public OrderService(OrderRepository orderRepository,
                        OrderItemRepository orderItemRepository,
                        OrderStateMachine orderStateMachine,
                        CartService cartService,
                        InventoryService inventoryService,
                        PrescriptionRepository prescriptionRepository,
                        UserRepository userRepository,
                        PaymentRepository paymentRepository,
                        DeliveryRepository deliveryRepository,
                        EmailService emailService,
                        RealtimeTrackingService realtimeTrackingService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderStateMachine = orderStateMachine;
        this.cartService = cartService;
        this.inventoryService = inventoryService;
        this.prescriptionRepository = prescriptionRepository;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.deliveryRepository = deliveryRepository;
        this.emailService = emailService;
        this.realtimeTrackingService = realtimeTrackingService;
    }

    public static class CheckoutRequest {
        public Long addressId;
        public Long prescriptionId;
        public String paymentMethod = "ONLINE"; // ONLINE or COD
        public String couponCode;
        public Double deliveryLat = 12.9716;
        public Double deliveryLng = 77.5946;
        public String deliveryAddressSnapshot = "MG Road, Indiranagar, Bengaluru, 560038";
    }

    @Transactional
    public Order placeOrder(Long customerId, CheckoutRequest request) {
        Cart cart = cartService.getOrCreateCart(customerId);
        if (cart.getItems().isEmpty()) {
            throw new BusinessException("Cannot checkout: Cart is empty", HttpStatus.BAD_REQUEST);
        }

        User user = userRepository.findById(customerId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND));

        boolean hasRx = false;
        double subtotal = 0.0;
        double totalGst = 0.0;

        for (CartItem ci : cart.getItems()) {
            Product p = ci.getProduct();
            if (p.isRequiresPrescription()) {
                hasRx = true;
            }
            double linePrice = p.getMrp() * ci.getQuantity();
            subtotal += linePrice;
            totalGst += linePrice * (p.getGstPercent() / (100.0 + p.getGstPercent()));
        }

        if (hasRx) {
            if (request.prescriptionId == null) {
                throw new BusinessException("Order contains prescription medicines. Please attach a valid prescription.", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            Prescription rx = prescriptionRepository.findById(request.prescriptionId)
                    .orElseThrow(() -> new BusinessException("Prescription not found", HttpStatus.NOT_FOUND));
            if (rx.getStatus() == PrescriptionStatus.REJECTED) {
                throw new BusinessException("Attached prescription was rejected: " + rx.getRejectReason(), HttpStatus.UNPROCESSABLE_ENTITY);
            }
        }

        // Generate Order number
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randPart = String.format("%04d", new Random().nextInt(10000));
        String orderNumber = "MT-" + datePart + "-" + randPart;

        // Pickup Code & Customer Delivery OTP
        String pickupCode = "PK-" + String.format("%04d", new Random().nextInt(10000));
        String deliveryOtp = String.format("%04d", new Random().nextInt(10000));

        // Delivery Fee & Discount
        double deliveryFee = (subtotal >= 500.0) ? 0.0 : 40.0;
        double discount = 0.0;
        if ("WELCOME10".equalsIgnoreCase(request.couponCode)) {
            discount = Math.min(subtotal * 0.10, 100.0);
        } else if ("FLAT50".equalsIgnoreCase(request.couponCode) && subtotal >= 300.0) {
            discount = 50.0;
        }

        double totalAmount = Math.max(0.0, subtotal + deliveryFee - discount);

        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setCustomerId(customerId);
        order.setCustomerName(user.getFullName());
        order.setCustomerPhone(user.getPhone());
        order.setAddressId(request.addressId != null ? request.addressId : 1L);
        order.setDeliveryLat(request.deliveryLat != null ? request.deliveryLat : 12.9716);
        order.setDeliveryLng(request.deliveryLng != null ? request.deliveryLng : 77.5946);
        order.setDeliveryAddressSnapshot(request.deliveryAddressSnapshot);
        order.setPrescriptionId(request.prescriptionId);
        order.setHasRxItems(hasRx);
        order.setSubtotal(Math.round(subtotal * 100.0) / 100.0);
        order.setTaxAmount(Math.round(totalGst * 100.0) / 100.0);
        order.setDeliveryFee(deliveryFee);
        order.setDiscountAmount(discount);
        order.setTotalAmount(Math.round(totalAmount * 100.0) / 100.0);
        order.setCouponCode(request.couponCode);
        order.setPaymentMethod(PaymentMethod.valueOf(request.paymentMethod.toUpperCase()));
        order.setPickupCode(pickupCode);
        order.setDeliveryOtp(deliveryOtp);

        OrderStatus initialStatus = hasRx ? OrderStatus.PRESCRIPTION_PENDING : OrderStatus.CONFIRMED;
        order.setStatus(initialStatus);

        order = orderRepository.save(order);

        // FEFO Stock allocation per item
        for (CartItem ci : cart.getItems()) {
            Product p = ci.getProduct();
            List<InventoryService.BatchAllocation> allocations = inventoryService.allocateFEFO(p.getId(), ci.getQuantity());

            for (InventoryService.BatchAllocation alloc : allocations) {
                OrderItem oi = new OrderItem();
                oi.setOrder(order);
                oi.setProduct(p);
                oi.setBatchId(alloc.getBatch().getId());
                oi.setBatchNumber(alloc.getBatch().getBatchNumber());
                oi.setQuantity(alloc.getAllocatedQuantity());
                oi.setUnitPrice(p.getMrp());
                oi.setGstPercent(p.getGstPercent());
                oi.setLineTotal(p.getMrp() * alloc.getAllocatedQuantity());
                order.getItems().add(oi);
                orderItemRepository.save(oi);
            }
        }

        // Record Initial history
        orderStateMachine.transition(order, initialStatus, "CUSTOMER", "Order placed successfully");

        // Record Payment
        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setMethod(order.getPaymentMethod().name());
        payment.setAmount(order.getTotalAmount());
        payment.setCurrency("INR");
        if (order.getPaymentMethod() == PaymentMethod.COD) {
            payment.setStatus(PaymentStatus.PENDING_COD);
        } else {
            payment.setStatus(PaymentStatus.SUCCESS);
            payment.setGatewayPaymentId("pay_rzp_mock_" + UUID.randomUUID().toString().substring(0, 8));
            payment.setPaidAt(LocalDateTime.now());
        }
        paymentRepository.save(payment);

        // Clear cart
        cartService.clearCart(customerId);

        // Asynchronously dispatch email notification
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            emailService.sendOrderConfirmation(order, user.getEmail());
        }

        // Broadcast real-time order status via STOMP WebSocket
        realtimeTrackingService.publishOrderStatus(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus().name(),
                "Order placed successfully"
        );

        return order;
    }

    @Transactional(readOnly = true)
    public List<Order> getCustomerOrders(Long customerId) {
        return orderRepository.findByCustomerIdOrderByPlacedAtDesc(customerId);
    }

    @Transactional(readOnly = true)
    public Order getOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Order not found with id: " + id, HttpStatus.NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public List<Order> getPharmacistQueue(OrderStatus status) {
        if (status != null) {
            return orderRepository.findByStatusOrderByPlacedAtAsc(status);
        }
        return orderRepository.findAllByOrderByPlacedAtDesc();
    }

    @Transactional
    public Order pharmacistApproveRxOrder(Long orderId, Long pharmacistId) {
        Order order = getOrderById(orderId);
        order.setAssignedPharmacistId(pharmacistId);
        orderStateMachine.transition(order, OrderStatus.CONFIRMED, "PHARMACIST", "Prescription verified and approved");
        return orderRepository.save(order);
    }

    @Transactional
    public Order pharmacistRejectRxOrder(Long orderId, Long pharmacistId, String reason) {
        Order order = getOrderById(orderId);
        order.setAssignedPharmacistId(pharmacistId);
        orderStateMachine.transition(order, OrderStatus.REJECTED, "PHARMACIST", "Prescription rejected: " + reason);

        // Release allocated stock
        for (OrderItem oi : order.getItems()) {
            if (oi.getBatchId() != null) {
                inventoryService.releaseReservedStock(oi.getBatchId(), oi.getQuantity(), order.getId());
            }
        }
        return orderRepository.save(order);
    }

    @Transactional
    public Order pharmacistAcceptOrder(Long orderId, Long pharmacistId) {
        Order order = getOrderById(orderId);
        order.setAssignedPharmacistId(pharmacistId);
        orderStateMachine.transition(order, OrderStatus.PROCESSING, "PHARMACIST", "Pharmacist started picking items");
        return orderRepository.save(order);
    }

    @Transactional
    public Order pharmacistMarkReadyForPickup(Long orderId, Long pharmacistId) {
        Order order = getOrderById(orderId);
        order.setAssignedPharmacistId(pharmacistId);

        // Deduct picked stock from batches
        for (OrderItem oi : order.getItems()) {
            if (oi.getBatchId() != null) {
                inventoryService.confirmDeduction(oi.getBatchId(), oi.getQuantity(), order.getId());
            }
        }

        orderStateMachine.transition(order, OrderStatus.READY_FOR_PICKUP, "PHARMACIST", "Packed and ready for pickup");
        final Order savedOrder = orderRepository.save(order);

        // Create Delivery Record in SEARCHING status for delivery partner broadcast
        Optional<Delivery> optDelivery = deliveryRepository.findByOrderId(savedOrder.getId());
        if (optDelivery.isEmpty()) {
            Delivery d = new Delivery();
            d.setOrderId(savedOrder.getId());
            d.setStatus(DeliveryStatus.SEARCHING);
            d.setPickupLat(12.9716);
            d.setPickupLng(77.5946);
            d.setDeliveryLat(savedOrder.getDeliveryLat());
            d.setDeliveryLng(savedOrder.getDeliveryLng());
            d.setPickupCode(savedOrder.getPickupCode());
            d.setDeliveryOtp(savedOrder.getDeliveryOtp());
            d.setCodAmount(savedOrder.getPaymentMethod() == PaymentMethod.COD ? savedOrder.getTotalAmount() : 0.0);
            deliveryRepository.save(d);
        }

        return savedOrder;
    }

    @Transactional
    public Order cancelOrder(Long orderId, Long userId, String reason) {
        Order order = getOrderById(orderId);
        orderStateMachine.transition(order, OrderStatus.CANCELLED, "USER", reason);

        // Release stock
        for (OrderItem oi : order.getItems()) {
            if (oi.getBatchId() != null) {
                inventoryService.releaseReservedStock(oi.getBatchId(), oi.getQuantity(), order.getId());
            }
        }
        Order savedOrder = orderRepository.save(order);
        realtimeTrackingService.publishOrderStatus(savedOrder.getId(), savedOrder.getOrderNumber(), savedOrder.getStatus().name(), reason);
        return savedOrder;
    }

    @Transactional
    public Order pharmacistVerifyAndDeliverPickup(String orderNumber, String pickupCode, Long pharmacistId) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new BusinessException("Order not found with number: " + orderNumber, HttpStatus.NOT_FOUND));

        if (pickupCode == null || !pickupCode.trim().equalsIgnoreCase(order.getPickupCode().trim())) {
            throw new BusinessException("Invalid pickup code provided for order " + orderNumber, HttpStatus.BAD_REQUEST);
        }

        // Deduct picked stock from batches if not already deducted
        for (OrderItem oi : order.getItems()) {
            if (oi.getBatchId() != null) {
                try {
                    inventoryService.confirmDeduction(oi.getBatchId(), oi.getQuantity(), order.getId());
                } catch (Exception ignored) {}
            }
        }

        order.setAssignedPharmacistId(pharmacistId);
        orderStateMachine.transition(order, OrderStatus.DELIVERED, "PHARMACIST", "Handed over at counter with verified pickup QR/code");
        Order saved = orderRepository.save(order);

        realtimeTrackingService.publishOrderStatus(
                saved.getId(),
                saved.getOrderNumber(),
                saved.getStatus().name(),
                "Handed over at pharmacy counter"
        );

        return saved;
    }
}
