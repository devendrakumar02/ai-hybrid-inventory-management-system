package com.example.inventory.service;

import com.example.inventory.entity.Product;
import com.example.inventory.event.LowStockEvent;
import com.example.inventory.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository repo;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final int cooldownHours;

    public ProductService(
            ProductRepository repo,
            NotificationService notificationService,
            ApplicationEventPublisher eventPublisher,
            @Value("${inventory.alert.cooldown-hours:24}") int cooldownHours) {
        this.repo = repo;
        this.notificationService = notificationService;
        this.eventPublisher = eventPublisher;
        this.cooldownHours = cooldownHours > 0 ? cooldownHours : 24;
    }

    public List<Product> all(String q) {
        if (q == null || q.isBlank()) {
            return repo.findAll();
        }

        return repo.findByProductNameContainingIgnoreCaseOrBarcodeContainingIgnoreCase(
                q, q
        );
    }

    public Product byId(Long id) {
        return repo.findById(id)
                .orElseThrow(() ->
                        new NoSuchElementException("Product not found.")
                );
    }

    public Product byBarcode(String barcode) {
        return repo.findByBarcode(barcode)
                .orElseThrow(() ->
                        new NoSuchElementException("Product not found.")
                );
    }

    @Transactional
    public Product save(Product product) {
        if (product.getId() == null && repo.existsByBarcode(product.getBarcode())) {
            throw new IllegalArgumentException("Barcode already exists.");
        }

        Product saved = repo.save(product);
        try {
            evaluateStockChange(saved, "PRODUCT_SAVE");
        } catch (Exception ex) {
            log.warn("Error evaluating stock alert on product save: {}", ex.getMessage());
        }

        return saved;
    }

    @Transactional
    public Product update(Long id, Product updatedProduct) {
        Product existing = byId(id);

        existing.setBarcode(updatedProduct.getBarcode());
        existing.setProductName(updatedProduct.getProductName());

        existing.setCategory(updatedProduct.getCategory());
        existing.setSupplier(updatedProduct.getSupplier());

        existing.setPurchasePrice(updatedProduct.getPurchasePrice());
        existing.setSellingPrice(updatedProduct.getSellingPrice());
        existing.setQuantity(updatedProduct.getQuantity());
        existing.setMinimumStockLevel(updatedProduct.getMinimumStockLevel());

        if (updatedProduct.getManagerEmail() != null) {
            existing.setManagerEmail(updatedProduct.getManagerEmail());
        }
        if (updatedProduct.getAdminEmail() != null) {
            existing.setAdminEmail(updatedProduct.getAdminEmail());
        }

        Product saved = repo.save(existing);
        try {
            evaluateStockChange(saved, "MANUAL_ADJUSTMENT");
        } catch (Exception ex) {
            log.warn("Error evaluating stock alert on product update: {}", ex.getMessage());
        }

        return saved;
    }

    /**
     * Unified stock-update check method:
     * - Triggered on every stock change: POS sale, purchase, offline-sync batch, manual adjustment.
     * - When stock is restocked above minimum, resets the cooldown flag.
     * - When stock <= minimum (or <= 0 critical), checks 24h cooldown & reset flag.
     * - If eligible, publishes LowStockEvent.
     */
    @Transactional
    public void evaluateStockChange(Product product, String triggerReason) {
        if (product == null || product.getQuantity() == null || product.getMinimumStockLevel() == null) {
            return;
        }

        int currentStock = product.getQuantity();
        int minStock = product.getMinimumStockLevel();

        // 1. If restocked above minimum threshold, reset the cooldown flag so next drop generates an alert
        if (currentStock > minStock) {
            if (!Boolean.TRUE.equals(product.getRestockedAboveMin())) {
                product.setRestockedAboveMin(true);
                repo.save(product);
                log.info("Product '{}' restocked above minimum ({} > {}). Cooldown flag reset.",
                        product.getProductName(), currentStock, minStock);
            }
            return;
        }

        // 2. Stock is <= minStock: determine if alert should be dispatched
        boolean isCritical = (currentStock <= 0);
        LocalDateTime now = LocalDateTime.now();
        boolean shouldAlert = false;

        if (isCritical) {
            // Critical stockout alert when stock reaches 0
            if (product.getLastCriticalAlertAt() == null ||
                    Boolean.TRUE.equals(product.getRestockedAboveMin()) ||
                    product.getLastCriticalAlertAt().isBefore(now.minusHours(cooldownHours))) {
                shouldAlert = true;
            } else {
                log.info("Critical stockout alert for '{}' suppressed: cooldown active and not restocked.",
                        product.getProductName());
            }
        } else {
            // Standard low stock threshold alert
            if (product.getLastAlertAt() == null ||
                    Boolean.TRUE.equals(product.getRestockedAboveMin()) ||
                    product.getLastAlertAt().isBefore(now.minusHours(cooldownHours))) {
                shouldAlert = true;
            } else {
                log.info("Low stock alert for '{}' suppressed: cooldown active (within {}h) and not restocked.",
                        product.getProductName(), cooldownHours);
            }
        }

        if (shouldAlert) {
            String sku = (product.getBarcode() != null && !product.getBarcode().isBlank())
                    ? product.getBarcode()
                    : "SKU-" + product.getId();
            int recommendedReorder = Math.max(minStock * 2 - currentStock, minStock);

            LowStockEvent event = new LowStockEvent(
                    product.getId(),
                    product.getProductName(),
                    sku,
                    product.getCategory(),
                    product.getSupplier(),
                    currentStock,
                    minStock,
                    recommendedReorder,
                    isCritical,
                    triggerReason,
                    now
            );

            // Update product state
            product.setRestockedAboveMin(false);
            product.setLastAlertAt(now);
            if (isCritical) {
                product.setLastCriticalAlertAt(now);
            }
            repo.save(product);

            log.info("Publishing LowStockEvent for product '{}' (SKU: {}), currentStock: {}, critical: {}, triggerReason: {}",
                    product.getProductName(), sku, currentStock, isCritical, triggerReason);
            eventPublisher.publishEvent(event);
        }
    }

    @Transactional
    public void delete(Long id) {
        Product product = byId(id);
        repo.delete(product);
    }

    public List<Product> lowStock() {
        return repo.findAll()
                .stream()
                .filter(product ->
                        product.getQuantity() != null &&
                        product.getMinimumStockLevel() != null &&
                        product.getQuantity() <= product.getMinimumStockLevel()
                )
                .toList();
    }
}