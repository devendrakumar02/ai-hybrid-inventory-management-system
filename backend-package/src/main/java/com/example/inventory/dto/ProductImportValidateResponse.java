package com.example.inventory.dto;

import java.util.List;
import java.util.Map;

/**
 * Validation summary results before committing to database.
 */
public class ProductImportValidateResponse {
    private int totalRows;
    private int validCount;
    private int skippedCount;
    private int existingBarcodeCount;
    private int newBarcodeCount;
    private List<SkippedRowInfo> skippedRows;
    private List<Map<String, Object>> previewValidRows;

    public ProductImportValidateResponse() {
    }

    public int getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public int getValidCount() {
        return validCount;
    }

    public void setValidCount(int validCount) {
        this.validCount = validCount;
    }

    public int getSkippedCount() {
        return skippedCount;
    }

    public void setSkippedCount(int skippedCount) {
        this.skippedCount = skippedCount;
    }

    public int getExistingBarcodeCount() {
        return existingBarcodeCount;
    }

    public void setExistingBarcodeCount(int existingBarcodeCount) {
        this.existingBarcodeCount = existingBarcodeCount;
    }

    public int getNewBarcodeCount() {
        return newBarcodeCount;
    }

    public void setNewBarcodeCount(int newBarcodeCount) {
        this.newBarcodeCount = newBarcodeCount;
    }

    public List<SkippedRowInfo> getSkippedRows() {
        return skippedRows;
    }

    public void setSkippedRows(List<SkippedRowInfo> skippedRows) {
        this.skippedRows = skippedRows;
    }

    public List<Map<String, Object>> getPreviewValidRows() {
        return previewValidRows;
    }

    public void setPreviewValidRows(List<Map<String, Object>> previewValidRows) {
        this.previewValidRows = previewValidRows;
    }
}
