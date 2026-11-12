package com.example.inventory.dto;

import java.util.List;

/**
 * Result summary returned after batch import execution.
 */
public class ProductImportResultResponse {
    private int insertedCount;
    private int updatedCount;
    private int skippedCount;
    private int failedCount;
    private List<SkippedRowInfo> skippedDetails;
    private String message;

    public ProductImportResultResponse() {
    }

    public int getInsertedCount() {
        return insertedCount;
    }

    public void setInsertedCount(int insertedCount) {
        this.insertedCount = insertedCount;
    }

    public int getUpdatedCount() {
        return updatedCount;
    }

    public void setUpdatedCount(int updatedCount) {
        this.updatedCount = updatedCount;
    }

    public int getSkippedCount() {
        return skippedCount;
    }

    public void setSkippedCount(int skippedCount) {
        this.skippedCount = skippedCount;
    }

    public int getFailedCount() {
        return failedCount;
    }

    public void setFailedCount(int failedCount) {
        this.failedCount = failedCount;
    }

    public List<SkippedRowInfo> getSkippedDetails() {
        return skippedDetails;
    }

    public void setSkippedDetails(List<SkippedRowInfo> skippedDetails) {
        this.skippedDetails = skippedDetails;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
