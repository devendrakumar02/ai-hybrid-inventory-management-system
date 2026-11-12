package com.example.inventory.service;

import com.example.inventory.controller.SyncController;
import com.example.inventory.dto.TransactionRequest;
import com.example.inventory.entity.InventoryTransaction;
import com.example.inventory.entity.Product;
import com.example.inventory.entity.StockAlert;
import com.example.inventory.event.LowStockEvent;
import com.example.inventory.repository.AlertRecipientConfigRepository;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.repository.StockAlertRepository;
import com.example.inventory.repository.TransactionRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.io.File;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Comprehensive verification of the Event-Driven Automatic Low-Stock Email Alert System:
 * 1. Email sent on threshold crossing
 * 2. No duplicate on repeated sales (24h cooldown + restock reset flag)
 * 3. Retry after simulated SMTP failure (pending status, exponential backoff, retry success, and failed after max retries)
 * 4. Alert created when offline sync pushes stock below minimum
 */
class AutomaticLowStockAlertTest {

    private static final String TEST_DB_PATH = "test_auto_alerts.db";

    private StockAlertRepository mockAlertRepo;
    private ProductRepository mockProductRepo;
    private TransactionRepository mockTxRepo;
    private AlertRecipientConfigRepository mockRecipientConfigRepo;
    private ApplicationEventPublisher mockEventPublisher;
    private JavaMailSender mockMailSender;
    private AlertQueueSqliteManager sqliteQueue;

    private NotificationService notificationService;
    private ProductService productService;
    private TransactionService transactionService;
    private SyncController syncController;

    private final Map<Long, StockAlert> alertDatabase = new LinkedHashMap<>();
    private long alertIdCounter = 1L;

    @BeforeEach
    void setUp() {
        // Clean up test SQLite db if present
        File dbFile = new File(TEST_DB_PATH);
        if (dbFile.exists()) {
            dbFile.delete();
        }

        sqliteQueue = new AlertQueueSqliteManager(TEST_DB_PATH);
        sqliteQueue.initDatabase();

        alertDatabase.clear();
        alertIdCounter = 1L;

        // Mock repositories
        mockAlertRepo = mock(StockAlertRepository.class);
        when(mockAlertRepo.save(any(StockAlert.class))).thenAnswer(invocation -> {
            StockAlert alert = invocation.getArgument(0);
            if (alert.getId() == null) {
                alert.setId(alertIdCounter++);
            }
            alertDatabase.put(alert.getId(), alert);
            return alert;
        });
        when(mockAlertRepo.findById(anyLong())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return Optional.ofNullable(alertDatabase.get(id));
        });
        when(mockAlertRepo.findByStatus(anyString())).thenAnswer(invocation -> {
            String status = invocation.getArgument(0);
            return alertDatabase.values().stream()
                    .filter(a -> status.equalsIgnoreCase(a.getStatus()))
                    .toList();
        });
        when(mockAlertRepo.countByStatus(anyString())).thenAnswer(invocation -> {
            String status = invocation.getArgument(0);
            return alertDatabase.values().stream()
                    .filter(a -> status.equalsIgnoreCase(a.getStatus()))
                    .count();
        });

        mockProductRepo = mock(ProductRepository.class);
        when(mockProductRepo.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockTxRepo = mock(TransactionRepository.class);
        when(mockTxRepo.save(any(InventoryTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mockTxRepo.findByLocalTransactionId(anyString())).thenReturn(Optional.empty());

        mockRecipientConfigRepo = mock(AlertRecipientConfigRepository.class);
        mockEventPublisher = mock(ApplicationEventPublisher.class);

        // Mock JavaMailSender
        mockMailSender = mock(JavaMailSender.class);
        when(mockMailSender.createMimeMessage()).thenAnswer(inv -> new MimeMessage((Session) null));

        // Real notification service
        notificationService = new NotificationService(
                mockAlertRepo,
                sqliteQueue,
                mockRecipientConfigRepo,
                mockProductRepo,
                mockMailSender,
                "smtp.test.com",
                587,
                "alerts@store.com",
                "secret",
                "admin@store.com",
                "manager@store.com"
        );
        notificationService.setSimulatedOnline(true);

        // Real product service
        productService = new ProductService(
                mockProductRepo,
                notificationService,
                mockEventPublisher,
                24
        );

        // Real transaction service
        transactionService = new TransactionService(
                mockProductRepo,
                mockTxRepo,
                productService
        );

        syncController = new SyncController(transactionService);
    }

    @AfterEach
    void tearDown() {
        File dbFile = new File(TEST_DB_PATH);
        if (dbFile.exists()) {
            dbFile.delete();
        }
    }

    @Test
    @DisplayName("1. Email sent on threshold crossing: POS sale reduces stock <= min_stock_level, alert saved as PENDING then SENT")
    void testEmailSentOnThresholdCrossing() {
        // Given: Product with initial stock 15, minimum threshold 10
        Product product = new Product();
        product.setId(10L);
        product.setProductName("Basmati Rice 5kg");
        product.setBarcode("8901234567890");
        product.setCategory("Grains");
        product.setSupplier("Agro Mills");
        product.setQuantity(15);
        product.setMinimumStockLevel(10);
        product.setRestockedAboveMin(true);

        when(mockProductRepo.findById(10L)).thenReturn(Optional.of(product));

        // When: POS sale occurs selling 7 units (new stock = 8 <= 10)
        TransactionRequest saleRequest = new TransactionRequest(
                "TX-POS-1001",
                10L,
                "SALE",
                7,
                BigDecimal.valueOf(250.00)
        );

        transactionService.process(saleRequest);

        // Then: Product stock updated to 8
        assertEquals(8, product.getQuantity());

        // Event publisher was triggered with LowStockEvent
        ArgumentCaptor<LowStockEvent> eventCaptor = ArgumentCaptor.forClass(LowStockEvent.class);
        verify(mockEventPublisher, times(1)).publishEvent(eventCaptor.capture());

        LowStockEvent event = eventCaptor.getValue();
        assertEquals(10L, event.getProductId());
        assertEquals("Basmati Rice 5kg", event.getProductName());
        assertEquals(8, event.getCurrentStock());
        assertEquals(10, event.getMinimumStockLevel());
        assertFalse(event.isCritical(), "Current stock 8 > 0, so not critical");

        // Now handle the event via NotificationService (simulating @TransactionalEventListener)
        StockAlert alert = notificationService.handleLowStockEvent(event);

        assertNotNull(alert);
        assertEquals("SENT", alert.getStatus(), "Alert should be marked SENT after successful mail delivery");
        assertNotNull(alert.getSentAt(), "sent_at must be populated on success");
        assertEquals(8, alert.getStockAtAlert());
        assertEquals(10, alert.getMinimumStockLevel());
        assertNull(alert.getLastError());

        // Verify JavaMailSender.send was called exactly once with MimeMessage
        verify(mockMailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("2. No duplicate on repeated sales: cooldown prevents duplicate alerts until stock is restocked above minimum")
    void testNoDuplicateOnRepeatedSalesAndResetAfterRestock() {
        // Given: Product with stock 12, min 10
        Product product = new Product();
        product.setId(20L);
        product.setProductName("Organic Olive Oil");
        product.setBarcode("8901234567891");
        product.setCategory("Oils");
        product.setSupplier("Mediterranean Imports");
        product.setQuantity(12);
        product.setMinimumStockLevel(10);
        product.setRestockedAboveMin(true);

        when(mockProductRepo.findById(20L)).thenReturn(Optional.of(product));

        // Sale 1: 3 units -> drops to 9 (crossing threshold)
        TransactionRequest sale1 = new TransactionRequest("TX-POS-2001", 20L, "SALE", 3, BigDecimal.valueOf(500.00));
        transactionService.process(sale1);

        assertEquals(9, product.getQuantity());
        verify(mockEventPublisher, times(1)).publishEvent(any(LowStockEvent.class));
        assertFalse(product.getRestockedAboveMin(), "Restocked flag reset to false after threshold drop");
        assertNotNull(product.getLastAlertAt());

        // Sale 2: repeated sale of 2 units -> drops to 7 (still <= 10, within 24h cooldown)
        TransactionRequest sale2 = new TransactionRequest("TX-POS-2002", 20L, "SALE", 2, BigDecimal.valueOf(500.00));
        transactionService.process(sale2);

        assertEquals(7, product.getQuantity());
        // Verify no duplicate LowStockEvent was published on repeated sale!
        verify(mockEventPublisher, times(1)).publishEvent(any(LowStockEvent.class));

        // Purchase/Restock: Purchase 15 units -> stock becomes 22 (> 10)
        TransactionRequest purchase = new TransactionRequest("TX-PUR-2003", 20L, "PURCHASE", 15, BigDecimal.valueOf(400.00));
        transactionService.process(purchase);

        assertEquals(22, product.getQuantity());
        assertTrue(product.getRestockedAboveMin(), "Restocked flag set back to true after restocking above minimum");

        // Sale 3: After restock, sale of 13 units drops stock to 9 (<= 10) again
        TransactionRequest sale3 = new TransactionRequest("TX-POS-2004", 20L, "SALE", 13, BigDecimal.valueOf(500.00));
        transactionService.process(sale3);

        assertEquals(9, product.getQuantity());
        // Should publish a new LowStockEvent now that the product was restocked and dropped again!
        verify(mockEventPublisher, times(2)).publishEvent(any(LowStockEvent.class));

        // Now test Critical stockout: stock reaches 0
        TransactionRequest sale4 = new TransactionRequest("TX-POS-2005", 20L, "SALE", 9, BigDecimal.valueOf(500.00));
        transactionService.process(sale4);

        assertEquals(0, product.getQuantity());
        ArgumentCaptor<LowStockEvent> criticalCaptor = ArgumentCaptor.forClass(LowStockEvent.class);
        verify(mockEventPublisher, times(3)).publishEvent(criticalCaptor.capture());
        assertTrue(criticalCaptor.getValue().isCritical(), "Critical stockout event sent when stock reaches 0");
    }

    @Test
    @DisplayName("3. Retry after simulated SMTP failure: saved as PENDING, retried with backoff, marked SENT after SMTP recovers, or FAILED after max retries")
    void testRetryAfterSimulatedSmtpFailure() {
        // Simulate SMTP failure on initial send
        doThrow(new MailSendException("Simulated SMTP Server Down: Connection Refused"))
                .when(mockMailSender).send(any(MimeMessage.class));

        LowStockEvent event = new LowStockEvent(
                30L,
                "Whole Milk 1L",
                "SKU-MILK-001",
                "Dairy",
                "Dairy Farm Co",
                4,
                10,
                16,
                false,
                "POS_SALE",
                LocalDateTime.now()
        );

        // When handling the event during SMTP outage
        StockAlert alert = notificationService.handleLowStockEvent(event);

        // Then: Alert is preserved as PENDING
        assertNotNull(alert);
        assertEquals("PENDING", alert.getStatus(), "Status must remain PENDING when SMTP delivery fails");
        assertEquals(0, alert.getRetryCount());
        assertNotNull(alert.getLastError());
        assertTrue(alert.getLastError().contains("Simulated SMTP Server Down"));
        assertNotNull(alert.getNextRetryAt(), "Exponential backoff next_retry_at must be populated");

        // Fast forward time so nextRetryAt is in the past
        alert.setNextRetryAt(LocalDateTime.now().minusMinutes(1));
        mockAlertRepo.save(alert);

        // Now SMTP server recovers!
        doNothing().when(mockMailSender).send(any(MimeMessage.class));

        // Scheduled retry runs
        notificationService.retryPendingAlerts();

        // Verify status transitioned from PENDING to SENT
        StockAlert recoveredAlert = alertDatabase.get(alert.getId());
        assertEquals("SENT", recoveredAlert.getStatus(), "After SMTP recovers, scheduled retry must mark alert as SENT");
        assertNotNull(recoveredAlert.getSentAt());
        assertNull(recoveredAlert.getLastError());
        assertEquals(1, recoveredAlert.getRetryCount());

        // Now test maximum 5 retries leading to FAILED status
        StockAlert failingAlert = new StockAlert(
                31L,
                "Butter 500g",
                "SKU-BUTTER-001",
                2,
                10,
                18,
                "manager@store.com"
        );
        failingAlert.setStatus("PENDING");
        failingAlert.setRetryCount(4); // 4 retries already failed
        failingAlert.setNextRetryAt(LocalDateTime.now().minusMinutes(1));
        mockAlertRepo.save(failingAlert);

        // Still failing SMTP
        doThrow(new MailSendException("Persistent SMTP outage"))
                .when(mockMailSender).send(any(MimeMessage.class));

        // 5th retry attempt fails -> marks FAILED
        notificationService.retryPendingAlerts();

        StockAlert finalFailedAlert = alertDatabase.get(failingAlert.getId());
        assertEquals("FAILED", finalFailedAlert.getStatus(), "After 5 retries, status must be set to FAILED");
    }

    @Test
    @DisplayName("4. Alert created when offline sync pushes stock below minimum")
    void testAlertCreatedWhenOfflineSyncPushesStockBelowMinimum() {
        // Given: Product with initial stock 20, minimum threshold 10
        Product product = new Product();
        product.setId(40L);
        product.setProductName("Refined Sugar 1kg");
        product.setBarcode("8901234567892");
        product.setCategory("Grocery");
        product.setSupplier("Sweet Goods Ltd");
        product.setQuantity(20);
        product.setMinimumStockLevel(10);
        product.setRestockedAboveMin(true);

        when(mockProductRepo.findById(40L)).thenReturn(Optional.of(product));

        // Offline POS batch recorded during internet disconnect: 3 sales of 4 units each (total 12 units sold)
        List<TransactionRequest> offlineBatch = List.of(
                new TransactionRequest("OFFLINE-TX-101", 40L, "SALE", 4, BigDecimal.valueOf(50.00)),
                new TransactionRequest("OFFLINE-TX-102", 40L, "SALE", 4, BigDecimal.valueOf(50.00)),
                new TransactionRequest("OFFLINE-TX-103", 40L, "SALE", 4, BigDecimal.valueOf(50.00))
        );

        // When: Offline transactions are synced to the backend
        List<InventoryTransaction> synced = syncController.sync(offlineBatch);

        // Then:
        assertEquals(3, synced.size());
        assertEquals(8, product.getQuantity(), "Stock reduced from 20 to 8 (below min threshold of 10)");

        // Verify LowStockEvent was published as result of offline sync pushing stock below minimum
        ArgumentCaptor<LowStockEvent> eventCaptor = ArgumentCaptor.forClass(LowStockEvent.class);
        verify(mockEventPublisher, atLeastOnce()).publishEvent(eventCaptor.capture());

        LowStockEvent latestEvent = eventCaptor.getValue();
        assertEquals(40L, latestEvent.getProductId());
        assertEquals(8, latestEvent.getCurrentStock());
        assertEquals(10, latestEvent.getMinimumStockLevel());

        // Process event and verify alert is created
        StockAlert syncAlert = notificationService.handleLowStockEvent(latestEvent);
        assertNotNull(syncAlert);
        assertEquals(8, syncAlert.getStockAtAlert());
        assertEquals(10, syncAlert.getMinimumStockLevel());
        assertEquals("SENT", syncAlert.getStatus());
    }
}
