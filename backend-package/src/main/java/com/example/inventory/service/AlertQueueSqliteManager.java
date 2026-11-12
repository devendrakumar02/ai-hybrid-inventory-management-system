package com.example.inventory.service;

import com.example.inventory.dto.AlertQueueItem;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class AlertQueueSqliteManager {

    private static final Logger log = LoggerFactory.getLogger(AlertQueueSqliteManager.class);
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final String dbUrl;

    public AlertQueueSqliteManager(@Value("${inventory.sqlite.db-path:alert_queue.db}") String dbPath) {
        this.dbUrl = "jdbc:sqlite:" + dbPath;
    }

    @PostConstruct
    public void initDatabase() {
        String createTableSql = """
                CREATE TABLE IF NOT EXISTS alert_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    product_name TEXT NOT NULL,
                    sku TEXT NOT NULL,
                    current_stock INTEGER NOT NULL,
                    min_threshold_stock INTEGER NOT NULL,
                    recommended_reorder_quantity INTEGER NOT NULL,
                    recipient_email TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    created_at TEXT NOT NULL,
                    sent_at TEXT,
                    retry_count INTEGER DEFAULT 0,
                    error_message TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_alert_queue_status ON alert_queue(status);
                CREATE INDEX IF NOT EXISTS idx_alert_queue_product ON alert_queue(product_id);
                """;

        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(createTableSql);
            log.info("SQLite offline alert_queue table initialized successfully at: {}", dbUrl);
        } catch (SQLException e) {
            log.error("Failed to initialize SQLite alert_queue table: {}", e.getMessage(), e);
        }
    }

    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl);
    }

    /**
     * Enqueues a low-stock alert into the SQLite alert_queue table with status = 'PENDING'.
     */
    public synchronized Long enqueueAlert(
            Long productId,
            String productName,
            String sku,
            int currentStock,
            int minThresholdStock,
            int recommendedReorderQty,
            String recipientEmail,
            String errorMessage) {

        long pid = (productId != null) ? productId : 0L;

        // Check if a PENDING alert already exists in SQLite for this product to prevent duplicate backlog spam
        if (pid > 0) {
            String checkSql = "SELECT id FROM alert_queue WHERE product_id = ? AND status = 'PENDING' LIMIT 1";
            try (Connection conn = getConnection(); PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                checkStmt.setLong(1, pid);
                ResultSet rs = checkStmt.executeQuery();
                if (rs.next()) {
                    Long existingId = rs.getLong("id");
                    log.info("SQLite: Existing PENDING alert #{} already queued for product '{}' (SKU: {}).",
                            existingId, productName, sku);
                    return existingId;
                }
            } catch (SQLException e) {
                log.warn("SQLite: Check existing pending failed: {}", e.getMessage());
            }
        }

        String insertSql = """
                INSERT INTO alert_queue (
                    product_id, product_name, sku, current_stock, min_threshold_stock,
                    recommended_reorder_quantity, recipient_email, status, created_at, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
                """;

        String nowStr = LocalDateTime.now().format(ISO_FORMATTER);

        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setLong(1, pid);
            stmt.setString(2, productName);
            stmt.setString(3, sku != null ? sku : "UNKNOWN");
            stmt.setInt(4, currentStock);
            stmt.setInt(5, minThresholdStock);
            stmt.setInt(6, recommendedReorderQty);
            stmt.setString(7, recipientEmail);
            stmt.setString(8, nowStr);
            stmt.setString(9, errorMessage);

            stmt.executeUpdate();
            ResultSet generatedKeys = stmt.getGeneratedKeys();
            if (generatedKeys.next()) {
                long queueId = generatedKeys.getLong(1);
                log.info("SQLite: Queued low-stock notification in 'alert_queue' (ID: #{}, Product: '{}', SKU: {}, Stock: {}/{}, Status: PENDING)",
                        queueId, productName, sku, currentStock, minThresholdStock);
                return queueId;
            }
        } catch (SQLException e) {
            log.error("Failed to enqueue alert into SQLite alert_queue: {}", e.getMessage(), e);
        }
        return null;
    }

    /**
     * Retrieves all pending alerts from the SQLite queue.
     */
    public synchronized List<AlertQueueItem> getPendingAlerts() {
        String sql = "SELECT * FROM alert_queue WHERE status = 'PENDING' ORDER BY id ASC";
        return queryAlerts(sql);
    }

    /**
     * Retrieves all alerts from the SQLite queue.
     */
    public synchronized List<AlertQueueItem> getAllAlerts() {
        String sql = "SELECT * FROM alert_queue ORDER BY id DESC";
        return queryAlerts(sql);
    }

    /**
     * Marks an alert in SQLite as SENT.
     */
    public synchronized void markSent(Long id) {
        String sql = "UPDATE alert_queue SET status = 'SENT', sent_at = ?, error_message = NULL WHERE id = ?";
        String nowStr = LocalDateTime.now().format(ISO_FORMATTER);

        try (Connection conn = getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, nowStr);
            stmt.setLong(2, id);
            stmt.executeUpdate();
            log.info("SQLite: Alert #{} marked as SENT.", id);
        } catch (SQLException e) {
            log.error("Failed to mark SQLite alert #{} as SENT: {}", id, e.getMessage());
        }
    }

    /**
     * Marks all pending alerts in SQLite for a product as SENT.
     */
    public synchronized void markSentByProductId(Long productId) {
        if (productId == null) return;
        String sql = "UPDATE alert_queue SET status = 'SENT', sent_at = ?, error_message = NULL WHERE product_id = ? AND status = 'PENDING'";
        String nowStr = LocalDateTime.now().format(ISO_FORMATTER);

        try (Connection conn = getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, nowStr);
            stmt.setLong(2, productId);
            stmt.executeUpdate();
            log.info("SQLite: Pending alerts for product #{} marked as SENT.", productId);
        } catch (SQLException e) {
            log.error("Failed to mark SQLite alerts for product #{} as SENT: {}", productId, e.getMessage());
        }
    }

    /**
     * Records a transmission failure and increments retry count.
     */
    public synchronized void recordFailure(Long id, String errorMessage) {
        String sql = "UPDATE alert_queue SET retry_count = retry_count + 1, error_message = ? WHERE id = ?";

        try (Connection conn = getConnection(); PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, errorMessage);
            stmt.setLong(2, id);
            stmt.executeUpdate();
            log.warn("SQLite: Alert #{} transmission failure recorded. Error: {}", id, errorMessage);
        } catch (SQLException e) {
            log.error("Failed to update SQLite alert #{} failure: {}", id, e.getMessage());
        }
    }

    public synchronized int countPending() {
        String sql = "SELECT COUNT(*) FROM alert_queue WHERE status = 'PENDING'";
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) {
            log.warn("SQLite: countPending error: {}", e.getMessage());
        }
        return 0;
    }

    public synchronized int countSent() {
        String sql = "SELECT COUNT(*) FROM alert_queue WHERE status = 'SENT'";
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) {
            log.warn("SQLite: countSent error: {}", e.getMessage());
        }
        return 0;
    }

    private List<AlertQueueItem> queryAlerts(String sql) {
        List<AlertQueueItem> list = new ArrayList<>();
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                LocalDateTime createdAt = parseDateTime(rs.getString("created_at"));
                LocalDateTime sentAt = parseDateTime(rs.getString("sent_at"));

                list.add(new AlertQueueItem(
                        rs.getLong("id"),
                        rs.getLong("product_id"),
                        rs.getString("product_name"),
                        rs.getString("sku"),
                        rs.getInt("current_stock"),
                        rs.getInt("min_threshold_stock"),
                        rs.getInt("recommended_reorder_quantity"),
                        rs.getString("recipient_email"),
                        rs.getString("status"),
                        createdAt,
                        sentAt,
                        rs.getInt("retry_count"),
                        rs.getString("error_message")
                ));
            }
        } catch (SQLException e) {
            log.error("Failed to query SQLite alert_queue: {}", e.getMessage(), e);
        }
        return list;
    }

    private LocalDateTime parseDateTime(String text) {
        if (text == null || text.isBlank()) return null;
        try {
            return LocalDateTime.parse(text, ISO_FORMATTER);
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(text);
            } catch (Exception ignored) {
                return null;
            }
        }
    }
}
