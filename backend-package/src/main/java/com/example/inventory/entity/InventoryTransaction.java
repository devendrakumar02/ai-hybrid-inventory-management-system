package com.example.inventory.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name="transactions")
public class InventoryTransaction {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="local_transaction_id", nullable=false, unique=true, length=100)
    private String localTransactionId;

    @Column(name="product_id", nullable=false)
    private Long productId;

    @Enumerated(EnumType.STRING)
    @Column(name="transaction_type", nullable=false, length=20)
    private TransactionType transactionType;

    @Column(name="quantity", nullable=false)
    private Integer quantity;

    @Column(name="unit_price", nullable=false, precision=12, scale=2)
    private BigDecimal unitPrice;

    @Column(name="total_amount", nullable=false, precision=12, scale=2)
    private BigDecimal totalAmount;

    @Column(name="transaction_date")
    private LocalDateTime transactionDate;

    @Column(name="sync_status", length=20)
    private String syncStatus;

    @PrePersist
    void init() {
        if (transactionDate == null) transactionDate = LocalDateTime.now();
        if (syncStatus == null) syncStatus = "SYNCED";
    }

    public Long getId() { return id; }
    public String getLocalTransactionId() { return localTransactionId; }
    public void setLocalTransactionId(String v) { localTransactionId = v; }
    public Long getProductId() { return productId; }
    public void setProductId(Long v) { productId = v; }
    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType v) { transactionType = v; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer v) { quantity = v; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal v) { unitPrice = v; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal v) { totalAmount = v; }
    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime v) { transactionDate = v; }
    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String v) { syncStatus = v; }

    public enum TransactionType { SALE, PURCHASE }
}
