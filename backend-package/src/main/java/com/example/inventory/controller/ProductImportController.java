package com.example.inventory.controller;

import com.example.inventory.dto.*;
import com.example.inventory.service.ProductImportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Controller exposing endpoints for bulk product import from CSV and Excel files.
 */
@RestController
@RequestMapping("/products/import")
public class ProductImportController {

    private final ProductImportService importService;

    public ProductImportController(ProductImportService importService) {
        this.importService = importService;
    }

    /**
     * Upload and parse CSV or Excel file, returning preview of first 10 rows and auto-detected column mapping.
     */
    @PostMapping(value = "/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductImportPreviewResponse> parseFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sheetName", required = false) String sheetName) throws IOException {

        ProductImportPreviewResponse preview = importService.parseFile(file, sheetName);
        return ResponseEntity.ok(preview);
    }

    /**
     * Validate mapped rows, types, values, and detect existing database duplicates.
     */
    @PostMapping("/validate")
    public ResponseEntity<ProductImportValidateResponse> validate(
            @RequestBody ProductImportValidateRequest request) {

        ProductImportValidateResponse validation = importService.validateRows(request);
        return ResponseEntity.ok(validation);
    }

    /**
     * Execute transactional batch import/upsert into products table.
     */
    @PostMapping("/execute")
    public ResponseEntity<ProductImportResultResponse> execute(
            @RequestBody ProductImportExecuteRequest request) {

        ProductImportResultResponse result = importService.executeImport(request);
        return ResponseEntity.status(HttpStatus.OK).body(result);
    }

    /**
     * Download CSV template for bulk product import.
     */
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] csvBytes = importService.generateCsvTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"products_import_template.csv\"");
        return new ResponseEntity<>(csvBytes, headers, HttpStatus.OK);
    }
}
