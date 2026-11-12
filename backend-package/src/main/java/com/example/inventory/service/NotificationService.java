package com.example.inventory.service;

import com.example.inventory.dto.AlertQueueItem;
import com.example.inventory.entity.AlertRecipientConfig;
import com.example.inventory.entity.Product;
import com.example.inventory.entity.StockAlert;
import com.example.inventory.event.LowStockEvent;
import com.example.inventory.repository.AlertRecipientConfigRepository;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.repository.StockAlertRepository;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final StockAlertRepository alertRepository;
    private final AlertQueueSqliteManager sqliteQueue;
    private final AlertRecipientConfigRepository recipientConfigRepository;
    private final ProductRepository productRepository;
    private JavaMailSender mailSender;
    private TemplateEngine templateEngine;

    private String mailHost;
    private int mailPort;
    private String mailUsername;
    private String mailPassword;
    private String defaultRecipientEmail;
    private String managerEmail;
    private String senderEmail;
    private volatile boolean simulatedOffline = false;
    private volatile Boolean simulatedOnlineState = null;

    @Autowired
    public NotificationService(
            StockAlertRepository alertRepository,
            AlertQueueSqliteManager sqliteQueue,
            @Autowired(required = false) AlertRecipientConfigRepository recipientConfigRepository,
            @Autowired(required = false) ProductRepository productRepository,
            @Autowired(required = false) TemplateEngine templateEngine,
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${spring.mail.host:${MAIL_HOST:}}") String host,
            @Value("${spring.mail.port:${MAIL_PORT:587}}") int port,
            @Value("${spring.mail.username:${MAIL_USERNAME:}}") String username,
            @Value("${spring.mail.password:${MAIL_PASSWORD:}}") String password,
            @Value("${inventory.alert.email:${ALERT_RECIPIENT_EMAIL:inventory-admin@example.com}}") String recipientEmail,
            @Value("${inventory.alert.manager.email:${ALERT_MANAGER_EMAIL:store-manager@example.com}}") String managerEmail) {

        this.alertRepository = alertRepository;
        this.sqliteQueue = sqliteQueue;
        this.recipientConfigRepository = recipientConfigRepository;
        this.productRepository = productRepository;
        this.templateEngine = templateEngine;
        this.mailHost = host;
        this.mailPort = port > 0 ? port : 587;
        this.mailUsername = username;
        this.mailPassword = password;
        this.defaultRecipientEmail = recipientEmail;
        this.managerEmail = managerEmail;
        this.senderEmail = (username != null && !username.isBlank()) ? username : "noreply@hybrid-inventory.com";

        if (mailSender != null) {
            this.mailSender = mailSender;
        } else {
            this.mailSender = new JavaMailSenderImpl();
            applyMailConfig();
        }
        ensureTemplateEngine();
    }

    // Overloaded constructor for unit testing
    public NotificationService(
            StockAlertRepository alertRepository,
            AlertQueueSqliteManager sqliteQueue,
            String host,
            int port,
            String username,
            String password,
            String recipientEmail) {
        this(alertRepository, sqliteQueue, null, null, null, null, host, port, username, password, recipientEmail, "manager@example.com");
    }

    // Overloaded constructor for unit testing with custom JavaMailSender and repos
    public NotificationService(
            StockAlertRepository alertRepository,
            AlertQueueSqliteManager sqliteQueue,
            AlertRecipientConfigRepository recipientConfigRepository,
            ProductRepository productRepository,
            JavaMailSender mailSender,
            String host,
            int port,
            String username,
            String password,
            String recipientEmail,
            String managerEmail) {
        this(alertRepository, sqliteQueue, recipientConfigRepository, productRepository, null, mailSender, host, port, username, password, recipientEmail, managerEmail);
    }

    @PostConstruct
    public void initDefaultRecipientConfigs() {
        if (recipientConfigRepository != null) {
            try {
                if (recipientConfigRepository.count() == 0) {
                    AlertRecipientConfig globalDefault = new AlertRecipientConfig(
                            "GLOBAL",
                            "DEFAULT",
                            managerEmail != null ? managerEmail : "store-manager@example.com",
                            defaultRecipientEmail != null ? defaultRecipientEmail : "inventory-admin@example.com",
                            "Default Global Store Manager & Admin Notification Emails"
                    );
                    recipientConfigRepository.save(globalDefault);
                    log.info("Initialized default global recipient configuration in DB.");
                }
            } catch (Exception e) {
                log.warn("Could not initialize recipient configs: {}", e.getMessage());
            }
        }
    }

    private void ensureTemplateEngine() {
        if (this.templateEngine == null) {
            try {
                ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
                resolver.setPrefix("templates/");
                resolver.setSuffix(".html");
                resolver.setTemplateMode(TemplateMode.HTML);
                resolver.setCharacterEncoding("UTF-8");
                resolver.setCacheable(true);

                SpringTemplateEngine engine = new SpringTemplateEngine();
                engine.setTemplateResolver(resolver);
                this.templateEngine = engine;
            } catch (Throwable t) {
                log.warn("Could not initialize SpringTemplateEngine: {}. Inline HTML fallback will be used.", t.getMessage());
            }
        }
    }

    public void setTemplateEngine(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    public JavaMailSender getMailSender() {
        return mailSender;
    }

    public void setMailSender(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean isSmtpConfigured() {
        if (mailSender != null && !(mailSender instanceof JavaMailSenderImpl)) {
            return true;
        }
        return mailHost != null && !mailHost.trim().isEmpty();
    }

    private synchronized void applyMailConfig() {
        if (mailSender instanceof JavaMailSenderImpl javaMailSenderImpl) {
            if (mailHost != null && !mailHost.trim().isEmpty()) {
                javaMailSenderImpl.setHost(mailHost.trim());
                javaMailSenderImpl.setPort(mailPort > 0 ? mailPort : 587);
                if (mailUsername != null && !mailUsername.isBlank()) {
                    javaMailSenderImpl.setUsername(mailUsername.trim());
                }
                if (mailPassword != null && !mailPassword.isBlank()) {
                    javaMailSenderImpl.setPassword(mailPassword.trim());
                }

                Properties props = javaMailSenderImpl.getJavaMailProperties();
                props.put("mail.transport.protocol", "smtp");
                props.put("mail.smtp.auth", String.valueOf(mailUsername != null && !mailUsername.isBlank()));
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "false");
                props.put("mail.smtp.connectiontimeout", "5000");
                props.put("mail.smtp.timeout", "5000");
                props.put("mail.smtp.writetimeout", "5000");
            }
        }
    }

    public synchronized void updateSmtpConfig(String host, int port, String username, String password, String recipientEmail) {
        if (host != null && !host.isBlank()) this.mailHost = host.trim();
        if (port > 0) this.mailPort = port;
        if (username != null) {
            this.mailUsername = username.trim();
            this.senderEmail = username.trim();
        }
        if (password != null) this.mailPassword = password.trim();
        if (recipientEmail != null && !recipientEmail.isBlank()) this.defaultRecipientEmail = recipientEmail.trim();

        applyMailConfig();
        log.info("SMTP configuration updated: host={}, port={}, user={}, recipient={}",
                mailHost, mailPort, mailUsername, defaultRecipientEmail);
    }

    public boolean isOnline() {
        if (simulatedOffline) {
            return false;
        }
        if (simulatedOnlineState != null) {
            return simulatedOnlineState;
        }

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("8.8.8.8", 53), 1500);
            return true;
        } catch (Exception e1) {
            try (Socket socket2 = new Socket()) {
                socket2.connect(new InetSocketAddress("1.1.1.1", 53), 1500);
                return true;
            } catch (Exception e2) {
                if (mailHost != null && !mailHost.isBlank()) {
                    try (Socket socket3 = new Socket()) {
                        socket3.connect(new InetSocketAddress(mailHost, mailPort > 0 ? mailPort : 587), 2000);
                        return true;
                    } catch (Exception e3) {
                        return false;
                    }
                }
                return false;
            }
        }
    }

    public void setSimulatedOffline(boolean offline) {
        this.simulatedOffline = offline;
        if (offline) {
            this.simulatedOnlineState = false;
        }
        log.info("Simulated offline mode set to: {}", offline);
    }

    public void setSimulatedOnline(boolean online) {
        this.simulatedOnlineState = online;
        this.simulatedOffline = !online;
        log.info("Simulated online mode set to: {}", online);
    }

    public boolean isSimulatedOffline() {
        return simulatedOffline;
    }

    /**
     * Resolves manager and admin email recipients stored in DB per product, per category, or globally.
     */
    public Set<String> resolveRecipients(Long productId, String category, Product product) {
        Set<String> recipients = new LinkedHashSet<>();

        // 1. Check per-product recipient configuration in DB
        if (recipientConfigRepository != null && productId != null) {
            recipientConfigRepository.findByTypeAndTarget("PRODUCT", String.valueOf(productId))
                    .ifPresent(cfg -> addConfigEmails(recipients, cfg));
        }

        // 2. Check direct product manager/admin email fields
        if (product != null) {
            if (product.getManagerEmail() != null && !product.getManagerEmail().isBlank()) {
                recipients.add(product.getManagerEmail().trim());
            }
            if (product.getAdminEmail() != null && !product.getAdminEmail().isBlank()) {
                recipients.add(product.getAdminEmail().trim());
            }
        }

        // 3. Check per-category recipient configuration in DB
        if (recipientConfigRepository != null && category != null && !category.isBlank()) {
            recipientConfigRepository.findByTypeAndTarget("CATEGORY", category.trim().toUpperCase())
                    .ifPresent(cfg -> addConfigEmails(recipients, cfg));
        }

        // 4. Check global recipient configuration in DB
        if (recipientConfigRepository != null) {
            recipientConfigRepository.findByTypeAndTarget("GLOBAL", "DEFAULT")
                    .ifPresent(cfg -> addConfigEmails(recipients, cfg));
        }

        // 5. Fallback configured emails
        if (recipients.isEmpty()) {
            if (managerEmail != null && !managerEmail.isBlank()) {
                recipients.add(managerEmail.trim());
            }
            if (defaultRecipientEmail != null && !defaultRecipientEmail.isBlank()) {
                recipients.add(defaultRecipientEmail.trim());
            }
        }

        return recipients;
    }

    private void addConfigEmails(Set<String> set, AlertRecipientConfig cfg) {
        if (cfg.getManagerEmail() != null && !cfg.getManagerEmail().isBlank()) {
            set.add(cfg.getManagerEmail().trim());
        }
        if (cfg.getAdminEmail() != null && !cfg.getAdminEmail().isBlank()) {
            set.add(cfg.getAdminEmail().trim());
        }
        if (cfg.getExtraEmails() != null && !cfg.getExtraEmails().isBlank()) {
            for (String email : cfg.getExtraEmails().split("[,;]")) {
                if (!email.trim().isBlank()) {
                    set.add(email.trim());
                }
            }
        }
    }

    /**
     * Core handler for LowStockEvent:
     * - Saves alert in DB as PENDING first.
     * - Tries to send email via JavaMailSender using Thymeleaf HTML template.
     * - On success marks SENT.
     * - If offline or SMTP fails, leaves alert as PENDING with next retry and error info.
     */
    @Transactional
    public StockAlert handleLowStockEvent(LowStockEvent event) {
        if (event == null || event.getProductId() == null) {
            return null;
        }

        Product product = null;
        if (productRepository != null) {
            product = productRepository.findById(event.getProductId()).orElse(null);
        }

        Set<String> recipients = resolveRecipients(event.getProductId(), event.getCategory(), product);
        String recipientString = String.join(", ", recipients);

        // 1. ALWAYS save the alert as PENDING first
        StockAlert alert = new StockAlert();
        alert.setProductId(event.getProductId());
        alert.setProductName(event.getProductName());
        alert.setSku(event.getSku());
        alert.setStockAtAlert(event.getCurrentStock());
        alert.setCurrentStock(event.getCurrentStock());
        alert.setMinimumStockLevel(event.getMinimumStockLevel());
        alert.setRecommendedReorderQuantity(event.getRecommendedReorderQuantity());
        alert.setStatus("PENDING");
        alert.setRetryCount(0);
        alert.setCreatedAt(LocalDateTime.now());
        alert.setAlertDate(alert.getCreatedAt());
        alert.setRecipientEmail(recipientString);
        alert.setCritical(event.isCritical());
        alert.setMessage(event.isCritical()
                ? String.format("CRITICAL STOCKOUT: '%s' (SKU: %s) has reached 0 units. Suggested reorder: %d.",
                event.getProductName(), event.getSku(), event.getRecommendedReorderQuantity())
                : String.format("Low stock warning: '%s' (SKU: %s) at %d units (Min: %d). Suggested reorder: %d.",
                event.getProductName(), event.getSku(), event.getCurrentStock(), event.getMinimumStockLevel(), event.getRecommendedReorderQuantity()));

        StockAlert savedAlert = alertRepository.save(alert);

        // Maintain SQLite queue record for unified offline caching
        sqliteQueue.enqueueAlert(
                event.getProductId(),
                event.getProductName(),
                event.getSku(),
                event.getCurrentStock(),
                event.getMinimumStockLevel(),
                event.getRecommendedReorderQuantity(),
                recipientString,
                savedAlert.getMessage()
        );

        // 2. Try to send immediately if online and configured
        boolean online = isOnline();
        boolean smtpReady = isSmtpConfigured();

        if (online && smtpReady) {
            try {
                sendHtmlEmail(
                        event.getProductName(),
                        event.getSku(),
                        event.getCategory(),
                        event.getSupplier(),
                        event.getCurrentStock(),
                        event.getMinimumStockLevel(),
                        event.getRecommendedReorderQuantity(),
                        event.isCritical(),
                        event.getTriggerReason(),
                        event.getTimestamp(),
                        recipients
                );

                // On success mark SENT
                savedAlert.setStatus("SENT");
                savedAlert.setSentAt(LocalDateTime.now());
                savedAlert.setLastError(null);
                savedAlert = alertRepository.save(savedAlert);
                sqliteQueue.markSentByProductId(event.getProductId());

                log.info("Email alert successfully SENT for product '{}' (SKU: {}).", event.getProductName(), event.getSku());
            } catch (Exception ex) {
                log.warn("Immediate SMTP send failed for alert #{}: {}. Leaving status as PENDING.", savedAlert.getId(), ex.getMessage());
                savedAlert.setLastError(ex.getMessage());
                savedAlert.setNextRetryAt(LocalDateTime.now().plusMinutes(5));
                savedAlert = alertRepository.save(savedAlert);
            }
        } else {
            String reason = !online ? "Network Offline" : "SMTP host not configured";
            log.info("System is {}. Alert #{} saved as PENDING for scheduled retry.", reason, savedAlert.getId());
            savedAlert.setLastError(reason);
            savedAlert.setNextRetryAt(LocalDateTime.now().plusMinutes(5));
            savedAlert = alertRepository.save(savedAlert);
        }

        return savedAlert;
    }

    /**
     * Legacy method for backward compatibility and manual triggers:
     */
    @Transactional
    public StockAlert checkAndCreateLowStockAlert(Product product) {
        if (product == null || product.getQuantity() == null || product.getMinimumStockLevel() == null) {
            return null;
        }

        int currentStock = product.getQuantity();
        int minStock = product.getMinimumStockLevel();

        if (currentStock <= minStock) {
            String sku = (product.getBarcode() != null && !product.getBarcode().isBlank())
                    ? product.getBarcode()
                    : "SKU-" + product.getId();
            int recommendedReorder = Math.max(minStock * 2 - currentStock, minStock);
            boolean critical = (currentStock <= 0);

            LowStockEvent event = new LowStockEvent(
                    product.getId(),
                    product.getProductName(),
                    sku,
                    product.getCategory(),
                    product.getSupplier(),
                    currentStock,
                    minStock,
                    recommendedReorder,
                    critical,
                    "MANUAL_OR_LEGACY_CHECK",
                    LocalDateTime.now()
            );

            return handleLowStockEvent(event);
        }

        return null;
    }

    /**
     * Dispatches HTML email using Thymeleaf template and JavaMailSender.
     */
    public void sendHtmlEmail(
            String productName,
            String sku,
            String category,
            String supplier,
            int currentStock,
            int minimumLevel,
            int suggestedReorder,
            boolean isCritical,
            String triggerReason,
            LocalDateTime timestamp,
            Set<String> recipients) throws Exception {

        ensureTemplateEngine();

        Context context = new Context();
        context.setVariable("productName", productName);
        context.setVariable("sku", sku);
        context.setVariable("category", category != null ? category : "General");
        context.setVariable("supplier", supplier != null && !supplier.isBlank() ? supplier : "Standard Supplier");
        context.setVariable("currentStock", currentStock);
        context.setVariable("minimumLevel", minimumLevel);
        context.setVariable("suggestedReorder", suggestedReorder);
        context.setVariable("isCritical", isCritical);
        context.setVariable("triggerReason", triggerReason != null ? triggerReason : "Stock Update");
        context.setVariable("timestamp", (timestamp != null ? timestamp : LocalDateTime.now())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        String htmlBody;
        try {
            if (templateEngine != null) {
                htmlBody = templateEngine.process("email/low-stock-alert", context);
            } else {
                htmlBody = buildFallbackHtml(productName, sku, currentStock, minimumLevel, suggestedReorder, supplier, isCritical, timestamp);
            }
        } catch (Throwable ex) {
            log.warn("Thymeleaf template rendering failed ({}). Generating inline HTML fallback...", ex.getMessage());
            htmlBody = buildFallbackHtml(productName, sku, currentStock, minimumLevel, suggestedReorder, supplier, isCritical, timestamp);
        }

        String subject = (isCritical ? "🚨 [CRITICAL OUT OF STOCK] " : "⚠️ [LOW STOCK ALERT] ")
                + productName + " (SKU: " + sku + ")";

        String[] toAddresses = (recipients != null && !recipients.isEmpty())
                ? recipients.toArray(new String[0])
                : new String[]{defaultRecipientEmail != null ? defaultRecipientEmail : "inventory-admin@example.com"};

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
        helper.setFrom(senderEmail != null && !senderEmail.isBlank() ? senderEmail : "alerts@hybrid-inventory.com");
        helper.setTo(toAddresses);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);

        mailSender.send(mimeMessage);
    }

    private String buildFallbackHtml(
            String productName, String sku, int currentStock, int minimumLevel, int suggestedReorder,
            String supplier, boolean isCritical, LocalDateTime timestamp) {
        return String.format(
                "<div style='font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;'>" +
                        "<h2 style='color: %s;'>%s</h2>" +
                        "<p><strong>Product:</strong> %s (SKU: %s)</p>" +
                        "<p><strong>Current Stock:</strong> %d units (Min Threshold: %d)</p>" +
                        "<p><strong>Suggested Reorder:</strong> %d units</p>" +
                        "<p><strong>Supplier:</strong> %s</p>" +
                        "<p><strong>Timestamp:</strong> %s</p>" +
                        "</div>",
                isCritical ? "#ef4444" : "#f59e0b",
                isCritical ? "CRITICAL OUT OF STOCK ALERT" : "LOW STOCK WARNING",
                productName, sku, currentStock, minimumLevel, suggestedReorder,
                supplier != null ? supplier : "N/A",
                timestamp != null ? timestamp.toString() : LocalDateTime.now().toString()
        );
    }

    /**
     * @Scheduled retry job every 5 minutes for PENDING alerts, max 5 retries, then FAILED, with exponential backoff.
     */
    @Scheduled(fixedDelayString = "${inventory.alert.retry.interval-ms:300000}", initialDelay = 15000)
    public void retryPendingAlerts() {
        if (!isOnline()) {
            log.debug("Retry job: System is offline. Pending alerts remain in queue.");
            return;
        }

        if (!isSmtpConfigured()) {
            log.debug("Retry job: SMTP host not yet configured.");
            return;
        }

        List<StockAlert> pending = alertRepository.findByStatus("PENDING");
        if (pending.isEmpty()) {
            return;
        }

        log.info("Processing {} PENDING alert(s) in scheduled retry job...", pending.size());
        LocalDateTime now = LocalDateTime.now();

        for (StockAlert alert : pending) {
            // Check exponential backoff nextRetryAt
            if (alert.getNextRetryAt() != null && now.isBefore(alert.getNextRetryAt())) {
                log.debug("Alert #{} next retry time not reached yet (scheduled for: {}).", alert.getId(), alert.getNextRetryAt());
                continue;
            }

            int currentRetry = alert.getRetryCount() + 1;
            alert.setRetryCount(currentRetry);

            if (currentRetry > 5) {
                alert.setStatus("FAILED");
                alert.setLastError("Exceeded maximum retries (5). Final error: " + alert.getLastError());
                alertRepository.save(alert);
                log.warn("Alert #{} exceeded max 5 retries. Status marked as FAILED.", alert.getId());
                continue;
            }

            try {
                Set<String> recipients = parseRecipientString(alert.getRecipientEmail());

                String sku = alert.getSku() != null ? alert.getSku() : "SKU-" + alert.getProductId();
                int minLevel = alert.getMinimumStockLevel() != null ? alert.getMinimumStockLevel() : 0;
                int currentStock = alert.getStockAtAlert();
                int reorder = alert.getRecommendedReorderQuantity() != null ? alert.getRecommendedReorderQuantity() :
                        Math.max(minLevel * 2 - currentStock, minLevel);

                sendHtmlEmail(
                        alert.getProductName(),
                        sku,
                        "Inventory",
                        "Primary Supplier",
                        currentStock,
                        minLevel,
                        reorder,
                        alert.isCritical(),
                        "SCHEDULED_RETRY",
                        alert.getCreatedAt(),
                        recipients
                );

                alert.setStatus("SENT");
                alert.setSentAt(LocalDateTime.now());
                alert.setLastError(null);
                alertRepository.save(alert);
                sqliteQueue.markSentByProductId(alert.getProductId());

                log.info("Scheduled retry for alert #{} succeeded on attempt #{}. Status marked SENT.", alert.getId(), currentRetry);

            } catch (Exception ex) {
                log.warn("Scheduled retry attempt #{} failed for alert #{}: {}", currentRetry, alert.getId(), ex.getMessage());
                alert.setLastError(ex.getMessage());
                if (currentRetry >= 5) {
                    alert.setStatus("FAILED");
                } else {
                    // Exponential backoff: 5 minutes * 2^(retryCount - 1)
                    // Retry 1: 5m, Retry 2: 10m, Retry 3: 20m, Retry 4: 40m
                    long backoffMinutes = 5L * (1L << (currentRetry - 1));
                    alert.setNextRetryAt(LocalDateTime.now().plusMinutes(backoffMinutes));
                }
                alertRepository.save(alert);
            }
        }
    }

    private Set<String> parseRecipientString(String str) {
        Set<String> set = new LinkedHashSet<>();
        if (str != null && !str.isBlank()) {
            for (String s : str.split("[,;]")) {
                if (!s.trim().isBlank()) {
                    set.add(s.trim());
                }
            }
        }
        if (set.isEmpty()) {
            set.add(defaultRecipientEmail != null ? defaultRecipientEmail : "inventory-admin@example.com");
        }
        return set;
    }

    /**
     * Manual flush method to trigger immediate dispatch of all pending alerts from the SQLite queue and DB.
     */
    public Map<String, Object> processPendingAlerts() {
        boolean online = isOnline();
        List<AlertQueueItem> pendingSqlite = sqliteQueue.getPendingAlerts();
        List<StockAlert> pendingMysql = alertRepository.findByStatus("PENDING");

        int dispatched = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        if (!online) {
            return Map.of(
                    "success", false,
                    "online", false,
                    "message", "Cannot dispatch alerts: System is currently offline. Alerts remain stored in queue.",
                    "sqlitePending", pendingSqlite.size(),
                    "mysqlPending", pendingMysql.size(),
                    "dispatched", 0
            );
        }

        if (!isSmtpConfigured()) {
            return Map.of(
                    "success", false,
                    "online", true,
                    "message", "SMTP host is not configured. Please configure SMTP host and credentials in Settings.",
                    "sqlitePending", pendingSqlite.size(),
                    "mysqlPending", pendingMysql.size(),
                    "dispatched", 0
            );
        }

        for (StockAlert alert : pendingMysql) {
            try {
                Set<String> recipients = parseRecipientString(alert.getRecipientEmail());
                String sku = alert.getSku() != null ? alert.getSku() : "SKU-" + alert.getProductId();
                int minLevel = alert.getMinimumStockLevel() != null ? alert.getMinimumStockLevel() : 0;
                int currentStock = alert.getStockAtAlert();
                int reorder = alert.getRecommendedReorderQuantity() != null ? alert.getRecommendedReorderQuantity() :
                        Math.max(minLevel * 2 - currentStock, minLevel);

                sendHtmlEmail(
                        alert.getProductName(),
                        sku,
                        "Inventory",
                        "Primary Supplier",
                        currentStock,
                        minLevel,
                        reorder,
                        alert.isCritical(),
                        "MANUAL_FLUSH",
                        alert.getCreatedAt(),
                        recipients
                );

                alert.setStatus("SENT");
                alert.setSentAt(LocalDateTime.now());
                alert.setLastError(null);
                alertRepository.save(alert);
                sqliteQueue.markSentByProductId(alert.getProductId());
                dispatched++;
            } catch (Exception ex) {
                failed++;
                errors.add(alert.getProductName() + ": " + ex.getMessage());
                alert.setLastError("Manual flush failed: " + ex.getMessage());
                alertRepository.save(alert);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("online", true);
        result.put("dispatched", dispatched);
        result.put("failed", failed);
        result.put("remainingPending", alertRepository.countByStatus("PENDING"));
        result.put("message", String.format("Processed pending alerts: %d sent, %d still pending.", dispatched, alertRepository.countByStatus("PENDING")));
        result.put("errors", errors);
        result.put("timestamp", LocalDateTime.now());
        return result;
    }

    /**
     * Sends an immediate test email to verify SMTP server connectivity.
     */
    public Map<String, Object> sendTestEmail(String recipient) {
        String target = (recipient != null && !recipient.isBlank()) ? recipient.trim() : defaultRecipientEmail;
        if (!isSmtpConfigured()) {
            return Map.of(
                    "success", false,
                    "message", "SMTP host is not configured. Please enter SMTP host and credentials in settings."
            );
        }

        try {
            ensureTemplateEngine();
            Set<String> recipients = Collections.singleton(target);
            sendHtmlEmail(
                    "Sample Product - Basmati Rice 5kg",
                    "SKU-DEMO-001",
                    "Grains",
                    "Agro Mills Ltd.",
                    2,
                    10,
                    18,
                    false,
                    "SMTP_TEST_VERIFICATION",
                    LocalDateTime.now(),
                    recipients
            );

            return Map.of(
                    "success", true,
                    "message", "Test email successfully delivered via JavaMailSender to " + target + "!"
            );
        } catch (Exception ex) {
            log.error("Failed to send test email: {}", ex.getMessage());
            return Map.of(
                    "success", false,
                    "error", ex.getMessage(),
                    "message", "SMTP delivery failed: " + ex.getMessage()
            );
        }
    }

    public List<StockAlert> getAllAlerts() {
        return alertRepository.findAllByOrderByAlertDateDesc();
    }

    public List<StockAlert> getPendingAlerts() {
        return alertRepository.findByStatus("PENDING");
    }

    public List<AlertQueueItem> getSqliteAlertQueue() {
        return sqliteQueue.getAllAlerts();
    }

    public Map<String, Object> getAlertStats() {
        long total = alertRepository.count();
        long pending = alertRepository.countByStatus("PENDING");
        long sent = alertRepository.countByStatus("SENT");
        long failed = alertRepository.countByStatus("FAILED");

        int sqlitePending = sqliteQueue.countPending();
        int sqliteSent = sqliteQueue.countSent();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalAlerts", total);
        stats.put("pendingAlerts", pending);
        stats.put("sentAlerts", sent);
        stats.put("failedAlerts", failed);
        stats.put("sqlitePending", sqlitePending);
        stats.put("sqliteSent", sqliteSent);
        stats.put("isOnline", isOnline());
        stats.put("simulatedOffline", simulatedOffline);
        stats.put("smtpConfigured", isSmtpConfigured());
        stats.put("smtpHost", mailHost != null ? mailHost : "");
        stats.put("smtpPort", mailPort);
        stats.put("smtpUser", mailUsername != null ? mailUsername : "");
        stats.put("recipientEmail", defaultRecipientEmail);
        stats.put("managerEmail", managerEmail);
        return stats;
    }

    public AlertRecipientConfigRepository getRecipientConfigRepository() {
        return recipientConfigRepository;
    }
}
