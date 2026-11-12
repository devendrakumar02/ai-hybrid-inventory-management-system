package com.example.inventory.service;

import com.example.inventory.dto.AlertQueueItem;
import com.example.inventory.entity.Product;
import com.example.inventory.entity.StockAlert;
import com.example.inventory.repository.StockAlertRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.File;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ThresholdAlertEngineTest {

    private static final String TEST_DB_PATH = "test_alert_queue.db";
    private AlertQueueSqliteManager sqliteQueue;
    private StockAlertRepository mockAlertRepo;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        // Delete test DB if exists
        File dbFile = new File(TEST_DB_PATH);
        if (dbFile.exists()) {
            dbFile.delete();
        }

        sqliteQueue = new AlertQueueSqliteManager(TEST_DB_PATH);
        sqliteQueue.initDatabase();

        mockAlertRepo = mock(StockAlertRepository.class);
        when(mockAlertRepo.save(any(StockAlert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService = new NotificationService(
                mockAlertRepo,
                sqliteQueue,
                "smtp.gmail.com",
                587,
                "test@example.com",
                "secret",
                "manager@example.com"
        );
    }

    @AfterEach
    void tearDown() {
        File dbFile = new File(TEST_DB_PATH);
        if (dbFile.exists()) {
            dbFile.delete();
        }
    }

    @Test
    void testSqliteQueueEnqueueAndMarkSent() {
        Long id = sqliteQueue.enqueueAlert(
                101L,
                "Organic Basmati Rice 5kg",
                "SKU-RICE-001",
                4,
                10,
                16,
                "manager@example.com",
                "Stock quantity <= minimum threshold"
        );

        assertNotNull(id);
        assertEquals(1, sqliteQueue.countPending());

        List<AlertQueueItem> pending = sqliteQueue.getPendingAlerts();
        assertEquals(1, pending.size());

        AlertQueueItem item = pending.get(0);
        assertEquals("Organic Basmati Rice 5kg", item.productName());
        assertEquals("SKU-RICE-001", item.sku());
        assertEquals(4, item.currentStock());
        assertEquals(10, item.minThresholdStock());
        assertEquals(16, item.recommendedReorderQuantity());
        assertEquals("PENDING", item.status());

        // Mark sent
        sqliteQueue.markSent(id);
        assertEquals(0, sqliteQueue.countPending());
        assertEquals(1, sqliteQueue.countSent());
    }

    @Test
    void testStockAboveThresholdDoesNotTriggerAlert() {
        Product safeProduct = new Product();
        safeProduct.setId(201L);
        safeProduct.setProductName("Cooking Oil");
        safeProduct.setBarcode("SKU-OIL-123");
        safeProduct.setQuantity(50);
        safeProduct.setMinimumStockLevel(10);

        StockAlert alert = notificationService.checkAndCreateLowStockAlert(safeProduct);
        assertNull(alert, "Should not trigger alert when quantity > threshold");
        assertEquals(0, sqliteQueue.countPending());
    }

    @Test
    void testOfflineStockBelowThresholdQueuesInSqliteWithPendingStatus() {
        // Force offline mode
        notificationService.setSimulatedOffline(true);

        Product lowProduct = new Product();
        lowProduct.setId(202L);
        lowProduct.setProductName("Refined Sugar 1kg");
        lowProduct.setBarcode("SKU-SUGAR-789");
        lowProduct.setQuantity(3);
        lowProduct.setMinimumStockLevel(15);

        StockAlert alert = notificationService.checkAndCreateLowStockAlert(lowProduct);

        assertNotNull(alert);
        assertEquals("PENDING", alert.getStatus());
        assertEquals("Refined Sugar 1kg", alert.getProductName());
        assertEquals("SKU-SUGAR-789", alert.getSku());
        assertEquals(3, alert.getCurrentStock());
        assertEquals(15, alert.getMinimumStockLevel());
        // Recommended reorder: max(15*2 - 3, 15) = 27
        assertEquals(27, alert.getRecommendedReorderQuantity());

        // Verify queued in SQLite alert_queue table
        assertEquals(1, sqliteQueue.countPending());
        List<AlertQueueItem> pending = sqliteQueue.getPendingAlerts();
        assertEquals("Refined Sugar 1kg", pending.get(0).productName());
        assertEquals("SKU-SUGAR-789", pending.get(0).sku());
        assertEquals("PENDING", pending.get(0).status());
    }

    @Test
    void testProcessPendingAlertsReportsStatusAccurately() {
        sqliteQueue.enqueueAlert(
                301L,
                "Whole Wheat Flour 10kg",
                "SKU-WHEAT-555",
                2,
                8,
                14,
                "manager@example.com",
                "Offline alert awaiting flush"
        );

        assertEquals(1, sqliteQueue.countPending());

        // When offline, processPendingAlerts gracefully reports offline and keeps in SQLite
        notificationService.setSimulatedOffline(true);
        var offlineResult = notificationService.processPendingAlerts();
        assertFalse((Boolean) offlineResult.get("online"));
        assertEquals(1, sqliteQueue.countPending());
    }
}
