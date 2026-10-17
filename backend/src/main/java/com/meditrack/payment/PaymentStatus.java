package com.meditrack.payment;

public enum PaymentStatus {
    CREATED,
    SUCCESS,
    FAILED,
    PENDING_COD,
    COD_COLLECTED,
    REFUNDED
}
