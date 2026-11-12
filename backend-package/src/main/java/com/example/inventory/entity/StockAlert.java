package com.example.inventory.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_alerts")
public class StockAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    private String sku;

    @Column(name = "stock_at_alert", nullable = false)
    private Integer stockAtAlert = 0;

    // Kept for backward compatibility
    @Column(name = "current_stock")
    private Integer currentStock;

    @Column(name = "minimum_stock_level", nullable = false)
    private Integer minimumStockLevel;

    @Column(name = "recommended_reorder_quantity")
    private Integer recommendedReorderQuantity = 0;

    @Column(name = "status", nullable = false)
    private String status = "PENDING"; // PENDING, SENT, FAILED

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Kept for backward compatibility
    private LocalDateTime alertDate;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @Column(name = "recipient_email")
    private String recipientEmail;

    @Column(name = "is_critical")
    private Boolean isCritical = false;

    @Column(length = 1000)
    private String message;

    public StockAlert() {
    }

    public StockAlert(Long productId, String productName, String sku, Integer stockAtAlert, Integer minimumStockLevel, Integer recommendedReorderQuantity, String recipientEmail) {
        this.productId = productId;
        this.productName = productName;
        this.sku = sku;
        this.stockAtAlert = stockAtAlert != null ? stockAtAlert : 0;
        this.currentStock = this.stockAtAlert;
        this.minimumStockLevel = minimumStockLevel;
        this.recommendedReorderQuantity = recommendedReorderQuantity != null ? recommendedReorderQuantity : 0;
        this.recipientEmail = recipientEmail;
        this.status = "PENDING";
        this.retryCount = 0;
        this.createdAt = LocalDateTime.now();
        this.alertDate = this.createdAt;
        this.isCritical = (this.stockAtAlert <= 0);
        this.message = String.format("Stock level for '%s' (SKU: %s) is %s: %d units remaining (Min threshold: %d). Recommended reorder: %d units.",
                productName, sku, this.isCritical ? "CRITICAL (OUT OF STOCK)" : "LOW", this.stockAtAlert, minimumStockLevel, this.recommendedReorderQuantity);
    }

    // Overload constructor for backwards compatibility
    public StockAlert(Long productId, String productName, Integer currentStock, Integer minimumStockLevel, String recipientEmail) {
        this(productId, productName, "SKU-" + productId, currentStock, minimumStockLevel,
                Math.max(0, (minimumStockLevel * 2) - (currentStock != null ? currentStock : 0)), recipientEmail);
    }

    @PrePersist
    void init() {
        if (createdAt == null) {
            createdAt = alertDate != null ? alertDate : LocalDateTime.now();
        }
        if (alertDate == null) {
            alertDate = createdAt;
        }
        if (stockAtAlert == null) {
            stockAtAlert = currentStock != null ? currentStock : 0;
        }
        if (currentStock == null) {
            currentStock = stockAtAlert;
        }
        if (status == null) {
            status = "PENDING";
        }
        if (retryCount == null) {
            retryCount = 0;
        }
        if (recommendedReorderQuantity == null) {
            recommendedReorderQuantity = 0;
        }
        if (isCritical == null) {
            isCritical = false;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public Integer getStockAtAlert() {
        return stockAtAlert != null ? stockAtAlert : currentStock;
    }

    public void setStockAtAlert(Integer stockAtAlert) {
        this.stockAtAlert = stockAtAlert;
        this.currentStock = stockAtAlert;
    }

    public Integer getCurrentStock() {
        return getStockAtAlert();
    }

    public void setCurrentStock(Integer currentStock) {
        this.currentStock = currentStock;
        if (this.stockAtAlert == null) {
            this.stockAtAlert = currentStock;
        }
    }

    public Integer getMinimumStockLevel() {
        return minimumStockLevel;
    }

    public void setMinimumStockLevel(Integer minimumStockLevel) {
        this.minimumStockLevel = minimumStockLevel;
    }

    public Integer getRecommendedReorderQuantity() {
        return recommendedReorderQuantity;
    }

    public void setRecommendedReorderQuantity(Integer recommendedReorderQuantity) {
        this.recommendedReorderQuantity = recommendedReorderQuantity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getRetryCount() {
        return retryCount != null ? retryCount : 0;
    }

    public void setRetryCount(Integer retryCount) {
        this.retryCount = retryCount != null ? retryCount : 0;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt != null ? createdAt : alertDate;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
        this.alertDate = createdAt;
    }

    public LocalDateTime getAlertDate() {
        return getCreatedAt();
    }

    public void setAlertDate(LocalDateTime alertDate) {
        this.alertDate = alertDate;
        this.createdAt = alertDate;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public LocalDateTime getNextRetryAt() {
        return nextRetryAt;
    }

    public void setNextRetryAt(LocalDateTime nextRetryAt) {
        this.nextRetryAt = nextRetryAt;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public Boolean isCritical() {
        return Boolean.TRUE.equals(isCritical);
    }

    public Boolean getIsCritical() {
        return Boolean.TRUE.equals(isCritical);
    }

    public void setCritical(Boolean critical) {
        this.isCritical = critical != null ? critical : false;
    }

    public void setIsCritical(Boolean critical) {
        this.isCritical = critical != null ? critical : false;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
