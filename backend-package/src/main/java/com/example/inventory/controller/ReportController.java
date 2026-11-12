package com.example.inventory.controller;

import com.example.inventory.entity.InventoryTransaction;
import com.example.inventory.entity.Product;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.repository.TransactionRepository;

import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/reports")
@CrossOrigin(origins = "http://localhost:5173")
public class ReportController {

    private final ProductRepository products;
    private final TransactionRepository transactions;

    public ReportController(
            ProductRepository products,
            TransactionRepository transactions) {

        this.products = products;
        this.transactions = transactions;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {

        LocalDateTime start =
                LocalDate.now().atStartOfDay();

        LocalDateTime end =
                start.plusDays(1);

        List<Product> allProducts =
                products.findAll();

        List<InventoryTransaction> today =
                transactions.findByTransactionDateBetween(
                        start,
                        end
                );

        BigDecimal todaySales =
                today.stream()
                        .filter(t ->
                                t.getTransactionType()
                                        == InventoryTransaction.TransactionType.SALE)
                        .map(InventoryTransaction::getTotalAmount)
                        .filter(Objects::nonNull)
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        );

        BigDecimal todayPurchases =
                today.stream()
                        .filter(t ->
                                t.getTransactionType()
                                        == InventoryTransaction.TransactionType.PURCHASE)
                        .map(InventoryTransaction::getTotalAmount)
                        .filter(Objects::nonNull)
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        );

        long lowStock =
                allProducts.stream()
                        .filter(p ->
                                p.getQuantity() != null &&
                                        p.getMinimumStockLevel() != null &&
                                        p.getQuantity() > 0 &&
                                        p.getQuantity()
                                                <= p.getMinimumStockLevel())
                        .count();

        long outOfStock =
                allProducts.stream()
                        .filter(p ->
                                p.getQuantity() == null ||
                                        p.getQuantity() <= 0)
                        .count();

        int totalStock =
                allProducts.stream()
                        .map(Product::getQuantity)
                        .filter(Objects::nonNull)
                        .mapToInt(Integer::intValue)
                        .sum();

        return Map.of(
                "totalProducts", allProducts.size(),
                "totalStock", totalStock,
                "lowStockProducts", lowStock,
                "outOfStockProducts", outOfStock,
                "todaySales", todaySales,
                "todayPurchases", todayPurchases,
                "todayTransactions", today.size()
        );
    }


    @GetMapping("/transactions")
    public List<InventoryTransaction> transactions() {

        return transactions
                .findAllByOrderByTransactionDateDesc();
    }


    @GetMapping("/low-stock")
    public List<Product> lowStock() {

        return products.findAll()
                .stream()
                .filter(p ->
                        p.getQuantity() != null &&
                                p.getMinimumStockLevel() != null &&
                                p.getQuantity()
                                        <= p.getMinimumStockLevel())
                .toList();
    }
}