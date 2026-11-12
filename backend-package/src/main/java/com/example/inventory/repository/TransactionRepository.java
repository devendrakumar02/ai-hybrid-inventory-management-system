package com.example.inventory.repository;
import com.example.inventory.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.*;
import java.time.LocalDateTime;
import java.util.*;
public interface TransactionRepository extends JpaRepository<InventoryTransaction,Long> {
 Optional<InventoryTransaction> findByLocalTransactionId(String id);
 List<InventoryTransaction> findTop10ByOrderByTransactionDateDesc();
 List<InventoryTransaction> findByTransactionDateBetween(LocalDateTime from,LocalDateTime to);
 List<InventoryTransaction> findByProductId(Long productId);
 List<InventoryTransaction> findAllByOrderByTransactionDateDesc();
 List<InventoryTransaction> findByProductIdAndTransactionType(
         Long productId,
         InventoryTransaction.TransactionType transactionType
 );
 @Query("select coalesce(sum(t.totalAmount),0) from InventoryTransaction t where t.transactionType='SALE' and t.transactionDate between :a and :b")
 java.math.BigDecimal salesBetween(LocalDateTime a,LocalDateTime b);

}
