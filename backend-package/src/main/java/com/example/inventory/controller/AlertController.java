package com.example.inventory.controller;

import com.example.inventory.dto.AlertQueueItem;
import com.example.inventory.entity.AlertRecipientConfig;
import com.example.inventory.entity.Product;
import com.example.inventory.entity.StockAlert;
import com.example.inventory.repository.AlertRecipientConfigRepository;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/alerts")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"})
public class AlertController {

    private final NotificationService notificationService;
    private final ProductRepository productRepository;

    public AlertController(NotificationService notificationService, ProductRepository productRepository) {
        this.notificationService = notificationService;
        this.productRepository = productRepository;
    }

    @GetMapping
    public List<StockAlert> all() {
        return notificationService.getAllAlerts();
    }

    @GetMapping("/pending")
    public List<StockAlert> pending() {
        return notificationService.getPendingAlerts();
    }

    @GetMapping("/sqlite-queue")
    public List<AlertQueueItem> sqliteQueue() {
        return notificationService.getSqliteAlertQueue();
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return notificationService.getAlertStats();
    }

    @PostMapping("/process-pending")
    public ResponseEntity<Map<String, Object>> processPending() {
        Map<String, Object> result = notificationService.processPendingAlerts();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/toggle-offline")
    public ResponseEntity<Map<String, Object>> toggleOffline(@RequestBody(required = false) Map<String, Object> body) {
        boolean current = notificationService.isSimulatedOffline();
        boolean target = (body != null && body.containsKey("offline"))
                ? Boolean.parseBoolean(body.get("offline").toString())
                : !current;

        notificationService.setSimulatedOffline(target);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "simulatedOffline", target,
                "isOnline", notificationService.isOnline(),
                "message", target ? "Offline simulation mode ACTIVATED." : "Offline simulation mode DEACTIVATED."
        ));
    }

    @PostMapping("/smtp-config")
    public ResponseEntity<Map<String, Object>> configureSmtp(@RequestBody Map<String, Object> config) {
        String host = config.get("host") != null ? config.get("host").toString() : null;
        int port = config.get("port") != null ? Integer.parseInt(config.get("port").toString()) : 587;
        String username = config.get("username") != null ? config.get("username").toString() : null;
        String password = config.get("password") != null ? config.get("password").toString() : null;
        String recipient = config.get("recipientEmail") != null ? config.get("recipientEmail").toString() : null;

        notificationService.updateSmtpConfig(host, port, username, password, recipient);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "SMTP settings saved successfully.",
                "stats", notificationService.getAlertStats()
        ));
    }

    @PostMapping("/send-test")
    public ResponseEntity<Map<String, Object>> sendTestEmail(@RequestBody(required = false) Map<String, Object> body) {
        String recipient = null;
        if (body != null && body.containsKey("recipientEmail")) {
            recipient = body.get("recipientEmail").toString();
        }

        Map<String, Object> result = notificationService.sendTestEmail(recipient);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/trigger/{productId}")
    public ResponseEntity<?> triggerForProduct(@PathVariable Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NoSuchElementException("Product not found"));

        StockAlert alert = notificationService.checkAndCreateLowStockAlert(product);
        if (alert == null) {
            // Force create alert for testing threshold alerting logic
            Product testProduct = new Product();
            testProduct.setBarcode(product.getBarcode());
            testProduct.setProductName(product.getProductName());
            testProduct.setQuantity(Math.min(product.getQuantity() != null ? product.getQuantity() : 0,
                    product.getMinimumStockLevel() != null ? product.getMinimumStockLevel() : 5));
            testProduct.setMinimumStockLevel(product.getMinimumStockLevel() != null ? product.getMinimumStockLevel() : 10);

            alert = notificationService.checkAndCreateLowStockAlert(testProduct);
        }

        return ResponseEntity.ok(alert != null ? alert : Map.of("message", "Alert queued / processed."));
    }

    @GetMapping("/recipients")
    public List<AlertRecipientConfig> getRecipients() {
        AlertRecipientConfigRepository repo = notificationService.getRecipientConfigRepository();
        return repo != null ? repo.findAll() : List.of();
    }

    @PostMapping("/recipients")
    public ResponseEntity<?> saveRecipientConfig(@RequestBody AlertRecipientConfig config) {
        AlertRecipientConfigRepository repo = notificationService.getRecipientConfigRepository();
        if (repo == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Recipient repository not available"));
        }
        AlertRecipientConfig saved = repo.save(config);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/recipients/{id}")
    public ResponseEntity<?> deleteRecipientConfig(@PathVariable Long id) {
        AlertRecipientConfigRepository repo = notificationService.getRecipientConfigRepository();
        if (repo != null && repo.existsById(id)) {
            repo.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Recipient configuration deleted"));
        }
        return ResponseEntity.notFound().build();
    }
}
