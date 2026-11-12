package com.example.inventory.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alert_recipient_configs")
public class AlertRecipientConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // "GLOBAL", "CATEGORY", "PRODUCT"
    @Column(nullable = false, length = 30)
    private String type = "GLOBAL";

    // Target identifier: Category name (e.g. "BEVERAGES"), Product ID (e.g. "12"), or "DEFAULT"
    @Column(nullable = false, length = 100)
    private String target = "DEFAULT";

    @Column(name = "manager_email")
    private String managerEmail;

    @Column(name = "admin_email")
    private String adminEmail;

    @Column(name = "extra_emails", length = 500)
    private String extraEmails;

    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public AlertRecipientConfig() {
    }

    public AlertRecipientConfig(String type, String target, String managerEmail, String adminEmail, String description) {
        this.type = type != null ? type.toUpperCase() : "GLOBAL";
        this.target = target != null ? target.toUpperCase() : "DEFAULT";
        this.managerEmail = managerEmail;
        this.adminEmail = adminEmail;
        this.description = description;
    }

    @PrePersist
    void init() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (type != null) type = type.toUpperCase();
        if (target != null) target = target.toUpperCase();
    }

    @PreUpdate
    void update() {
        updatedAt = LocalDateTime.now();
        if (type != null) type = type.toUpperCase();
        if (target != null) target = target.toUpperCase();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type != null ? type.toUpperCase() : "GLOBAL";
    }

    public String getTarget() {
        return target;
    }

    public void setTarget(String target) {
        this.target = target != null ? target.toUpperCase() : "DEFAULT";
    }

    public String getManagerEmail() {
        return managerEmail;
    }

    public void setManagerEmail(String managerEmail) {
        this.managerEmail = managerEmail;
    }

    public String getAdminEmail() {
        return adminEmail;
    }

    public void setAdminEmail(String adminEmail) {
        this.adminEmail = adminEmail;
    }

    public String getExtraEmails() {
        return extraEmails;
    }

    public void setExtraEmails(String extraEmails) {
        this.extraEmails = extraEmails;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
