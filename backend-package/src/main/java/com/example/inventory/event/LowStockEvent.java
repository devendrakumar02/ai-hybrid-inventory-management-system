package com.example.inventory.event;

import java.time.LocalDateTime;

/**
 * Spring ApplicationEvent published when product stock falls to or below minimum threshold
 * or reaches critical stockout level (<= 0).
 */
public class LowStockEvent {

    private final Long productId;
    private final String productName;
    private final String sku;
    private final String category;
    private final String supplier;
    private final int currentStock;
    private final int minimumStockLevel;
    private final int recommendedReorderQuantity;
    private final boolean critical;
    private final String triggerReason;
    private final LocalDateTime timestamp;

    public LowStockEvent(
            Long productId,
            String productName,
            String sku,
            String category,
            String supplier,
            int currentStock,
            int minimumStockLevel,
            int recommendedReorderQuantity,
            boolean critical,
            String triggerReason,
            LocalDateTime timestamp) {
        this.productId = productId;
        this.productName = productName;
        this.sku = sku;
        this.category = category;
        this.supplier = supplier != null && !supplier.isBlank() ? supplier : "Standard Supplier / Not Assigned";
        this.currentStock = currentStock;
        this.minimumStockLevel = minimumStockLevel;
        this.recommendedReorderQuantity = recommendedReorderQuantity;
        this.critical = critical;
        this.triggerReason = triggerReason != null ? triggerReason : "STOCK_UPDATE";
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
    }

    public Long getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public String getSku() {
        return sku;
    }

    public String getCategory() {
        return category;
    }

    public String getSupplier() {
        return supplier;
    }

    public int getCurrentStock() {
        return currentStock;
    }

    public int getMinimumStockLevel() {
        return minimumStockLevel;
    }

    public int getRecommendedReorderQuantity() {
        return recommendedReorderQuantity;
    }

    public boolean isCritical() {
        return critical;
    }

    public String getTriggerReason() {
        return triggerReason;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    @Override
    public String toString() {
        return "LowStockEvent{" +
                "productId=" + productId +
                ", productName='" + productName + '\'' +
                ", sku='" + sku + '\'' +
                ", currentStock=" + currentStock +
                ", minimumStockLevel=" + minimumStockLevel +
                ", critical=" + critical +
                ", triggerReason='" + triggerReason + '\'' +
                '}';
    }
}
