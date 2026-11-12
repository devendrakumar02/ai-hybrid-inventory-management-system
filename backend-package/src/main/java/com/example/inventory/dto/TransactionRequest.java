package com.example.inventory.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public record TransactionRequest(
 @NotBlank String localTransactionId,@NotNull Long productId,
 @NotBlank String transactionType,@Min(1) Integer quantity,
 @NotNull @DecimalMin("0.0") BigDecimal unitPrice) {}
