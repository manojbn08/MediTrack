package com.meditrack.order;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Event published to RabbitMQ when an order is successfully confirmed.
 * Enables guaranteed, decoupled background processing (PDF invoice generation,
 * audit logging, email dispatch) without blocking checkout response time.
 */
public class OrderPlacedEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long orderId;
    private String orderNumber;
    private Long customerId;
    private String customerEmail;
    private String customerName;
    private Double totalAmount;
    private String status;
    private LocalDateTime placedAt;

    public OrderPlacedEvent() {
    }

    public OrderPlacedEvent(Long orderId, String orderNumber, Long customerId, String customerEmail, String customerName, Double totalAmount, String status, LocalDateTime placedAt) {
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.customerId = customerId;
        this.customerEmail = customerEmail;
        this.customerName = customerName;
        this.totalAmount = totalAmount;
        this.status = status;
        this.placedAt = placedAt;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getPlacedAt() {
        return placedAt;
    }

    public void setPlacedAt(LocalDateTime placedAt) {
        this.placedAt = placedAt;
    }

    @Override
    public String toString() {
        return "OrderPlacedEvent{" +
                "orderId=" + orderId +
                ", orderNumber='" + orderNumber + '\'' +
                ", customerEmail='" + customerEmail + '\'' +
                ", totalAmount=" + totalAmount +
                ", status='" + status + '\'' +
                '}';
    }
}
