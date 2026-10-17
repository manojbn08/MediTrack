package com.meditrack;

import com.meditrack.order.RealtimeTrackingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;

class RealtimeTrackingServiceTest {

    @Test
    @DisplayName("Verify STOMP status update is published to /topic/orders/{id}/status")
    void testPublishOrderStatus() {
        SimpMessagingTemplate messagingTemplate = Mockito.mock(SimpMessagingTemplate.class);
        RealtimeTrackingService service = new RealtimeTrackingService(messagingTemplate);

        service.publishOrderStatus(42L, "MT-20261017-0042", "OUT_FOR_DELIVERY", "Rider assigned");

        ArgumentCaptor<String> destCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);

        verify(messagingTemplate).convertAndSend(destCaptor.capture(), payloadCaptor.capture());

        assertEquals("/topic/orders/42/status", destCaptor.getValue());
        assertTrue(payloadCaptor.getValue() instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) payloadCaptor.getValue();
        assertEquals("OUT_FOR_DELIVERY", map.get("status"));
        assertEquals("MT-20261017-0042", map.get("orderNumber"));
    }

    @Test
    @DisplayName("Verify STOMP delivery location coordinates are published to /topic/orders/{id}/location")
    void testPublishDeliveryLocation() {
        SimpMessagingTemplate messagingTemplate = Mockito.mock(SimpMessagingTemplate.class);
        RealtimeTrackingService service = new RealtimeTrackingService(messagingTemplate);

        service.publishDeliveryLocation(42L, 12.9716, 77.5946, "IN_TRANSIT");

        ArgumentCaptor<String> destCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);

        verify(messagingTemplate).convertAndSend(destCaptor.capture(), payloadCaptor.capture());

        assertEquals("/topic/orders/42/location", destCaptor.getValue());
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) payloadCaptor.getValue();
        assertEquals(12.9716, map.get("latitude"));
        assertEquals(77.5946, map.get("longitude"));
    }
}
