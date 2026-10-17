package com.meditrack.order;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_returns")
public class OrderReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_number", nullable = false)
    private String orderNumber;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReturnStatus status = ReturnStatus.PENDING_INSPECTION;

    @Column(name = "refund_amount")
    private Double refundAmount;

    @Column(name = "inspected_by_pharmacist_id")
    private Long inspectedByPharmacistId;

    @Column(name = "pharmacist_notes", length = 500)
    private String pharmacistNotes;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum ReturnStatus {
        PENDING_INSPECTION,
        APPROVED_REFUNDED,
        REJECTED
    }

    public OrderReturn() {}

    public OrderReturn(Long orderId, String orderNumber, Long customerId, String reason, Double refundAmount) {
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.customerId = customerId;
        this.reason = reason;
        this.refundAmount = refundAmount;
        this.status = ReturnStatus.PENDING_INSPECTION;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public ReturnStatus getStatus() { return status; }
    public void setStatus(ReturnStatus status) { this.status = status; }

    public Double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(Double refundAmount) { this.refundAmount = refundAmount; }

    public Long getInspectedByPharmacistId() { return inspectedByPharmacistId; }
    public void setInspectedByPharmacistId(Long inspectedByPharmacistId) { this.inspectedByPharmacistId = inspectedByPharmacistId; }

    public String getPharmacistNotes() { return pharmacistNotes; }
    public void setPharmacistNotes(String pharmacistNotes) { this.pharmacistNotes = pharmacistNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
