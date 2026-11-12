package com.example.inventory.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
public class Product {

 @Id
 @GeneratedValue(strategy = GenerationType.IDENTITY)
 private Long id;

 @Column(nullable = false, unique = true)
 private String barcode;

 @Column(name = "name", nullable = false)
 private String name;

 @Column(name = "product_name", nullable = false)
 private String productName;

 private String category;

 private String supplier;

 @Column(name = "cost_price", nullable = false, precision = 10, scale = 2)
 private BigDecimal costPrice;

 @Column(name = "purchase_price", nullable = false, precision = 38, scale = 2)
 private BigDecimal purchasePrice;

 @Column(name = "selling_price", nullable = false, precision = 38, scale = 2)
 private BigDecimal sellingPrice;

 @Column(name = "stock_quantity", nullable = false)
 private Integer stockQuantity = 0;

 @Column(nullable = false)
 private Integer quantity = 0;

 @Column(name = "min_stock_threshold", nullable = false)
 private Integer minStockThreshold = 0;

 @Column(name = "minimum_stock_level", nullable = false)
 private Integer minimumStockLevel = 0;

 @Column(name = "last_alert_at")
 private LocalDateTime lastAlertAt;

 @Column(name = "last_critical_alert_at")
 private LocalDateTime lastCriticalAlertAt;

 @Column(name = "restocked_above_min")
 private Boolean restockedAboveMin = true;

 @Column(name = "manager_email")
 private String managerEmail;

 @Column(name = "admin_email")
 private String adminEmail;

 private LocalDateTime createdAt;

 private LocalDateTime updatedAt;

 @PrePersist
 void created() {
  createdAt = LocalDateTime.now();
  updatedAt = createdAt;
  if (restockedAboveMin == null) {
   restockedAboveMin = true;
  }
  syncPairs();
 }

 @PreUpdate
 void updated() {
  updatedAt = LocalDateTime.now();
  syncPairs();
 }

 public void syncPairs() {
  if (this.name == null && this.productName != null) {
   this.name = this.productName;
  } else if (this.productName == null && this.name != null) {
   this.productName = this.name;
  }

  if (this.costPrice == null && this.purchasePrice != null) {
   this.costPrice = this.purchasePrice;
  } else if (this.purchasePrice == null && this.costPrice != null) {
   this.purchasePrice = this.costPrice;
  }

  if (this.stockQuantity == null && this.quantity != null) {
   this.stockQuantity = this.quantity;
  } else if (this.quantity == null && this.stockQuantity != null) {
   this.quantity = this.stockQuantity;
  }

  if (this.minStockThreshold == null && this.minimumStockLevel != null) {
   this.minStockThreshold = this.minimumStockLevel;
  } else if (this.minimumStockLevel == null && this.minStockThreshold != null) {
   this.minimumStockLevel = this.minStockThreshold;
  }
 }

 public Long getId() {
  return id;
 }

 public void setId(Long id) {
  this.id = id;
 }

 public String getBarcode() {
  return barcode;
 }

 public void setBarcode(String barcode) {
  this.barcode = barcode;
 }

 public String getName() {
  return name != null ? name : productName;
 }

 public void setName(String name) {
  this.name = name;
  this.productName = name;
 }

 public String getProductName() {
  return productName != null ? productName : name;
 }

 public void setProductName(String productName) {
  this.productName = productName;
  this.name = productName;
 }

 public String getCategory() {
  return category;
 }

 public void setCategory(String category) {
  this.category = category;
 }

 public String getSupplier() {
  return supplier;
 }

 public void setSupplier(String supplier) {
  this.supplier = supplier;
 }

 public BigDecimal getCostPrice() {
  return costPrice != null ? costPrice : purchasePrice;
 }

 public void setCostPrice(BigDecimal costPrice) {
  this.costPrice = costPrice;
  this.purchasePrice = costPrice;
 }

 public BigDecimal getPurchasePrice() {
  return purchasePrice != null ? purchasePrice : costPrice;
 }

 public void setPurchasePrice(BigDecimal purchasePrice) {
  this.purchasePrice = purchasePrice;
  this.costPrice = purchasePrice;
 }

 public BigDecimal getSellingPrice() {
  return sellingPrice;
 }

 public void setSellingPrice(BigDecimal sellingPrice) {
  this.sellingPrice = sellingPrice;
 }

 public Integer getStockQuantity() {
  return stockQuantity != null ? stockQuantity : quantity;
 }

 public void setStockQuantity(Integer stockQuantity) {
  this.stockQuantity = stockQuantity;
  this.quantity = stockQuantity;
 }

 public Integer getQuantity() {
  return quantity != null ? quantity : stockQuantity;
 }

 public void setQuantity(Integer quantity) {
  this.quantity = quantity;
  this.stockQuantity = quantity;
 }

 public Integer getMinStockThreshold() {
  return minStockThreshold != null ? minStockThreshold : minimumStockLevel;
 }

 public void setMinStockThreshold(Integer minStockThreshold) {
  this.minStockThreshold = minStockThreshold;
  this.minimumStockLevel = minStockThreshold;
 }

 public Integer getMinimumStockLevel() {
  return minimumStockLevel != null ? minimumStockLevel : minStockThreshold;
 }

 public void setMinimumStockLevel(Integer minimumStockLevel) {
  this.minimumStockLevel = minimumStockLevel;
  this.minStockThreshold = minimumStockLevel;
 }

 public LocalDateTime getCreatedAt() {
  return createdAt;
 }

 public void setCreatedAt(LocalDateTime createdAt) {
  this.createdAt = createdAt;
 }

 public LocalDateTime getUpdatedAt() {
  return updatedAt;
 }

 public void setUpdatedAt(LocalDateTime updatedAt) {
  this.updatedAt = updatedAt;
 }

 public LocalDateTime getLastAlertAt() {
  return lastAlertAt;
 }

 public void setLastAlertAt(LocalDateTime lastAlertAt) {
  this.lastAlertAt = lastAlertAt;
 }

 public LocalDateTime getLastCriticalAlertAt() {
  return lastCriticalAlertAt;
 }

 public void setLastCriticalAlertAt(LocalDateTime lastCriticalAlertAt) {
  this.lastCriticalAlertAt = lastCriticalAlertAt;
 }

 public Boolean getRestockedAboveMin() {
  return restockedAboveMin != null ? restockedAboveMin : true;
 }

 public void setRestockedAboveMin(Boolean restockedAboveMin) {
  this.restockedAboveMin = restockedAboveMin;
 }

 public String getManagerEmail() {
  return managerEmail;
 }

 public void setManagerEmail(String managerEmail) {
  this.managerEmail = managerEmail;
 }

 public String getAdminEmail() {
  return adminEmail;
 }

 public void setAdminEmail(String adminEmail) {
  this.adminEmail = adminEmail;
 }
}