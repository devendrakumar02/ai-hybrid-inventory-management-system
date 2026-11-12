package com.example.inventory.controller;

import com.example.inventory.dto.TransactionRequest;
import com.example.inventory.entity.InventoryTransaction;
import com.example.inventory.service.TransactionService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/transactions")
@CrossOrigin(origins = "http://localhost:5173")
public class TransactionController {

    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<InventoryTransaction> create(
            @Valid @RequestBody TransactionRequest request) {

        InventoryTransaction transaction = service.process(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(transaction);
    }
    @GetMapping
    public ResponseEntity<?> getTransactions() {
        return ResponseEntity.ok(service.getAll());
    }
}