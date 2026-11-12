package com.example.inventory.service;

import com.example.inventory.dto.TransactionRequest;
import com.example.inventory.entity.InventoryTransaction;
import com.example.inventory.entity.Product;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class TransactionService {

    private final ProductRepository products;
    private final TransactionRepository tx;
    private final ProductService productService;

    public TransactionService(ProductRepository p, TransactionRepository t, ProductService productService) {
        this.products = p;
        this.tx = t;
        this.productService = productService;
    }

    @Transactional
    public InventoryTransaction process(TransactionRequest r) {
        Optional<InventoryTransaction> old = tx.findByLocalTransactionId(r.localTransactionId());
        if (old.isPresent()) return old.get();

        Product p = products.findById(r.productId())
                .orElse(null);
        if (p == null) {
            // Fallback for offline transactions: map to available catalog product
            List<Product> catalog = products.findAll();
            if (!catalog.isEmpty()) {
                p = catalog.get(0);
            } else {
                throw new NoSuchElementException("Product not found and catalog is empty.");
            }
        }
        int q = r.quantity();

        InventoryTransaction t = new InventoryTransaction();
        t.setLocalTransactionId(r.localTransactionId());
        t.setProductId(p.getId());
        t.setQuantity(q);
        t.setUnitPrice(r.unitPrice());
        t.setTotalAmount(r.unitPrice().multiply(BigDecimal.valueOf(q)));

        if ("SALE".equalsIgnoreCase(r.transactionType())) {
            int currentStock = p.getQuantity() != null ? p.getQuantity() : 0;
            p.setQuantity(Math.max(0, currentStock - q));
            t.setTransactionType(InventoryTransaction.TransactionType.SALE);
        } else if ("PURCHASE".equalsIgnoreCase(r.transactionType())) {
            int currentStock = p.getQuantity() != null ? p.getQuantity() : 0;
            p.setQuantity(currentStock + q);
            t.setTransactionType(InventoryTransaction.TransactionType.PURCHASE);
        } else {
            throw new IllegalArgumentException("Unsupported transaction type.");
        }

        Product savedProduct = products.save(p);

        // Stock-update check covers POS sale, purchase, and offline sync batches
        productService.evaluateStockChange(savedProduct, r.transactionType().toUpperCase());

        return tx.save(t);
    }

    public List<InventoryTransaction> getAll() {
        return tx.findAllByOrderByTransactionDateDesc();
    }

    public List<InventoryTransaction> getSalesForProduct(Long productId) {
        return tx.findByProductIdAndTransactionType(
                productId,
                InventoryTransaction.TransactionType.SALE
        );
    }
}
