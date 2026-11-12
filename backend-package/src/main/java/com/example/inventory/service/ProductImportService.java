package com.example.inventory.service;

import com.example.inventory.dto.*;
import com.example.inventory.entity.Product;
import com.example.inventory.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service handling parsing, automatic column mapping, validation, and transactional
 * batch persistence of bulk product imports from CSV and Excel files.
 */
@Service
public class ProductImportService {

    private static final Logger log = LoggerFactory.getLogger(ProductImportService.class);

    private static final BigDecimal MAX_COST_PRICE = new BigDecimal("99999999.99");
    private static final int MAX_VARCHAR_LENGTH = 255;
    private static final int BATCH_SIZE = 100;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    // Canonical logical fields
    public static final String FIELD_BARCODE = "barcode";
    public static final String FIELD_PRODUCT_NAME = "productName";
    public static final String FIELD_COST_PRICE = "costPrice";
    public static final String FIELD_SELLING_PRICE = "sellingPrice";
    public static final String FIELD_QUANTITY = "quantity";
    public static final String FIELD_MIN_STOCK = "minimumStockLevel";
    public static final String FIELD_CATEGORY = "category";
    public static final String FIELD_SUPPLIER = "supplier";
    public static final String FIELD_ADMIN_EMAIL = "adminEmail";
    public static final String FIELD_MANAGER_EMAIL = "managerEmail";

    // Alias dictionary for intelligent column matching
    private static final Map<String, List<String>> ALIASES = new LinkedHashMap<>();

    static {
        ALIASES.put(FIELD_BARCODE, Arrays.asList("barcode", "sku", "code", "product_code", "item_code", "ean", "upc", "bar_code", "product_barcode"));
        ALIASES.put(FIELD_PRODUCT_NAME, Arrays.asList("product_name", "name", "item", "title", "product", "prod", "description", "item_name", "product_title"));
        ALIASES.put(FIELD_COST_PRICE, Arrays.asList("cost_price", "cost", "purchase_price", "buying_price", "unit_cost", "buy_price", "purchase_cost"));
        ALIASES.put(FIELD_SELLING_PRICE, Arrays.asList("selling_price", "price", "mrp", "rate", "sale_price", "retail_price", "unit_price", "sell_price"));
        ALIASES.put(FIELD_QUANTITY, Arrays.asList("quantity", "qty", "stock", "units", "on_hand", "available", "stock_quantity", "current_stock", "inventory_count"));
        ALIASES.put(FIELD_MIN_STOCK, Arrays.asList("minimum_stock_level", "min_stock", "min_stock_threshold", "reorder_level", "threshold", "min_qty", "min", "minimum_quantity", "reorder_point"));
        ALIASES.put(FIELD_CATEGORY, Arrays.asList("category", "type", "group", "department", "dept", "cat", "category_name", "product_category"));
        ALIASES.put(FIELD_SUPPLIER, Arrays.asList("supplier", "vendor", "supp", "supplier_name", "vendor_name", "distributor"));
        ALIASES.put(FIELD_ADMIN_EMAIL, Arrays.asList("admin_email", "admin", "email_admin", "admin_mail"));
        ALIASES.put(FIELD_MANAGER_EMAIL, Arrays.asList("manager_email", "manager", "email_manager", "manager_mail", "store_manager_email"));
    }

    private final ProductRepository productRepository;
    private final EntityManager entityManager;

    public ProductImportService(ProductRepository productRepository, EntityManager entityManager) {
        this.productRepository = productRepository;
        this.entityManager = entityManager;
    }

    // =========================================================================
    // 1. FILE PARSING & PREVIEW (CSV, XLSX, XLS, XLSM)
    // =========================================================================

    public ProductImportPreviewResponse parseFile(MultipartFile file, String requestedSheetName) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("The uploaded file is empty. Please provide a valid file.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().trim() : "file";
        String lowerFilename = originalFilename.toLowerCase();

        boolean isCsv = lowerFilename.endsWith(".csv");
        boolean isExcel = lowerFilename.endsWith(".xlsx") || lowerFilename.endsWith(".xls") || lowerFilename.endsWith(".xlsm");

        if (!isCsv && !isExcel) {
            throw new IllegalArgumentException("Unsupported file format: '" + originalFilename + "'. Supported formats are .csv, .xlsx, .xls, and .xlsm.");
        }

        List<String> sheetNames = new ArrayList<>();
        String selectedSheet = null;
        List<String> columns = new ArrayList<>();
        List<Map<String, String>> allRows = new ArrayList<>();

        if (isExcel) {
            try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
                int totalSheets = workbook.getNumberOfSheets();
                if (totalSheets == 0) {
                    throw new IllegalArgumentException("Excel workbook contains no sheets.");
                }

                for (int i = 0; i < totalSheets; i++) {
                    sheetNames.add(workbook.getSheetName(i));
                }

                Sheet sheet = null;
                if (requestedSheetName != null && !requestedSheetName.isBlank()) {
                    sheet = workbook.getSheet(requestedSheetName);
                }
                if (sheet == null) {
                    sheet = workbook.getSheetAt(0);
                }
                selectedSheet = sheet.getSheetName();

                DataFormatter formatter = new DataFormatter();
                Iterator<Row> rowIterator = sheet.rowIterator();

                // Find header row
                Row headerRow = null;
                while (rowIterator.hasNext()) {
                    Row r = rowIterator.next();
                    if (hasNonEmptyCell(r, formatter)) {
                        headerRow = r;
                        break;
                    }
                }

                if (headerRow == null) {
                    throw new IllegalArgumentException("No header row found in the selected sheet '" + selectedSheet + "'.");
                }

                int lastCellNum = headerRow.getLastCellNum();
                for (int c = 0; c < lastCellNum; c++) {
                    Cell cell = headerRow.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    String headerVal = cell != null ? formatter.formatCellValue(cell).trim() : "";
                    if (headerVal.isEmpty()) {
                        headerVal = "Column_" + (c + 1);
                    }
                    columns.add(headerVal);
                }

                // Read data rows
                while (rowIterator.hasNext()) {
                    Row r = rowIterator.next();
                    if (!hasNonEmptyCell(r, formatter)) {
                        continue; // Skip entirely blank rows
                    }
                    Map<String, String> rowMap = new LinkedHashMap<>();
                    for (int c = 0; c < columns.size(); c++) {
                        Cell cell = r.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                        String val = cell != null ? formatter.formatCellValue(cell).trim() : "";
                        rowMap.put(columns.get(c), val);
                    }
                    allRows.add(rowMap);
                }
            }
        } else {
            // CSV Parsing
            byte[] bytes = file.getBytes();
            if (bytes.length == 0) {
                throw new IllegalArgumentException("CSV file is empty.");
            }

            Charset charset = detectCsvCharset(bytes);
            String csvContent = new String(bytes, charset);
            // Strip UTF-8 BOM if present
            if (csvContent.startsWith("\uFEFF")) {
                csvContent = csvContent.substring(1);
            }

            char delimiter = detectCsvDelimiter(csvContent);
            List<List<String>> parsedCsv = parseCsvLines(csvContent, delimiter);

            if (parsedCsv.isEmpty()) {
                throw new IllegalArgumentException("CSV file contains no valid data rows.");
            }

            List<String> header = parsedCsv.get(0);
            for (int i = 0; i < header.size(); i++) {
                String h = header.get(i).trim();
                if (h.isEmpty()) {
                    h = "Column_" + (i + 1);
                }
                columns.add(h);
            }

            for (int r = 1; r < parsedCsv.size(); r++) {
                List<String> rowValues = parsedCsv.get(r);
                boolean allEmpty = true;
                Map<String, String> rowMap = new LinkedHashMap<>();
                for (int c = 0; c < columns.size(); c++) {
                    String val = c < rowValues.size() ? rowValues.get(c).trim() : "";
                    if (!val.isEmpty()) {
                        allEmpty = false;
                    }
                    rowMap.put(columns.get(c), val);
                }
                if (!allEmpty) {
                    allRows.add(rowMap);
                }
            }
        }

        // Preview top 10 rows
        List<Map<String, String>> previewRows = allRows.stream().limit(10).collect(Collectors.toList());

        // Auto-detect column mapping
        Map<String, String> suggestedMapping = autoDetectColumnMapping(columns);

        ProductImportPreviewResponse response = new ProductImportPreviewResponse();
        response.setFileName(originalFilename);
        response.setSheetNames(sheetNames);
        response.setSelectedSheet(selectedSheet);
        response.setColumns(columns);
        response.setPreviewRows(previewRows);
        response.setAllRows(allRows);
        response.setTotalRows(allRows.size());
        response.setSuggestedMapping(suggestedMapping);

        return response;
    }

    private boolean hasNonEmptyCell(Row row, DataFormatter formatter) {
        if (row == null) return false;
        for (Cell cell : row) {
            if (cell != null && !formatter.formatCellValue(cell).trim().isEmpty()) {
                return true;
            }
        }
        return false;
    }

    // =========================================================================
    // 2. DELIMITER & ENCODING DETECTION
    // =========================================================================

    private Charset detectCsvCharset(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xEF && (bytes[1] & 0xFF) == 0xBB && (bytes[2] & 0xFF) == 0xBF) {
            return StandardCharsets.UTF_8;
        }
        try {
            StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes));
            return StandardCharsets.UTF_8;
        } catch (Exception ignored) {
            return StandardCharsets.ISO_8859_1;
        }
    }

    private char detectCsvDelimiter(String content) {
        String[] lines = content.split("\\r?\\n", 10);
        int commaCount = 0;
        int semicolonCount = 0;
        int tabCount = 0;

        for (String line : lines) {
            if (line.isBlank()) continue;
            for (char ch : line.toCharArray()) {
                if (ch == ',') commaCount++;
                else if (ch == ';') semicolonCount++;
                else if (ch == '\t') tabCount++;
            }
        }

        if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
        if (semicolonCount > commaCount) return ';';
        return ',';
    }

    private List<List<String>> parseCsvLines(String text, char delimiter) {
        List<List<String>> lines = new ArrayList<>();
        List<String> currentLine = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);

            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        currentField.append('"');
                        i++; // Skip escaped quote
                    } else {
                        inQuotes = false;
                    }
                } else {
                    currentField.append(c);
                }
            } else {
                if (c == '"') {
                    inQuotes = true;
                } else if (c == delimiter) {
                    currentLine.add(currentField.toString());
                    currentField.setLength(0);
                } else if (c == '\r') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '\n') {
                        i++;
                    }
                    currentLine.add(currentField.toString());
                    currentField.setLength(0);
                    lines.add(currentLine);
                    currentLine = new ArrayList<>();
                } else if (c == '\n') {
                    currentLine.add(currentField.toString());
                    currentField.setLength(0);
                    lines.add(currentLine);
                    currentLine = new ArrayList<>();
                } else {
                    currentField.append(c);
                }
            }
        }

        if (currentField.length() > 0 || !currentLine.isEmpty()) {
            currentLine.add(currentField.toString());
            lines.add(currentLine);
        }

        return lines;
    }

    // =========================================================================
    // 3. AUTOMATIC COLUMN MAPPING WITH ALIAS DICTIONARY
    // =========================================================================

    public Map<String, String> autoDetectColumnMapping(List<String> fileColumns) {
        Map<String, String> mapping = new LinkedHashMap<>();
        Set<String> usedColumns = new HashSet<>();

        // Normalize file column names for matching
        Map<String, String> normalizedToOriginal = new LinkedHashMap<>();
        for (String col : fileColumns) {
            normalizedToOriginal.put(normalize(col), col);
        }

        // 1st Pass: Exact matching against canonical names and aliases
        for (Map.Entry<String, List<String>> entry : ALIASES.entrySet()) {
            String logicalField = entry.getKey();
            List<String> aliasList = entry.getValue();

            for (String alias : aliasList) {
                String normAlias = normalize(alias);
                if (normalizedToOriginal.containsKey(normAlias)) {
                    String originalCol = normalizedToOriginal.get(normAlias);
                    if (!usedColumns.contains(originalCol)) {
                        mapping.put(logicalField, originalCol);
                        usedColumns.add(originalCol);
                        break;
                    }
                }
            }
        }

        // 2nd Pass: Partial / Substring matching for unmapped logical fields
        for (Map.Entry<String, List<String>> entry : ALIASES.entrySet()) {
            String logicalField = entry.getKey();
            if (mapping.containsKey(logicalField)) {
                continue;
            }

            List<String> aliasList = entry.getValue();
            for (Map.Entry<String, String> colEntry : normalizedToOriginal.entrySet()) {
                String normCol = colEntry.getKey();
                String originalCol = colEntry.getValue();
                if (usedColumns.contains(originalCol)) {
                    continue;
                }

                boolean match = false;
                for (String alias : aliasList) {
                    String normAlias = normalize(alias);
                    if (normCol.contains(normAlias) || normAlias.contains(normCol)) {
                        match = true;
                        break;
                    }
                }

                if (match) {
                    mapping.put(logicalField, originalCol);
                    usedColumns.add(originalCol);
                    break;
                }
            }
        }

        return mapping;
    }

    private String normalize(String str) {
        if (str == null) return "";
        return str.toLowerCase()
                .trim()
                .replaceAll("[\\s\\-]+", "_")
                .replaceAll("[^a-z0-9_]", "");
    }

    // =========================================================================
    // 4. VALIDATION & PRE-IMPORT REVIEW (STEP 3)
    // =========================================================================

    public ProductImportValidateResponse validateRows(ProductImportValidateRequest request) {
        List<Map<String, String>> rows = request.getRows();
        Map<String, String> mapping = request.getColumnMapping() != null ? request.getColumnMapping() : Collections.emptyMap();
        Integer defaultMinStock = request.getDefaultMinStockLevel();
        boolean autoGenBarcodes = request.isAutoGenerateBarcodes();

        ProductImportValidateResponse response = new ProductImportValidateResponse();
        if (rows == null || rows.isEmpty()) {
            response.setTotalRows(0);
            response.setValidCount(0);
            response.setSkippedCount(0);
            response.setSkippedRows(Collections.emptyList());
            response.setPreviewValidRows(Collections.emptyList());
            return response;
        }

        response.setTotalRows(rows.size());
        List<SkippedRowInfo> skippedRows = new ArrayList<>();
        List<Map<String, Object>> previewValidRows = new ArrayList<>();
        Set<String> seenBarcodesInFile = new HashSet<>();
        Set<String> validBarcodes = new HashSet<>();

        int validCount = 0;

        for (int i = 0; i < rows.size(); i++) {
            int rowNumber = i + 1;
            Map<String, String> raw = rows.get(i);
            ValidationResult res = validateSingleRow(raw, mapping, rowNumber, defaultMinStock, autoGenBarcodes, seenBarcodesInFile);

            if (!res.isValid) {
                skippedRows.add(new SkippedRowInfo(rowNumber, res.barcode, res.productName, res.reason, raw));
            } else {
                validCount++;
                validBarcodes.add(res.barcode);
                if (previewValidRows.size() < 10) {
                    previewValidRows.add(res.cleanedValues);
                }
            }
        }

        // Check which barcodes already exist in DB
        int existingCount = 0;
        if (!validBarcodes.isEmpty()) {
            List<Product> existingProducts = productRepository.findByBarcodeIn(validBarcodes);
            existingCount = existingProducts.size();
        }

        response.setValidCount(validCount);
        response.setSkippedCount(skippedRows.size());
        response.setExistingBarcodeCount(existingCount);
        response.setNewBarcodeCount(validCount - existingCount);
        response.setSkippedRows(skippedRows);
        response.setPreviewValidRows(previewValidRows);

        return response;
    }

    private static class ValidationResult {
        boolean isValid = false;
        String barcode = "";
        String productName = "";
        String reason = "";
        Map<String, Object> cleanedValues = new LinkedHashMap<>();
    }

    private ValidationResult validateSingleRow(
            Map<String, String> raw,
            Map<String, String> mapping,
            int rowNumber,
            Integer defaultMinStock,
            boolean autoGenBarcodes,
            Set<String> seenBarcodesInFile) {

        ValidationResult res = new ValidationResult();

        // 1. Barcode
        String barcodeCol = mapping.get(FIELD_BARCODE);
        String barcode = barcodeCol != null ? getVal(raw, barcodeCol) : "";
        if (barcode.isBlank()) {
            if (autoGenBarcodes) {
                barcode = "GEN-" + System.currentTimeMillis() + "-" + rowNumber + "-" + (int)(Math.random() * 900 + 100);
            } else {
                res.reason = "Missing required field: Barcode";
                return res;
            }
        }
        if (barcode.length() > MAX_VARCHAR_LENGTH) {
            res.reason = "Barcode exceeds maximum length of 255 characters";
            res.barcode = barcode;
            return res;
        }
        if (seenBarcodesInFile.contains(barcode)) {
            res.reason = "Duplicate barcode '" + barcode + "' detected inside the uploaded file";
            res.barcode = barcode;
            return res;
        }
        seenBarcodesInFile.add(barcode);
        res.barcode = barcode;
        res.cleanedValues.put(FIELD_BARCODE, barcode);

        // 2. Product Name
        String nameCol = mapping.get(FIELD_PRODUCT_NAME);
        String productName = nameCol != null ? getVal(raw, nameCol) : "";
        if (productName.isBlank()) {
            res.reason = "Missing required field: Product Name";
            return res;
        }
        if (productName.length() > MAX_VARCHAR_LENGTH) {
            res.reason = "Product Name exceeds maximum length of 255 characters";
            res.productName = productName;
            return res;
        }
        res.productName = productName;
        res.cleanedValues.put(FIELD_PRODUCT_NAME, productName);

        // 3. Cost Price
        String costCol = mapping.get(FIELD_COST_PRICE);
        String rawCost = costCol != null ? getVal(raw, costCol) : "";
        BigDecimal costPrice;
        try {
            costPrice = parseCurrencyDecimal(rawCost);
            if (costPrice == null) {
                res.reason = "Missing or empty required field: Cost Price";
                return res;
            }
            if (costPrice.compareTo(BigDecimal.ZERO) < 0) {
                res.reason = "Cost Price cannot be negative (" + costPrice + ")";
                return res;
            }
            if (costPrice.compareTo(MAX_COST_PRICE) > 0) {
                res.reason = "Cost Price (" + costPrice + ") exceeds maximum allowed limit 99,999,999.99";
                return res;
            }
        } catch (Exception ex) {
            res.reason = "Invalid Cost Price value: '" + rawCost + "'";
            return res;
        }
        res.cleanedValues.put(FIELD_COST_PRICE, costPrice);

        // 4. Selling Price
        String sellCol = mapping.get(FIELD_SELLING_PRICE);
        String rawSell = sellCol != null ? getVal(raw, sellCol) : "";
        BigDecimal sellingPrice;
        try {
            sellingPrice = parseCurrencyDecimal(rawSell);
            if (sellingPrice == null) {
                res.reason = "Missing or empty required field: Selling Price";
                return res;
            }
            if (sellingPrice.compareTo(BigDecimal.ZERO) < 0) {
                res.reason = "Selling Price cannot be negative (" + sellingPrice + ")";
                return res;
            }
        } catch (Exception ex) {
            res.reason = "Invalid Selling Price value: '" + rawSell + "'";
            return res;
        }
        res.cleanedValues.put(FIELD_SELLING_PRICE, sellingPrice);

        // 5. Stock Quantity
        String qtyCol = mapping.get(FIELD_QUANTITY);
        String rawQty = qtyCol != null ? getVal(raw, qtyCol) : "";
        Integer quantity;
        try {
            quantity = parseCleanInteger(rawQty);
            if (quantity == null) {
                res.reason = "Missing or empty required field: Stock Quantity";
                return res;
            }
            if (quantity < 0) {
                res.reason = "Stock Quantity cannot be negative (" + quantity + ")";
                return res;
            }
        } catch (Exception ex) {
            res.reason = "Invalid Stock Quantity integer: '" + rawQty + "'";
            return res;
        }
        res.cleanedValues.put(FIELD_QUANTITY, quantity);

        // 6. Minimum Stock Level
        String minStockCol = mapping.get(FIELD_MIN_STOCK);
        String rawMinStock = minStockCol != null ? getVal(raw, minStockCol) : "";
        Integer minStock;
        if (minStockCol == null || rawMinStock.isBlank()) {
            if (defaultMinStock != null && defaultMinStock >= 0) {
                minStock = defaultMinStock;
            } else {
                res.reason = "Missing required Minimum Stock Level (no column mapped and no default provided)";
                return res;
            }
        } else {
            try {
                minStock = parseCleanInteger(rawMinStock);
                if (minStock == null || minStock < 0) {
                    res.reason = "Minimum Stock Level cannot be negative";
                    return res;
                }
            } catch (Exception ex) {
                res.reason = "Invalid Minimum Stock Level integer: '" + rawMinStock + "'";
                return res;
            }
        }
        res.cleanedValues.put(FIELD_MIN_STOCK, minStock);

        // 7. Optional Category
        String catCol = mapping.get(FIELD_CATEGORY);
        String category = catCol != null ? getVal(raw, catCol) : null;
        if (category != null && category.length() > MAX_VARCHAR_LENGTH) {
            res.reason = "Category exceeds maximum length of 255 characters";
            return res;
        }
        res.cleanedValues.put(FIELD_CATEGORY, category != null && !category.isBlank() ? category : null);

        // 8. Optional Supplier
        String supCol = mapping.get(FIELD_SUPPLIER);
        String supplier = supCol != null ? getVal(raw, supCol) : null;
        if (supplier != null && supplier.length() > MAX_VARCHAR_LENGTH) {
            res.reason = "Supplier exceeds maximum length of 255 characters";
            return res;
        }
        res.cleanedValues.put(FIELD_SUPPLIER, supplier != null && !supplier.isBlank() ? supplier : null);

        // 9. Optional Admin Email
        String adminEmailCol = mapping.get(FIELD_ADMIN_EMAIL);
        String adminEmail = adminEmailCol != null ? getVal(raw, adminEmailCol) : null;
        if (adminEmail != null && !adminEmail.isBlank()) {
            if (adminEmail.length() > MAX_VARCHAR_LENGTH) {
                res.reason = "Admin email exceeds maximum length of 255 characters";
                return res;
            }
            if (!EMAIL_PATTERN.matcher(adminEmail).matches()) {
                res.reason = "Invalid admin email format: '" + adminEmail + "'";
                return res;
            }
        } else {
            adminEmail = null;
        }
        res.cleanedValues.put(FIELD_ADMIN_EMAIL, adminEmail);

        // 10. Optional Manager Email
        String mgrEmailCol = mapping.get(FIELD_MANAGER_EMAIL);
        String managerEmail = mgrEmailCol != null ? getVal(raw, mgrEmailCol) : null;
        if (managerEmail != null && !managerEmail.isBlank()) {
            if (managerEmail.length() > MAX_VARCHAR_LENGTH) {
                res.reason = "Manager email exceeds maximum length of 255 characters";
                return res;
            }
            if (!EMAIL_PATTERN.matcher(managerEmail).matches()) {
                res.reason = "Invalid manager email format: '" + managerEmail + "'";
                return res;
            }
        } else {
            managerEmail = null;
        }
        res.cleanedValues.put(FIELD_MANAGER_EMAIL, managerEmail);

        res.isValid = true;
        return res;
    }

    private String getVal(Map<String, String> map, String key) {
        if (map == null || key == null) return "";
        String val = map.get(key);
        return val != null ? val.trim() : "";
    }

    private BigDecimal parseCurrencyDecimal(String text) {
        if (text == null || text.isBlank()) return null;
        // Strip currency symbols (₹, $, €, £, Rs, etc.), commas, and extra spaces
        String clean = text.replaceAll("[₹$€£\\s]", "")
                .replaceAll("(?i)rs\\.?|inr", "")
                .replaceAll(",", "")
                .trim();
        if (clean.isBlank()) return null;
        return new BigDecimal(clean);
    }

    private Integer parseCleanInteger(String text) {
        if (text == null || text.isBlank()) return null;
        String clean = text.replaceAll("[₹$€£\\s,]", "").trim();
        if (clean.isBlank()) return null;
        // Handle numbers with decimals like "10.0"
        if (clean.contains(".")) {
            return (int) Math.round(Double.parseDouble(clean));
        }
        return Integer.parseInt(clean);
    }

    // =========================================================================
    // 5. TRANSACTIONAL BATCH INSERT/UPSERT EXECUTION
    // =========================================================================

    @Transactional(rollbackFor = Exception.class)
    public ProductImportResultResponse executeImport(ProductImportExecuteRequest request) {
        List<Map<String, String>> rows = request.getRows();
        Map<String, String> mapping = request.getColumnMapping() != null ? request.getColumnMapping() : Collections.emptyMap();
        Integer defaultMinStock = request.getDefaultMinStockLevel();
        boolean autoGenBarcodes = request.isAutoGenerateBarcodes();
        String duplicateStrategy = request.getDuplicateStrategy() != null ? request.getDuplicateStrategy().toUpperCase() : "SKIP";

        ProductImportResultResponse response = new ProductImportResultResponse();
        if (rows == null || rows.isEmpty()) {
            response.setMessage("No rows to import.");
            return response;
        }

        // Validate all rows first
        List<ValidationResult> validResults = new ArrayList<>();
        List<SkippedRowInfo> skippedDetails = new ArrayList<>();
        Set<String> seenBarcodesInFile = new HashSet<>();

        for (int i = 0; i < rows.size(); i++) {
            int rowNumber = i + 1;
            Map<String, String> raw = rows.get(i);
            ValidationResult v = validateSingleRow(raw, mapping, rowNumber, defaultMinStock, autoGenBarcodes, seenBarcodesInFile);
            if (v.isValid) {
                validResults.add(v);
            } else {
                skippedDetails.add(new SkippedRowInfo(rowNumber, v.barcode, v.productName, v.reason, raw));
            }
        }

        int insertedCount = 0;
        int updatedCount = 0;
        int skippedCount = skippedDetails.size();

        // Process valid rows in batches of BATCH_SIZE
        for (int i = 0; i < validResults.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, validResults.size());
            List<ValidationResult> chunk = validResults.subList(i, end);

            // Fetch existing products for this batch by barcode
            Set<String> chunkBarcodes = chunk.stream().map(r -> r.barcode).collect(Collectors.toSet());
            List<Product> existingProductsList = productRepository.findByBarcodeIn(chunkBarcodes);
            Map<String, Product> existingMap = existingProductsList.stream()
                    .collect(Collectors.toMap(Product::getBarcode, p -> p, (a, b) -> a));

            List<Product> toSave = new ArrayList<>();

            for (ValidationResult v : chunk) {
                String barcode = v.barcode;
                Product existing = existingMap.get(barcode);

                if (existing != null) {
                    if ("SKIP".equals(duplicateStrategy)) {
                        skippedCount++;
                        skippedDetails.add(new SkippedRowInfo(0, barcode, v.productName,
                                "Duplicate product skipped: Barcode already exists in catalog", Collections.emptyMap()));
                        continue;
                    } else if ("UPDATE".equals(duplicateStrategy)) {
                        // Update existing product: write to BOTH paired columns
                        applyValuesToProduct(existing, v.cleanedValues, false);
                        existing.setUpdatedAt(LocalDateTime.now());

                        // Apply alert-reset logic: if stock > minStock, reset cooldown flag
                        if (existing.getQuantity() != null && existing.getMinimumStockLevel() != null
                                && existing.getQuantity() > existing.getMinimumStockLevel()) {
                            existing.setRestockedAboveMin(true);
                        }

                        toSave.add(existing);
                        updatedCount++;
                    } else if ("ADD_STOCK".equals(duplicateStrategy)) {
                        // Add imported quantity to existing stock: update BOTH stock_quantity and quantity
                        Integer addQty = (Integer) v.cleanedValues.get(FIELD_QUANTITY);
                        int currentQty = existing.getQuantity() != null ? existing.getQuantity() : 0;
                        int newQty = currentQty + (addQty != null ? addQty : 0);
                        existing.setQuantity(newQty);
                        existing.setStockQuantity(newQty);
                        existing.setUpdatedAt(LocalDateTime.now());

                        // Apply alert-reset logic
                        if (existing.getMinimumStockLevel() != null && newQty > existing.getMinimumStockLevel()) {
                            existing.setRestockedAboveMin(true);
                        }

                        toSave.add(existing);
                        updatedCount++;
                    }
                } else {
                    // New product insert: write to BOTH paired columns
                    Product newProduct = new Product();
                    applyValuesToProduct(newProduct, v.cleanedValues, true);
                    newProduct.setCreatedAt(LocalDateTime.now());
                    newProduct.setUpdatedAt(LocalDateTime.now());

                    // System-managed alert columns leave NULL on insert
                    newProduct.setLastAlertAt(null);
                    newProduct.setLastCriticalAlertAt(null);
                    if (newProduct.getQuantity() != null && newProduct.getMinimumStockLevel() != null
                            && newProduct.getQuantity() > newProduct.getMinimumStockLevel()) {
                        newProduct.setRestockedAboveMin(true);
                    } else {
                        newProduct.setRestockedAboveMin(null);
                    }

                    toSave.add(newProduct);
                    insertedCount++;
                }
            }

            if (!toSave.isEmpty()) {
                productRepository.saveAll(toSave);
                entityManager.flush();
                entityManager.clear();
            }
        }

        log.info("Bulk import completed: {} inserted, {} updated, {} skipped.", insertedCount, updatedCount, skippedCount);

        response.setInsertedCount(insertedCount);
        response.setUpdatedCount(updatedCount);
        response.setSkippedCount(skippedCount);
        response.setFailedCount(0);
        response.setSkippedDetails(skippedDetails);
        response.setMessage(String.format("Bulk import completed successfully: %d inserted, %d updated, %d skipped.",
                insertedCount, updatedCount, skippedCount));

        return response;
    }

    private void applyValuesToProduct(Product p, Map<String, Object> values, boolean isInsert) {
        p.setBarcode((String) values.get(FIELD_BARCODE));

        // Paired: name and product_name
        String name = (String) values.get(FIELD_PRODUCT_NAME);
        p.setName(name);
        p.setProductName(name);

        // Paired: cost_price and purchase_price
        BigDecimal cost = (BigDecimal) values.get(FIELD_COST_PRICE);
        p.setCostPrice(cost);
        p.setPurchasePrice(cost);

        p.setSellingPrice((BigDecimal) values.get(FIELD_SELLING_PRICE));

        // Paired: stock_quantity and quantity
        Integer qty = (Integer) values.get(FIELD_QUANTITY);
        p.setStockQuantity(qty);
        p.setQuantity(qty);

        // Paired: min_stock_threshold and minimum_stock_level
        Integer minStock = (Integer) values.get(FIELD_MIN_STOCK);
        p.setMinStockThreshold(minStock);
        p.setMinimumStockLevel(minStock);

        p.setCategory((String) values.get(FIELD_CATEGORY));
        p.setSupplier((String) values.get(FIELD_SUPPLIER));

        String adminEmail = (String) values.get(FIELD_ADMIN_EMAIL);
        if (adminEmail != null || isInsert) {
            p.setAdminEmail(adminEmail);
        }

        String managerEmail = (String) values.get(FIELD_MANAGER_EMAIL);
        if (managerEmail != null || isInsert) {
            p.setManagerEmail(managerEmail);
        }

        p.syncPairs();
    }

    // =========================================================================
    // 6. CSV TEMPLATE GENERATOR
    // =========================================================================

    public byte[] generateCsvTemplate() {
        String template = "barcode,product_name,category,cost_price,selling_price,stock_quantity,minimum_stock_level,supplier,admin_email,manager_email\r\n"
                + "8901234567890,Parle-G Biscuits,Biscuits,18.00,22.00,128,30,Parle Products,admin@example.com,store-manager@example.com\r\n"
                + "8901030891112,Maggi Noodles,Noodles,11.50,14.00,42,50,Nestle India,admin@example.com,store-manager@example.com\r\n";
        return template.getBytes(StandardCharsets.UTF_8);
    }
}
