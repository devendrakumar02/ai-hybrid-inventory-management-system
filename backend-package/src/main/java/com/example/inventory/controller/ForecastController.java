package com.example.inventory.controller;

import com.example.inventory.entity.InventoryTransaction;
import com.example.inventory.entity.Product;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.service.AIService;
import com.example.inventory.service.TransactionService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/forecast")
@CrossOrigin(origins = "http://localhost:5173")
public class ForecastController {

    private final AIService aiService;
    private final ProductRepository productRepository;
    private final TransactionService transactionService;

    public ForecastController(
            AIService aiService,
            ProductRepository productRepository,
            TransactionService transactionService) {

        this.aiService = aiService;
        this.productRepository = productRepository;
        this.transactionService = transactionService;
    }


    // Existing manual forecast endpoint
    @PostMapping
    public ResponseEntity<?> forecast(
            @RequestBody Map<String, Object> request) {

        try {

            Object salesObject = request.get("sales");

            if (!(salesObject instanceof List<?> salesList)) {
                return ResponseEntity.badRequest().body(
                        Map.of("error", "sales must be an array")
                );
            }

            int[] sales = salesList.stream()
                    .mapToInt(value -> ((Number) value).intValue())
                    .toArray();

            if (sales.length < 2) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "error",
                                "At least 2 sales records are required"
                        )
                );
            }

            return ResponseEntity.ok(
                    aiService.forecast(sales)
            );

        } catch (Exception e) {

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "error",
                            "AI forecasting service unavailable",
                            "message",
                            e.getMessage()
                    )
            );
        }
    }


    // NEW: Product-wise AI forecast
    @GetMapping("/product/{productId}")
    public ResponseEntity<?> forecastProduct(
            @PathVariable Long productId) {

        try {

            // 1. Find product
            Product product = productRepository
                    .findById(productId)
                    .orElseThrow(() ->
                            new NoSuchElementException(
                                    "Product not found."
                            )
                    );


            // 2. Get SALE transactions
            List<InventoryTransaction> transactions =
                    transactionService.getSalesForProduct(productId);


            // 3. Check sales history
            if (transactions.size() < 2) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "error",
                                "Not enough sales history for forecasting.",
                                "productId",
                                productId,
                                "productName",
                                product.getProductName(),
                                "salesRecords",
                                transactions.size()
                        )
                );
            }


            // 4. Extract quantities
            int[] sales = transactions.stream()
                    .mapToInt(InventoryTransaction::getQuantity)
                    .toArray();


            // 5. Send sales data to Python AI
            Map<String, Object> aiResult =
                    aiService.forecast(sales);


            // 6. Calculate recommended reorder quantity
            double predictedDemand =
                    ((Number) aiResult.get("predictedDemand"))
                            .doubleValue();

            int currentStock =
                    product.getQuantity() == null
                            ? 0
                            : product.getQuantity();

            int recommendedStock =
                    (int) Math.ceil(predictedDemand);

            int reorderQuantity =
                    Math.max(
                            0,
                            recommendedStock - currentStock
                    );


            // 7. Prepare response
            Map<String, Object> result =
                    new LinkedHashMap<>();

            result.put("productId", product.getId());
            result.put("productName", product.getProductName());
            result.put("barcode", product.getBarcode());

            result.put("currentStock", currentStock);

            result.put(
                    "salesHistory",
                    sales
            );

            result.put(
                    "predictedDemand",
                    predictedDemand
            );

            result.put(
                    "recommendedStock",
                    recommendedStock
            );

            result.put(
                    "reorderQuantity",
                    reorderQuantity
            );

            result.put(
                    "averageSales",
                    aiResult.get("averageSales")
            );

            result.put("minimumStockLevel", product.getMinimumStockLevel());
            result.put("trend", aiResult.get("trend"));
            result.put("slope", aiResult.get("slope"));
            result.put("rSquared", aiResult.get("rSquared"));
            result.put("stockOutRisk", currentStock < predictedDemand);
            result.put("projectedDeficit", Math.max(0, (int) Math.ceil(predictedDemand - currentStock)));

            return ResponseEntity.ok(result);

        } catch (NoSuchElementException e) {

            return ResponseEntity.status(404).body(
                    Map.of(
                            "error",
                            e.getMessage()
                    )
            );

        } catch (Exception e) {

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "error",
                            "Unable to generate product forecast.",
                            "message",
                            e.getMessage()
                    )
            );
        }
    }
}