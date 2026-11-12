package com.example.inventory.controller;

import com.example.inventory.entity.Product;
import com.example.inventory.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
public class ProductController {

 private final ProductService service;

 public ProductController(ProductService service) {
  this.service = service;
 }

 @GetMapping
 public List<Product> all(
         @RequestParam(required = false) String q) {

  return service.all(q);
 }

 @GetMapping("/{id}")
 public Product one(@PathVariable Long id) {

  return service.byId(id);
 }

 @GetMapping("/barcode/{barcode}")
 public Product barcode(@PathVariable String barcode) {

  return service.byBarcode(barcode);
 }

 @GetMapping("/low-stock")
 public List<Product> lowStock() {

  return service.lowStock();
 }

 @PostMapping
 public ResponseEntity<Product> create(
         @Valid @RequestBody Product product) {

  Product saved = service.save(product);

  return ResponseEntity
          .status(HttpStatus.CREATED)
          .body(saved);
 }

 @PutMapping("/{id}")
 public Product update(
         @PathVariable Long id,
         @Valid @RequestBody Product product) {

  return service.update(id, product);
 }

 @DeleteMapping("/{id}")
 public ResponseEntity<Void> delete(
         @PathVariable Long id) {

  service.delete(id);

  return ResponseEntity.noContent().build();
 }
}