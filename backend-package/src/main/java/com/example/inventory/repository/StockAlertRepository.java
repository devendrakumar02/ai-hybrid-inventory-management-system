package com.example.inventory.repository;

import com.example.inventory.entity.StockAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockAlertRepository extends JpaRepository<StockAlert, Long> {

    List<StockAlert> findByStatus(String status);

    List<StockAlert> findAllByOrderByAlertDateDesc();

    long countByStatus(String status);

    boolean existsByProductIdAndStatus(Long productId, String status);
}
