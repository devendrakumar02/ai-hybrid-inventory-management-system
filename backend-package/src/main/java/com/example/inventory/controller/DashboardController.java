package com.example.inventory.controller;

import com.example.inventory.entity.InventoryTransaction;
import com.example.inventory.entity.Product;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.repository.TransactionRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final ProductRepository p;
    private final TransactionRepository t;

    public DashboardController(
            ProductRepository p,
            TransactionRepository t) {
        this.p = p;
        this.t = t;
    }

    @GetMapping
    public Map<String, Object> dashboard() {

        LocalDateTime start =
                LocalDate.now().atStartOfDay();

        LocalDateTime end =
                start.plusDays(1);

        var sales = t.salesBetween(start, end);

        var products = p.findAll();

        long lowStockCount = products.stream()
                .filter(product ->
                        product.getQuantity() <=
                                product.getMinimumStockLevel()
                )
                .count();

        int totalStock = products.stream()
                .mapToInt(product ->
                        product.getQuantity() == null
                                ? 0
                                : product.getQuantity()
                )
                .sum();

        return Map.of(
                "totalProducts", p.count(),

                "totalStock", totalStock,

                "lowStockProducts", lowStockCount,

                "todaySalesAmount", sales,

                "recentTransactions",
                t.findTop10ByOrderByTransactionDateDesc()
        );
    }

    @GetMapping("/fast-moving")
    public List<Map<String, Object>> fast() {

        return movement(true);
    }

    @GetMapping("/slow-moving")
    public List<Map<String, Object>> slow() {

        return movement(false);
    }

    private List<Map<String, Object>> movement(boolean fast) {

        var all = t.findAll();
        var allProducts = p.findAll();

        Map<Long, Integer> movement = new HashMap<>();

        // If slow moving, initialize with 0 sales for all catalog items so dormant products appear
        if (!fast) {
            for (Product prod : allProducts) {
                movement.put(prod.getId(), 0);
            }
        }

        all.stream()
                .filter(transaction ->
                        transaction.getTransactionType()
                                == InventoryTransaction.TransactionType.SALE
                )
                .forEach(transaction ->
                        movement.merge(
                                transaction.getProductId(),
                                transaction.getQuantity(),
                                Integer::sum
                        )
                );

        Map<Long, Product> productMap = allProducts.stream()
                .collect(Collectors.toMap(Product::getId, prod -> prod, (a, b) -> a));

        return movement.entrySet()
                .stream()
                .filter(entry -> productMap.containsKey(entry.getKey()))
                .filter(entry -> fast ? entry.getValue() > 0 : true)
                .sorted((a, b) ->
                        fast
                                ? Integer.compare(
                                b.getValue(),
                                a.getValue()
                        )
                                : Integer.compare(
                                a.getValue(),
                                b.getValue()
                        )
                )
                .limit(10)
                .map(entry -> {
                    Product prod = productMap.get(entry.getKey());
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("productId", entry.getKey());
                    map.put("productName", prod != null ? prod.getProductName() : "Product #" + entry.getKey());
                    map.put("category", prod != null ? (prod.getCategory() != null ? prod.getCategory() : "General") : "General");
                    map.put("barcode", prod != null ? (prod.getBarcode() != null ? prod.getBarcode() : "") : "");
                    map.put("quantitySold", entry.getValue());
                    map.put("currentStock", prod != null ? (prod.getQuantity() != null ? prod.getQuantity() : 0) : 0);
                    map.put("minimumStockLevel", prod != null ? (prod.getMinimumStockLevel() != null ? prod.getMinimumStockLevel() : 10) : 10);
                    map.put("sellingPrice", prod != null ? (prod.getSellingPrice() != null ? prod.getSellingPrice() : 0.0) : 0.0);
                    map.put("velocity", fast ? "FAST" : "SLOW");
                    return map;
                })
                .toList();
    }
}