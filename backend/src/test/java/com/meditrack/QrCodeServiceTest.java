package com.meditrack;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.meditrack.order.Order;
import com.meditrack.order.QrCodeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.awt.image.BufferedImage;

import static org.junit.jupiter.api.Assertions.*;

class QrCodeServiceTest {

    private final QrCodeService qrCodeService = new QrCodeService();

    @Test
    @DisplayName("Verify ZXing generates valid PNG and can be decoded back to original content")
    void testQrCodeGenerationAndDecoding() throws Exception {
        String originalContent = "{\"orderNumber\":\"MT-20261017-1001\",\"pickupCode\":\"PK-8842\",\"customerId\":1,\"totalAmount\":450.50}";

        // 1. Generate PNG byte array
        byte[] pngBytes = qrCodeService.generateQrCodePng(originalContent, 200, 200);
        assertNotNull(pngBytes);
        assertTrue(pngBytes.length > 0);

        // Verify PNG magic header bytes: 0x89 'P' 'N' 'G' 0x0D 0x0A 0x1A 0x0A
        assertEquals((byte) 0x89, pngBytes[0]);
        assertEquals((byte) 'P', pngBytes[1]);
        assertEquals((byte) 'N', pngBytes[2]);
        assertEquals((byte) 'G', pngBytes[3]);

        // 2. Decode the generated PNG back using ZXing Reader to prove it is a real 2D barcode
        ByteArrayInputStream bais = new ByteArrayInputStream(pngBytes);
        BufferedImage bufferedImage = ImageIO.read(bais);
        assertNotNull(bufferedImage, "Must parse as valid BufferedImage");

        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(bufferedImage)));
        Result decodedResult = new MultiFormatReader().decode(bitmap);

        assertNotNull(decodedResult);
        assertEquals(originalContent, decodedResult.getText(), "Decoded QR text must strictly match encoded payload");

        // 3. Test Base64 data URL generation
        String base64Url = qrCodeService.generateQrCodeBase64(originalContent, 200, 200);
        assertNotNull(base64Url);
        assertTrue(base64Url.startsWith("data:image/png;base64,"));
    }

    @Test
    @DisplayName("Verify Order Pickup Payload structure")
    void testOrderPickupPayload() {
        Order order = new Order();
        order.setOrderNumber("MT-20261017-9999");
        order.setPickupCode("PK-1234");
        order.setCustomerId(5L);
        order.setTotalAmount(1250.0);

        String payload = qrCodeService.generateOrderPickupPayload(order);
        assertTrue(payload.contains("MT-20261017-9999"));
        assertTrue(payload.contains("PK-1234"));
        assertTrue(payload.contains("5"));
    }
}
