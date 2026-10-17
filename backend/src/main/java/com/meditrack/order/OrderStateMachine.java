package com.meditrack.order;

import com.meditrack.common.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class OrderStateMachine {

    private final OrderStatusHistoryRepository historyRepository;

    private static final Map<OrderStatus, Set<OrderStatus>> VALID_TRANSITIONS = new EnumMap<>(OrderStatus.class);

    static {
        VALID_TRANSITIONS.put(OrderStatus.PLACED, Set.of(OrderStatus.PRESCRIPTION_PENDING, OrderStatus.CONFIRMED, OrderStatus.CANCELLED));
        VALID_TRANSITIONS.put(OrderStatus.PRESCRIPTION_PENDING, Set.of(OrderStatus.CONFIRMED, OrderStatus.REJECTED, OrderStatus.CANCELLED));
        VALID_TRANSITIONS.put(OrderStatus.CONFIRMED, Set.of(OrderStatus.PROCESSING, OrderStatus.CANCELLED));
        VALID_TRANSITIONS.put(OrderStatus.PROCESSING, Set.of(OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED));
        VALID_TRANSITIONS.put(OrderStatus.READY_FOR_PICKUP, Set.of(OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.DELIVERED, OrderStatus.CANCELLED));
        VALID_TRANSITIONS.put(OrderStatus.ASSIGNED, Set.of(OrderStatus.PICKED_UP, OrderStatus.CANCELLED));
        VALID_TRANSITIONS.put(OrderStatus.PICKED_UP, Set.of(OrderStatus.OUT_FOR_DELIVERY));
        VALID_TRANSITIONS.put(OrderStatus.OUT_FOR_DELIVERY, Set.of(OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED));
        VALID_TRANSITIONS.put(OrderStatus.DELIVERY_FAILED, Set.of(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.RETURNED_TO_STORE));
        VALID_TRANSITIONS.put(OrderStatus.REJECTED, Collections.emptySet());
        VALID_TRANSITIONS.put(OrderStatus.DELIVERED, Collections.emptySet());
        VALID_TRANSITIONS.put(OrderStatus.CANCELLED, Collections.emptySet());
        VALID_TRANSITIONS.put(OrderStatus.RETURNED_TO_STORE, Collections.emptySet());
    }

    public OrderStateMachine(OrderStatusHistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    public void transition(Order order, OrderStatus newStatus, String actor, String note) {
        Set<OrderStatus> allowed = VALID_TRANSITIONS.getOrDefault(order.getStatus(), Collections.emptySet());
        if (!allowed.contains(newStatus)) {
            throw new BusinessException(
                    "Invalid state transition from " + order.getStatus() + " to " + newStatus,
                    HttpStatus.CONFLICT
            );
        }

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(newStatus);
        historyRepository.save(new OrderStatusHistory(order.getId(), oldStatus, newStatus, actor, note));
    }
}
