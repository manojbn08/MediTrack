package com.meditrack.order;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;

@Service
public class QrCodeService {

    public byte[] generateQrCodePng(String content, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height);

            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            return pngOutputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR Code: " + e.getMessage(), e);
        }
    }

    public String generateQrCodeBase64(String content, int width, int height) {
        byte[] pngData = generateQrCodePng(content, width, height);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(pngData);
    }

    public String generateOrderPickupPayload(Order order) {
        return String.format(
                "{\"orderNumber\":\"%s\",\"pickupCode\":\"%s\",\"customerId\":%d,\"totalAmount\":%.2f}",
                order.getOrderNumber(),
                order.getPickupCode() != null ? order.getPickupCode() : "NONE",
                order.getCustomerId(),
                order.getTotalAmount() != null ? order.getTotalAmount() : 0.0
        );
    }
}
