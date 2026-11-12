package com.example.inventory.dto;

import java.util.Map;

/**
 * Information regarding a row that was skipped or failed during import.
 */
public class SkippedRowInfo {
    private int rowNumber;
    private String barcode;
    private String productName;
    private String reason;
    private Map<String, String> rawData;

    public SkippedRowInfo() {
    }

    public SkippedRowInfo(int rowNumber, String barcode, String productName, String reason, Map<String, String> rawData) {
        this.rowNumber = rowNumber;
        this.barcode = barcode;
        this.productName = productName;
        this.reason = reason;
        this.rawData = rawData;
    }

    public int getRowNumber() {
        return rowNumber;
    }

    public void setRowNumber(int rowNumber) {
        this.rowNumber = rowNumber;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Map<String, String> getRawData() {
        return rawData;
    }

    public void setRawData(Map<String, String> rawData) {
        this.rawData = rawData;
    }
}
