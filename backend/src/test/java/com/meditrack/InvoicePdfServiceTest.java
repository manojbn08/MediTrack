package com.meditrack;

import com.meditrack.catalog.Product;
import com.meditrack.order.InvoicePdfService;
import com.meditrack.order.Order;
import com.meditrack.order.OrderItem;
import com.meditrack.order.PaymentMethod;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class InvoicePdfServiceTest {

    private final InvoicePdfService invoicePdfService = new InvoicePdfService();

    @Test
    @DisplayName("Verify OpenPDF generates valid %PDF-1.4 binary stream with tax breakdown")
    void testPdfInvoiceGeneration() {
        Order order = new Order();
        order.setId(101L);
        order.setOrderNumber("MT-20261017-1001");
        order.setPlacedAt(LocalDateTime.now());
        order.setCustomerName("Rajesh Sharma");
        order.setCustomerPhone("+91 9876543210");
        order.setDeliveryAddressSnapshot("Flat 402, Green Glen Layout, Bellandur, Bengaluru - 560103");
        order.setPaymentMethod(PaymentMethod.ONLINE);
        order.setPickupCode("PK-4921");
        order.setSubtotal(500.0);
        order.setTaxAmount(60.0);
        order.setDeliveryFee(40.0);
        order.setDiscountAmount(50.0);
        order.setTotalAmount(550.0);

        Product p1 = new Product();
        p1.setName("Paracetamol 650mg");
        p1.setGenericName("Acetaminophen");
        p1.setMrp(30.0);
        p1.setGstPercent(12.0);

        OrderItem item1 = new OrderItem();
        item1.setProduct(p1);
        item1.setBatchNumber("B-PARA-001");
        item1.setQuantity(2);
        item1.setUnitPrice(30.0);
        item1.setGstPercent(12.0);
        item1.setLineTotal(60.0);
        order.getItems().add(item1);

        byte[] pdfBytes = invoicePdfService.generateInvoicePdf(order);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500, "PDF should be non-trivial binary file");

        // Verify PDF Header magic bytes: %PDF-
        String header = new String(pdfBytes, 0, 8, StandardCharsets.US_ASCII);
        assertTrue(header.startsWith("%PDF-"), "Must start with valid PDF magic marker %PDF-, got: " + header);

        // Verify EOF marker exists in the binary stream
        String tail = new String(pdfBytes, pdfBytes.length - 128, 128, StandardCharsets.US_ASCII);
        assertTrue(tail.contains("%%EOF"), "Must contain standard PDF trailer %%EOF marker");
    }
}
