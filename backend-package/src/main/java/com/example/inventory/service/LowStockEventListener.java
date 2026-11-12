package com.example.inventory.service;

import com.example.inventory.event.LowStockEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Event listener that handles LowStockEvent asynchronously AFTER_COMMIT.
 * This guarantees the email dispatch occurs only after the database transaction is successfully committed,
 * and executes on a background thread so POS sales and sync operations are never blocked.
 */
@Component
public class LowStockEventListener {

    private static final Logger log = LoggerFactory.getLogger(LowStockEventListener.class);

    private final NotificationService notificationService;

    public LowStockEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleLowStockEvent(LowStockEvent event) {
        log.info("LowStockEventListener: Processing LowStockEvent for product '{}' (SKU: {}), current stock: {}, critical: {}",
                event.getProductName(), event.getSku(), event.getCurrentStock(), event.isCritical());
        try {
            notificationService.handleLowStockEvent(event);
        } catch (Exception ex) {
            log.error("Error processing LowStockEvent for product ID {}: {}", event.getProductId(), ex.getMessage(), ex);
        }
    }
}
