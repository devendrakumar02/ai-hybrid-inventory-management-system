package com.example.inventory.dto;

import java.time.LocalDateTime;

public record AlertQueueItem(
        Long id,
        Long productId,
        String productName,
        String sku,
        int currentStock,
        int minThresholdStock,
        int recommendedReorderQuantity,
        String recipientEmail,
        String status,
        LocalDateTime createdAt,
        LocalDateTime sentAt,
        int retryCount,
        String errorMessage
) {}
