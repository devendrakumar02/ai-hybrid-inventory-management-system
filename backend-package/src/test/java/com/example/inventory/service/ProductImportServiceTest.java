package com.example.inventory.service;

import com.example.inventory.dto.*;
import com.example.inventory.entity.Product;
import com.example.inventory.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProductImportServiceTest {

    private ProductRepository mockProductRepository;
    private EntityManager mockEntityManager;
    private ProductImportService importService;

    @BeforeEach
    void setUp() {
        mockProductRepository = mock(ProductRepository.class);
        mockEntityManager = mock(EntityManager.class);
        importService = new ProductImportService(mockProductRepository, mockEntityManager);
    }

    @Test
    void testAutoDetectColumnMappingWithAliases() {
        List<String> columns = Arrays.asList(
                "sku", "item_title", "buying_price", "mrp", "units_on_hand", "threshold", "vendor", "dept"
        );

        Map<String, String> mapping = importService.autoDetectColumnMapping(columns);

        assertEquals("sku", mapping.get(ProductImportService.FIELD_BARCODE));
        assertEquals("item_title", mapping.get(ProductImportService.FIELD_PRODUCT_NAME));
        assertEquals("buying_price", mapping.get(ProductImportService.FIELD_COST_PRICE));
        assertEquals("mrp", mapping.get(ProductImportService.FIELD_SELLING_PRICE));
        assertEquals("units_on_hand", mapping.get(ProductImportService.FIELD_QUANTITY));
        assertEquals("threshold", mapping.get(ProductImportService.FIELD_MIN_STOCK));
        assertEquals("vendor", mapping.get(ProductImportService.FIELD_SUPPLIER));
        assertEquals("dept", mapping.get(ProductImportService.FIELD_CATEGORY));
    }

    @Test
    void testParseCsvAutoDetectCommaDelimiter() throws IOException {
        String csv = "barcode,product_name,cost_price,selling_price,quantity,minimum_stock_level\n"
                + "8901234567890,Parle-G,₹18.00,22.00,100,20\n"
                + "8901030891112,Maggi,11.50,₹14.00,50,15\n";

        MockMultipartFile file = new MockMultipartFile("file", "products.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        ProductImportPreviewResponse response = importService.parseFile(file, null);

        assertNotNull(response);
        assertEquals("products.csv", response.getFileName());
        assertEquals(2, response.getTotalRows());
        assertEquals(6, response.getColumns().size());
        assertEquals(2, response.getPreviewRows().size());
        assertEquals("Parle-G", response.getPreviewRows().get(0).get("product_name"));
    }

    @Test
    void testParseCsvSemicolonDelimiterAndValidation() throws IOException {
        String csv = "code;item;cost;price;stock;reorder_level\n"
                + "SKU-100;Cookies;$25.50;30.00;45;10\n";

        MockMultipartFile file = new MockMultipartFile("file", "products.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        ProductImportPreviewResponse preview = importService.parseFile(file, null);
        assertEquals(1, preview.getTotalRows());

        ProductImportValidateRequest valReq = new ProductImportValidateRequest();
        valReq.setRows(preview.getAllRows());
        valReq.setColumnMapping(preview.getSuggestedMapping());

        ProductImportValidateResponse valRes = importService.validateRows(valReq);
        assertEquals(1, valRes.getValidCount());
        assertEquals(0, valRes.getSkippedCount());
    }

    @Test
    void testValidationSkipsInvalidValuesAndExcessiveLimits() {
        List<Map<String, String>> rows = new ArrayList<>();

        // Row 1: Exceeds cost_price limit 99,999,999.99
        Map<String, String> row1 = new HashMap<>();
        row1.put("barcode", "BC-OVERFLOW");
        row1.put("name", "Diamond Ring");
        row1.put("cost", "100000000.00"); // 100 million > 99,999,999.99
        row1.put("price", "120000000.00");
        row1.put("qty", "5");
        row1.put("min", "1");
        rows.add(row1);

        // Row 2: Negative stock quantity
        Map<String, String> row2 = new HashMap<>();
        row2.put("barcode", "BC-NEG");
        row2.put("name", "Defective Item");
        row2.put("cost", "10.00");
        row2.put("price", "15.00");
        row2.put("qty", "-5");
        row2.put("min", "2");
        rows.add(row2);

        // Row 3: Valid row
        Map<String, String> row3 = new HashMap<>();
        row3.put("barcode", "BC-VALID");
        row3.put("name", "Tea Packet");
        row3.put("cost", "₹45.00");
        row3.put("price", "₹55.00");
        row3.put("qty", "20");
        row3.put("min", "5");
        rows.add(row3);

        Map<String, String> mapping = new HashMap<>();
        mapping.put(ProductImportService.FIELD_BARCODE, "barcode");
        mapping.put(ProductImportService.FIELD_PRODUCT_NAME, "name");
        mapping.put(ProductImportService.FIELD_COST_PRICE, "cost");
        mapping.put(ProductImportService.FIELD_SELLING_PRICE, "price");
        mapping.put(ProductImportService.FIELD_QUANTITY, "qty");
        mapping.put(ProductImportService.FIELD_MIN_STOCK, "min");

        ProductImportValidateRequest req = new ProductImportValidateRequest();
        req.setRows(rows);
        req.setColumnMapping(mapping);

        ProductImportValidateResponse res = importService.validateRows(req);

        assertEquals(1, res.getValidCount());
        assertEquals(2, res.getSkippedCount());
        assertTrue(res.getSkippedRows().get(0).getReason().contains("exceeds maximum allowed limit"));
        assertTrue(res.getSkippedRows().get(1).getReason().contains("cannot be negative"));
    }

    @Test
    void testInFileDuplicateBarcodeDetection() {
        List<Map<String, String>> rows = new ArrayList<>();

        Map<String, String> row1 = new HashMap<>();
        row1.put("barcode", "BC-DUP-01");
        row1.put("name", "Item 1");
        row1.put("cost", "10.00");
        row1.put("price", "15.00");
        row1.put("qty", "10");
        row1.put("min", "2");
        rows.add(row1);

        Map<String, String> row2 = new HashMap<>();
        row2.put("barcode", "BC-DUP-01"); // Duplicate!
        row2.put("name", "Item 1 Dup");
        row2.put("cost", "10.00");
        row2.put("price", "15.00");
        row2.put("qty", "5");
        row2.put("min", "2");
        rows.add(row2);

        Map<String, String> mapping = new HashMap<>();
        mapping.put(ProductImportService.FIELD_BARCODE, "barcode");
        mapping.put(ProductImportService.FIELD_PRODUCT_NAME, "name");
        mapping.put(ProductImportService.FIELD_COST_PRICE, "cost");
        mapping.put(ProductImportService.FIELD_SELLING_PRICE, "price");
        mapping.put(ProductImportService.FIELD_QUANTITY, "qty");
        mapping.put(ProductImportService.FIELD_MIN_STOCK, "min");

        ProductImportValidateRequest req = new ProductImportValidateRequest();
        req.setRows(rows);
        req.setColumnMapping(mapping);

        ProductImportValidateResponse res = importService.validateRows(req);

        assertEquals(1, res.getValidCount());
        assertEquals(1, res.getSkippedCount());
        assertTrue(res.getSkippedRows().get(0).getReason().contains("Duplicate barcode"));
    }

    @Test
    void testExecuteImportInsertsAndFillsPairedColumns() {
        List<Map<String, String>> rows = new ArrayList<>();
        Map<String, String> row = new HashMap<>();
        row.put("barcode", "8901234567890");
        row.put("product_name", "Parle-G Biscuits");
        row.put("cost_price", "18.50");
        row.put("selling_price", "22.00");
        row.put("quantity", "120");
        row.put("minimum_stock_level", "30");
        rows.add(row);

        Map<String, String> mapping = new HashMap<>();
        mapping.put(ProductImportService.FIELD_BARCODE, "barcode");
        mapping.put(ProductImportService.FIELD_PRODUCT_NAME, "product_name");
        mapping.put(ProductImportService.FIELD_COST_PRICE, "cost_price");
        mapping.put(ProductImportService.FIELD_SELLING_PRICE, "selling_price");
        mapping.put(ProductImportService.FIELD_QUANTITY, "quantity");
        mapping.put(ProductImportService.FIELD_MIN_STOCK, "minimum_stock_level");

        ProductImportExecuteRequest req = new ProductImportExecuteRequest();
        req.setRows(rows);
        req.setColumnMapping(mapping);
        req.setDuplicateStrategy("SKIP");

        when(mockProductRepository.findByBarcodeIn(any())).thenReturn(Collections.emptyList());

        ProductImportResultResponse result = importService.executeImport(req);

        assertEquals(1, result.getInsertedCount());
        assertEquals(0, result.getUpdatedCount());
        assertEquals(0, result.getSkippedCount());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Product>> captor = ArgumentCaptor.forClass(List.class);
        verify(mockProductRepository).saveAll(captor.capture());

        List<Product> saved = captor.getValue();
        assertEquals(1, saved.size());
        Product p = saved.get(0);

        // Verify paired columns
        assertEquals("Parle-G Biscuits", p.getProductName());
        assertEquals("Parle-G Biscuits", p.getName());
        assertEquals(new BigDecimal("18.50"), p.getCostPrice());
        assertEquals(new BigDecimal("18.50"), p.getPurchasePrice());
        assertEquals(120, p.getQuantity());
        assertEquals(120, p.getStockQuantity());
        assertEquals(30, p.getMinimumStockLevel());
        assertEquals(30, p.getMinStockThreshold());
    }

    @Test
    void testExecuteImportDuplicateStrategies() {
        // Prepare existing product
        Product existing = new Product();
        existing.setId(1L);
        existing.setBarcode("8901234567890");
        existing.setProductName("Old Rice");
        existing.setPurchasePrice(new BigDecimal("50.00"));
        existing.setSellingPrice(new BigDecimal("60.00"));
        existing.setQuantity(20);
        existing.setMinimumStockLevel(10);

        List<Map<String, String>> rows = new ArrayList<>();
        Map<String, String> row = new HashMap<>();
        row.put("barcode", "8901234567890");
        row.put("product_name", "Updated Rice");
        row.put("cost_price", "55.00");
        row.put("selling_price", "65.00");
        row.put("quantity", "15"); // 15 imported
        row.put("minimum_stock_level", "10");
        rows.add(row);

        Map<String, String> mapping = new HashMap<>();
        mapping.put(ProductImportService.FIELD_BARCODE, "barcode");
        mapping.put(ProductImportService.FIELD_PRODUCT_NAME, "product_name");
        mapping.put(ProductImportService.FIELD_COST_PRICE, "cost_price");
        mapping.put(ProductImportService.FIELD_SELLING_PRICE, "selling_price");
        mapping.put(ProductImportService.FIELD_QUANTITY, "quantity");
        mapping.put(ProductImportService.FIELD_MIN_STOCK, "minimum_stock_level");

        // Test ADD_STOCK strategy
        ProductImportExecuteRequest reqAddStock = new ProductImportExecuteRequest();
        reqAddStock.setRows(rows);
        reqAddStock.setColumnMapping(mapping);
        reqAddStock.setDuplicateStrategy("ADD_STOCK");

        when(mockProductRepository.findByBarcodeIn(any())).thenReturn(Collections.singletonList(existing));

        ProductImportResultResponse res = importService.executeImport(reqAddStock);

        assertEquals(0, res.getInsertedCount());
        assertEquals(1, res.getUpdatedCount());
        // Quantity should be 20 + 15 = 35 for BOTH quantity and stockQuantity
        assertEquals(35, existing.getQuantity());
        assertEquals(35, existing.getStockQuantity());
        assertTrue(existing.getRestockedAboveMin());
    }
}
