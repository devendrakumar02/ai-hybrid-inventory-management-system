package com.example.inventory.dto;

import java.util.List;
import java.util.Map;

/**
 * Response for file upload and preview step (Step 1).
 */
public class ProductImportPreviewResponse {
    private String fileName;
    private List<String> sheetNames;
    private String selectedSheet;
    private List<String> columns;
    private List<Map<String, String>> previewRows;
    private int totalRows;
    private List<Map<String, String>> allRows;
    private Map<String, String> suggestedMapping;

    public ProductImportPreviewResponse() {
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public List<String> getSheetNames() {
        return sheetNames;
    }

    public void setSheetNames(List<String> sheetNames) {
        this.sheetNames = sheetNames;
    }

    public String getSelectedSheet() {
        return selectedSheet;
    }

    public void setSelectedSheet(String selectedSheet) {
        this.selectedSheet = selectedSheet;
    }

    public List<String> getColumns() {
        return columns;
    }

    public void setColumns(List<String> columns) {
        this.columns = columns;
    }

    public List<Map<String, String>> getPreviewRows() {
        return previewRows;
    }

    public void setPreviewRows(List<Map<String, String>> previewRows) {
        this.previewRows = previewRows;
    }

    public int getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public List<Map<String, String>> getAllRows() {
        return allRows;
    }

    public void setAllRows(List<Map<String, String>> allRows) {
        this.allRows = allRows;
    }

    public Map<String, String> getSuggestedMapping() {
        return suggestedMapping;
    }

    public void setSuggestedMapping(Map<String, String> suggestedMapping) {
        this.suggestedMapping = suggestedMapping;
    }
}
