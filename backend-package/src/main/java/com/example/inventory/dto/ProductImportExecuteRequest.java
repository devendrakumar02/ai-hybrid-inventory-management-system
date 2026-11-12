package com.example.inventory.dto;

import java.util.List;
import java.util.Map;

/**
 * Request payload to execute the transactional batch import into products table.
 */
public class ProductImportExecuteRequest {
    private List<Map<String, String>> rows;
    private Map<String, String> columnMapping;
    private Integer defaultMinStockLevel;
    private boolean autoGenerateBarcodes;
    private String duplicateStrategy; // SKIP, UPDATE, ADD_STOCK

    public ProductImportExecuteRequest() {
    }

    public List<Map<String, String>> getRows() {
        return rows;
    }

    public void setRows(List<Map<String, String>> rows) {
        this.rows = rows;
    }

    public Map<String, String> getColumnMapping() {
        return columnMapping;
    }

    public void setColumnMapping(Map<String, String> columnMapping) {
        this.columnMapping = columnMapping;
    }

    public Integer getDefaultMinStockLevel() {
        return defaultMinStockLevel;
    }

    public void setDefaultMinStockLevel(Integer defaultMinStockLevel) {
        this.defaultMinStockLevel = defaultMinStockLevel;
    }

    public boolean isAutoGenerateBarcodes() {
        return autoGenerateBarcodes;
    }

    public void setAutoGenerateBarcodes(boolean autoGenerateBarcodes) {
        this.autoGenerateBarcodes = autoGenerateBarcodes;
    }

    public String getDuplicateStrategy() {
        return duplicateStrategy;
    }

    public void setDuplicateStrategy(String duplicateStrategy) {
        this.duplicateStrategy = duplicateStrategy;
    }
}
