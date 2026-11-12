package com.example.inventory.repository;

import com.example.inventory.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

 Optional<Product> findByBarcode(String barcode);

 boolean existsByBarcode(String barcode);

 List<Product> findByBarcodeIn(Collection<String> barcodes);

 List<Product> findByProductNameContainingIgnoreCaseOrBarcodeContainingIgnoreCase(
         String productName,
         String barcode
 );
}