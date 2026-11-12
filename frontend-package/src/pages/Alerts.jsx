import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import Icon from "../components/Icon";
import { useConnectivity } from "../context/Connectivity";

// ==========================================
// SEARCHABLE COMBOBOX COMPONENT
// ==========================================
function SearchableProductSelect({ products, value, onChange, placeholder = "Search catalog by name, SKU, or category..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const selectedProduct = useMemo(() => {
    return products.find(p => String(p.id) === String(value));
  }, [products, value]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products.slice(0, 50);
    const q = searchTerm.toLowerCase();
    return products.filter(p =>
      (p.productName && p.productName.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.supplier && p.supplier.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [products, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (product) => {
    onChange(product.id);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", minWidth: "320px", maxWidth: "420px", width: "100%" }}>
      {/* TRIGGER BAR */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "#ffffff",
          border: isOpen ? "1px solid #7044e8" : "1px solid #cbd5e1",
          borderRadius: "8px",
          boxShadow: isOpen ? "0 0 0 3px rgba(112, 68, 232, 0.12)" : "none",
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Icon name="search" size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
          {selectedProduct ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
              <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedProduct.productName}
              </span>
              <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "4px" }}>
                {selectedProduct.barcode}
              </span>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: (selectedProduct.quantity ?? 0) <= (selectedProduct.minimumStockLevel ?? 10) ? "#e11d48" : "#0284c7"
              }}>
                ({selectedProduct.quantity ?? 0}/{selectedProduct.minimumStockLevel ?? 10})
              </span>
            </div>
          ) : (
            <span style={{ color: "#94a3b8", fontSize: "0.88rem" }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
          {selectedProduct && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                background: "none",
                border: "none",
                padding: "2px",
                cursor: "pointer",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center"
              }}
            >
              <Icon name="close" size={14} />
            </button>
          )}
          <Icon name="chevronDown" size={15} style={{ color: "#64748b", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
        </div>
      </div>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.08)",
            zIndex: 100,
            maxHeight: "320px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* SEARCH INPUT */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#ffffff", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <Icon name="search" size={14} style={{ color: "#94a3b8" }} />
              <input
                autoFocus
                type="text"
                placeholder="Type name, barcode or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  width: "100%",
                  fontSize: "0.85rem",
                  background: "transparent"
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
                >
                  <Icon name="close" size={13} />
                </button>
              )}
            </div>
          </div>

          {/* LIST ITEMS */}
          <div style={{ overflowY: "auto", flex: 1, padding: "4px" }}>
            {filteredProducts.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                No catalog items found matching "{searchTerm}"
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = String(p.id) === String(value);
                const isLow = (p.quantity ?? 0) <= (p.minimumStockLevel ?? 10);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      background: isSelected ? "#f3e8ff" : "transparent",
                      transition: "background 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.86rem", color: isSelected ? "#7044e8" : "#1e293b", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {p.productName}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <span style={{ fontSize: "0.74rem", color: "#64748b" }}>SKU: {p.barcode}</span>
                        {p.category && (
                          <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "4px" }}>
                            {p.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: isLow ? "#fee2e2" : "#e0f2fe",
                          color: isLow ? "#b91c1c" : "#0369a1",
                          display: "inline-block"
                        }}
                      >
                        {p.quantity ?? 0} / Min: {p.minimumStockLevel ?? 10}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN ALERTS DASHBOARD COMPONENT
// ==========================================
export default function Alerts() {
  const navigate = useNavigate();
  const { online, simulatedOffline, toggleOfflineMode } = useConnectivity();
  const [alerts, setAlerts] = useState([]);
  const [offlineAlerts, setOfflineAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("low_stock"); // "low_stock" | "all" | "queue"
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggeringId, setTriggeringId] = useState(null);
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  // Search & Filter state for Low Stock view
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL"); // ALL | OUT_OF_STOCK | CRITICAL | BELOW_MIN
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // SMTP Settings & Test Email Modal
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    host: "smtp.gmail.com",
    port: 587,
    username: "",
    password: "",
    recipientEmail: "inventory-admin@example.com"
  });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [alertsRes, statsRes, prodRes, queueRes] = await Promise.allSettled([
        api.get("/alerts"),
        api.get("/alerts/stats"),
        api.get("/products"),
        api.get("/alerts/sqlite-queue")
      ]);

      if (alertsRes.status === "fulfilled") {
        setAlerts(alertsRes.value.data || []);
      }
      if (queueRes.status === "fulfilled") {
        setOfflineAlerts(queueRes.value.data || []);
      }
      if (statsRes.status === "fulfilled") {
        const s = statsRes.value.data || null;
        setStats(s);
        if (s) {
          setSmtpForm((prev) => ({
            ...prev,
            host: s.smtpHost || prev.host,
            port: s.smtpPort || prev.port,
            username: s.smtpUser || prev.username,
            recipientEmail: s.recipientEmail || prev.recipientEmail
          }));
        }
      }
      if (prodRes.status === "fulfilled") {
        setProducts(prodRes.value.data || []);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load email alerts data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling background worker updates
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4500);
  };

  // Synchronized Offline Queue Count (zero mention of SQLite)
  const offlineQueueCount = offlineAlerts.length;

  // Filter low stock products: quantity <= minimumStockLevel
  const lowStockProducts = useMemo(() => {
    return products
      .filter((p) => {
        const qty = Number(p.quantity ?? 0);
        const min = Number(p.minimumStockLevel ?? 10);
        return qty <= min;
      })
      .sort((a, b) => {
        const defA = (Number(a.minimumStockLevel ?? 10)) - (Number(a.quantity ?? 0));
        const defB = (Number(b.minimumStockLevel ?? 10)) - (Number(b.quantity ?? 0));
        return defB - defA;
      });
  }, [products]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set();
    lowStockProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [lowStockProducts]);

  // Filtered low stock products by search, severity, category
  const filteredLowStock = useMemo(() => {
    return lowStockProducts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q));

      const qty = Number(p.quantity ?? 0);
      let matchesSeverity = true;
      if (severityFilter === "OUT_OF_STOCK") matchesSeverity = qty <= 0;
      else if (severityFilter === "CRITICAL") matchesSeverity = qty > 0 && qty <= 5;
      else if (severityFilter === "BELOW_MIN") matchesSeverity = qty > 5;

      const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;

      return matchesSearch && matchesSeverity && matchesCat;
    });
  }, [lowStockProducts, searchQuery, severityFilter, selectedCategory]);

  // Flush offline queue
  const handleProcessPending = async () => {
    try {
      setProcessing(true);
      const res = await api.post("/alerts/process-pending");
      showToast(res.data.message || `Processed pending alerts.`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Failed to process pending alerts: " + (err.response?.data?.message || err.message));
    } finally {
      setProcessing(false);
    }
  };

  // Manual trigger for a single product from table
  const handleTriggerProductAlert = async (product) => {
    try {
      setTriggeringId(product.id);
      const res = await api.post(`/alerts/trigger/${product.id}`);
      showToast(
        `✓ Automated alert dispatched for "${product.productName}"! Stock: ${product.quantity ?? 0}, Min: ${product.minimumStockLevel ?? 10}. Email delivered to ${smtpForm.recipientEmail}.`
      );
      await loadData();
    } catch (err) {
      console.error(err);
      setError(`Failed to send alert for "${product.productName}": ` + (err.response?.data?.message || err.message));
    } finally {
      setTriggeringId(null);
    }
  };

  // Trigger alerts for ALL low stock items
  const handleTriggerAllLowStock = async () => {
    if (lowStockProducts.length === 0) return;
    try {
      setTriggeringAll(true);
      let dispatched = 0;
      for (const p of lowStockProducts.slice(0, 10)) {
        try {
          await api.post(`/alerts/trigger/${p.id}`);
          dispatched++;
        } catch (e) {
          console.warn(`Could not dispatch alert for ${p.productName}:`, e);
        }
      }
      showToast(`✓ Dispatched automated alert emails for ${dispatched} low-stock products to ${smtpForm.recipientEmail}!`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Failed to trigger automated alerts for all low stock items.");
    } finally {
      setTriggeringAll(false);
    }
  };

  // Manual trigger from dropdown combobox
  const handleTriggerManualAlert = async () => {
    if (!selectedProduct) return;
    try {
      setTriggering(true);
      const res = await api.post(`/alerts/trigger/${selectedProduct}`);
      showToast(`Threshold check executed for product #${selectedProduct} (Status: ${res.data.status || "PROCESSED"}). Email sent to ${smtpForm.recipientEmail}.`);
      await loadData();
      setSelectedProduct("");
    } catch (err) {
      console.error(err);
      setError("Failed to trigger alert test.");
    } finally {
      setTriggering(false);
    }
  };

  const handleToggleOfflineBackend = async () => {
    try {
      const res = await api.post("/alerts/toggle-offline");
      showToast(res.data.message);
      await toggleOfflineMode();
      await loadData();
    } catch (err) {
      await toggleOfflineMode();
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    try {
      setSmtpSaving(true);
      setTestFeedback(null);
      const res = await api.post("/alerts/smtp-config", smtpForm);
      showToast("Email Service configuration saved successfully!");
      setStats(res.data.stats);
      setTestFeedback({ type: "success", text: "Email service settings updated and applied successfully." });
    } catch (err) {
      console.error(err);
      setTestFeedback({ type: "error", text: "Failed to update email settings: " + err.message });
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setTestSending(true);
      setTestFeedback(null);
      const res = await api.post("/alerts/send-test", {
        recipientEmail: smtpForm.recipientEmail
      });
      if (res.data.success) {
        setTestFeedback({
          type: "success",
          text: res.data.message || `Test verification email delivered to ${smtpForm.recipientEmail}!`
        });
        showToast("Test email sent successfully via Email Service!");
      } else {
        setTestFeedback({
          type: "error",
          text: res.data.message || "Failed to deliver test email."
        });
      }
      await loadData();
    } catch (err) {
      console.error(err);
      setTestFeedback({
        type: "error",
        text: err.response?.data?.message || err.message || "SMTP connection failed. Check host and port."
      });
    } finally {
      setTestSending(false);
    }
  };

  const sentCount = alerts.filter((a) => (a.status || "").toUpperCase() === "SENT").length;

  // Status Badge Component
  const renderStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "SENT" || s === "DISPATCHED") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "0.78rem",
            fontWeight: 600,
            background: "#dcfce7",
            color: "#15803d",
            border: "1px solid #bbf7d0"
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
          Dispatched
        </span>
      );
    }
    if (s === "PENDING" || s === "QUEUED") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "0.78rem",
            fontWeight: 600,
            background: "#fef9c3",
            color: "#a16207",
            border: "1px solid #fde047"
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ca8a04" }} />
          Pending / Queued
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "20px",
          fontSize: "0.78rem",
          fontWeight: 600,
          background: "#fee2e2",
          color: "#b91c1c",
          border: "1px solid #fecaca"
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }} />
        Failed
      </span>
    );
  };

  const isServerOnline = stats?.isOnline ?? online;

  return (
    <section className="alerts-page">
      {/* HEADER */}
      <div className="page-heading">
        <div>
          <div className="breadcrumb">
            Intelligence <Icon name="chevronRight" size={13} /> Stock Alerts
          </div>
          <h1>Low Stock Products & Automated Email Alerts</h1>
          <p>
            Monitors real-time catalog stock levels. When any product's in-stock inventory drops to or below its minimum threshold,
            an automated HTML alert email is instantly dispatched to the Store Manager & Administrator.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="secondary-button"
            onClick={handleToggleOfflineBackend}
            style={{
              borderColor: (stats?.simulatedOffline || simulatedOffline) ? "#f59e0b" : "#cbd5e1",
              background: (stats?.simulatedOffline || simulatedOffline) ? "#fffbeb" : "#ffffff",
              color: (stats?.simulatedOffline || simulatedOffline) ? "#b45309" : "#334155"
            }}
            title="Toggle simulated offline mode"
          >
            {(stats?.simulatedOffline || simulatedOffline) ? "⚡ Simulated: Offline" : "🌐 Server: Online"}
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              setTestFeedback(null);
              setShowSmtpModal(true);
            }}
            title="Configure Email Service credentials and test delivery"
          >
            <Icon name="settings" size={15} /> Email Settings & Test
          </button>

          <button
            className="secondary-button"
            onClick={loadData}
            disabled={loading}
          >
            <Icon name="sync" size={15} /> Refresh
          </button>

          <button
            className="primary-button"
            onClick={handleProcessPending}
            disabled={processing || offlineQueueCount === 0}
            title="Synchronize pending email alerts from Offline Backup Queue"
          >
            <Icon name="mail" size={15} />
            {processing ? "Flushing Queue..." : `Flush Queue (${offlineQueueCount})`}
          </button>
        </div>
      </div>

      {/* TOAST / ERROR */}
      {toast && (
        <div className="product-toast" style={{ top: 20 }}>
          <span>✓</span> {toast}
        </div>
      )}

      {error && (
        <div className="report-error" style={{ marginBottom: 16 }}>
          <Icon name="warning" size={18} /> {error}
        </div>
      )}

      {/* QUICK MANUAL EVALUATION COMBOBOX PANEL */}
      <div className="panel" style={{ padding: "18px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.02rem" }}>Test Specific Catalog Product Threshold</h3>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              Select any catalog item to manually evaluate its stock against threshold and test the automated alert email dispatch.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <SearchableProductSelect
              products={products}
              value={selectedProduct}
              onChange={setSelectedProduct}
              placeholder="Search catalog by name, SKU or barcode..."
            />
            <button
              className="primary-button"
              disabled={!selectedProduct || triggering}
              onClick={handleTriggerManualAlert}
              style={{ whiteSpace: "nowrap" }}
            >
              <Icon name="alerts" size={15} />
              {triggering ? "Evaluating..." : "Check Threshold & Send Email"}
            </button>
          </div>
        </div>
      </div>

      {/* UNIFIED TABS & TABLES PANEL */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {/* TAB CONTROLS HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
            padding: "0 16px",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            {/* TAB 1: LOW STOCK PRODUCTS (DEFAULT) */}
            <button
              type="button"
              onClick={() => setActiveTab("low_stock")}
              style={{
                padding: "14px 18px",
                fontWeight: 600,
                fontSize: "0.88rem",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "low_stock" ? "2px solid #e11d48" : "2px solid transparent",
                color: activeTab === "low_stock" ? "#e11d48" : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s ease"
              }}
            >
              <Icon name="alerts" size={15} />
              <span>Low Stock Products</span>
              <span
                style={{
                  background: activeTab === "low_stock" ? "#fee2e2" : "#e2e8f0",
                  color: activeTab === "low_stock" ? "#dc2626" : "#475569",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}
              >
                {lowStockProducts.length}
              </span>
            </button>

            {/* TAB 2: AUDIT LOGS */}
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              style={{
                padding: "14px 18px",
                fontWeight: 600,
                fontSize: "0.88rem",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "all" ? "2px solid #7044e8" : "2px solid transparent",
                color: activeTab === "all" ? "#7044e8" : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s ease"
              }}
            >
              <Icon name="mail" size={15} />
              <span>Email Alert Logs</span>
              <span
                style={{
                  background: activeTab === "all" ? "#ede9fe" : "#e2e8f0",
                  color: activeTab === "all" ? "#7044e8" : "#475569",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}
              >
                {alerts.length}
              </span>
            </button>

            {/* TAB 3: OFFLINE BACKUP QUEUE */}
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              style={{
                padding: "14px 18px",
                fontWeight: 600,
                fontSize: "0.88rem",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "queue" ? "2px solid #7044e8" : "2px solid transparent",
                color: activeTab === "queue" ? "#7044e8" : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s ease"
              }}
            >
              <Icon name="offline" size={15} />
              <span>Offline Backup Queue</span>
              <span
                style={{
                  background: activeTab === "queue" ? "#ede9fe" : (offlineQueueCount > 0 ? "#fef3c7" : "#e2e8f0"),
                  color: activeTab === "queue" ? "#7044e8" : (offlineQueueCount > 0 ? "#b45309" : "#475569"),
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}
              >
                {offlineQueueCount}
              </span>
            </button>
          </div>

          <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", alignItems: "center", gap: 6, paddingRight: "8px" }}>
            <Icon name="sync" size={13} />
            <span>Real-time event listener active</span>
          </div>
        </div>

        {/* SUBHEADER & CONTROLS */}
        <div
          style={{
            padding: "14px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
              {activeTab === "low_stock" && `Low Stock Inventory (${filteredLowStock.length} items)`}
              {activeTab === "all" && "Live Stock Alert Audit Logs"}
              {activeTab === "queue" && "Offline Backup Queue"}
            </h2>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              {activeTab === "low_stock" && "Products where current available stock is at or below minimum threshold. Automated email alerts trigger when in-stock falls into low stock."}
              {activeTab === "all" && "Historical record of evaluated stock thresholds, automated triggers, and email dispatches to store manager."}
              {activeTab === "queue" && "Alerts recorded while disconnected or offline; pending synchronization to store manager."}
            </span>
          </div>

          {activeTab === "low_stock" && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              {/* SEARCH INPUT */}
              <div style={{ position: "relative", minWidth: 200 }}>
                <input
                  type="text"
                  placeholder="Filter low stock items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "6px 10px 6px 30px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.84rem",
                    outline: "none",
                    width: "100%"
                  }}
                />
                <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              </div>

              {/* SEVERITY FILTER */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.84rem",
                  background: "#ffffff",
                  outline: "none"
                }}
              >
                <option value="ALL">All Severities</option>
                <option value="OUT_OF_STOCK">🚨 Out of Stock (0)</option>
                <option value="CRITICAL">⚠️ Critical Low (&le; 5)</option>
                <option value="BELOW_MIN">🟡 Below Min Threshold</option>
              </select>

              {/* CATEGORY FILTER */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.84rem",
                    background: "#ffffff",
                    outline: "none"
                  }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {/* TRIGGER ALL BUTTON */}
              <button
                type="button"
                className="secondary-button"
                onClick={handleTriggerAllLowStock}
                disabled={triggeringAll || lowStockProducts.length === 0}
                style={{
                  background: "#fff1f2",
                  borderColor: "#fecdd3",
                  color: "#be123c",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
                title="Send automated email notifications for all low stock items"
              >
                <Icon name="mail" size={14} />
                {triggeringAll ? "Sending Emails..." : `Send Alert Emails for All (${lowStockProducts.length})`}
              </button>
            </div>
          )}
        </div>

        {/* TAB CONTENT: LOW STOCK PRODUCTS TABLE */}
        {activeTab === "low_stock" && (
          <div className="table-scroll">
            <table className="product-table">
              <thead>
                <tr>
                  <th>PRODUCT & SKU</th>
                  <th>AVAILABLE STOCK</th>
                  <th>MIN THRESHOLD</th>
                  <th>SHORTAGE DEFICIT</th>
                  <th>REORDER RECOMMENDATION</th>
                  <th>RECIPIENT EMAIL</th>
                  <th>AUTOMATED PIPELINE</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLowStock.map((p) => {
                  const qty = Number(p.quantity ?? 0);
                  const min = Number(p.minimumStockLevel ?? 10);
                  const deficit = Math.max(0, min - qty);
                  const reorder = Math.max(10, (min * 2) - qty);
                  const isOutOfStock = qty <= 0;
                  const isCritical = qty > 0 && qty <= 5;
                  const isBusy = triggeringId === p.id;

                  return (
                    <tr key={p.id}>
                      {/* PRODUCT & SKU */}
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>
                          {p.productName}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <code style={{ fontSize: "0.76rem", color: "#7044e8", background: "#f5f3ff", padding: "1px 6px", borderRadius: 4 }}>
                            {p.barcode || `SKU-${p.id}`}
                          </code>
                          {p.category && (
                            <span style={{ fontSize: "0.74rem", background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: 4 }}>
                              {p.category}
                            </span>
                          )}
                          {p.supplier && (
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                              {p.supplier}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* AVAILABLE STOCK */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              background: isOutOfStock ? "#fee2e2" : (isCritical ? "#ffedd5" : "#fef9c3"),
                              color: isOutOfStock ? "#991b1b" : (isCritical ? "#c2410c" : "#854d0e"),
                              border: isOutOfStock ? "1px solid #fecaca" : (isCritical ? "1px solid #fed7aa" : "1px solid #fef08a")
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: isOutOfStock ? "#dc2626" : (isCritical ? "#ea580c" : "#ca8a04")
                              }}
                            />
                            {qty} units {isOutOfStock ? "(Out of Stock)" : (isCritical ? "(Critical)" : "(Low)")}
                          </span>
                        </div>
                      </td>

                      {/* MIN THRESHOLD */}
                      <td>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {min} units
                        </span>
                        <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                          Trigger threshold
                        </div>
                      </td>

                      {/* SHORTAGE DEFICIT */}
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#dc2626",
                            background: "#fef2f2",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            display: "inline-block"
                          }}
                        >
                          -{deficit} unit{deficit !== 1 ? "s" : ""}
                        </span>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 2 }}>
                          Below safety minimum
                        </div>
                      </td>

                      {/* REORDER RECOMMENDATION */}
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#2563eb",
                            background: "#eff6ff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            display: "inline-block"
                          }}
                        >
                          +{reorder} units
                        </span>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 2 }}>
                          Optimal replenishment
                        </div>
                      </td>

                      {/* RECIPIENT EMAIL */}
                      <td>
                        <div style={{ fontSize: "0.82rem", color: "#1e293b", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon name="mail" size={13} style={{ color: "#7044e8" }} />
                          <span>{smtpForm.recipientEmail}</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>
                          Store Manager / Admin
                        </div>
                      </td>

                      {/* AUTOMATED PIPELINE STATUS */}
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: "#ecfdf5",
                            color: "#065f46",
                            border: "1px solid #a7f3d0"
                          }}
                          title="System triggers an email automatically whenever stock crosses below threshold"
                        >
                          ⚡ Auto-Trigger Active
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          {/* SEND EMAIL ALERT NOW */}
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleTriggerProductAlert(p)}
                            disabled={isBusy}
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              background: "#ffffff",
                              borderColor: "#cbd5e1",
                              color: "#334155",
                              display: "flex",
                              alignItems: "center",
                              gap: 6
                            }}
                            title="Dispatches the low-stock email alert to store manager right now"
                          >
                            <Icon name="mail" size={13} />
                            {isBusy ? "Sending..." : "Send Alert Email"}
                          </button>

                          {/* RESTOCK (NAVIGATE TO PURCHASES) */}
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => navigate("/purchases")}
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 6
                            }}
                            title="Navigate to purchase orders to restock this product"
                          >
                            <Icon name="cart" size={13} />
                            Restock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLowStock.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "48px 20px" }}>
                      <div className="empty-products">
                        <Icon name="check" size={36} style={{ color: "#16a34a" }} />
                        <b style={{ color: "#15803d", fontSize: "1.05rem" }}>
                          {searchQuery || severityFilter !== "ALL" || selectedCategory !== "ALL"
                            ? "No low stock products match your filter criteria."
                            : "All catalog products are healthy and above minimum thresholds!"}
                        </b>
                        <span style={{ color: "#64748b", marginTop: 4 }}>
                          The automated email pipeline will automatically notify the Store Manager the moment any product drops below its minimum threshold.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB CONTENT: AUDIT LOGS & OFFLINE QUEUE */}
        {(activeTab === "all" || activeTab === "queue") && (
          <div className="table-scroll">
            <table className="product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>PRODUCT & SKU</th>
                  <th>STOCK / MIN</th>
                  <th>REORDER QTY</th>
                  <th>STATUS</th>
                  <th>STORE MANAGER EMAIL</th>
                  <th>DETAILS</th>
                  <th>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === "all" ? alerts : offlineAlerts).map((item) => {
                  const isCritical = item.currentStock <= item.minimumStockLevel || item.currentStock <= item.minThresholdStock;
                  const sku = item.sku || `SKU-${item.productId}`;
                  const minThreshold = item.minimumStockLevel ?? item.minThresholdStock;
                  const reorder = item.recommendedReorderQuantity || Math.max(0, (minThreshold * 2) - item.currentStock);

                  return (
                    <tr key={item.id}>
                      <td><code>#{item.id}</code></td>
                      <td>
                        <b>{item.productName}</b>
                        <div style={{ fontSize: "0.78rem", color: "#475569" }}>
                          SKU: <code style={{ color: "#7044e8" }}>{sku}</code> (ID: {item.productId})
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: isCritical ? "#e11d48" : "#0f172a" }}>
                          {item.currentStock} units
                        </span>
                        <span className="sub-value">Threshold: {minThreshold}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "3px 8px", borderRadius: "6px" }}>
                          +{reorder} units
                        </span>
                      </td>
                      <td>
                        {renderStatusBadge(item.status)}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "#334155" }}>
                          {item.recipientEmail || smtpForm.recipientEmail}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "#64748b", maxWidth: "260px", display: "inline-block" }}>
                          {item.message || item.errorMessage || "Low stock condition detected."}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                          {item.alertDate || item.createdAt ? new Date(item.alertDate || item.createdAt).toLocaleString() : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {(activeTab === "all" ? alerts : offlineAlerts).length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "48px 20px" }}>
                      <div className="empty-products">
                        <Icon name="alerts" size={32} />
                        <b>{activeTab === "all" ? "No stock alerts recorded" : "Offline Backup Queue is empty"}</b>
                        <span>
                          {activeTab === "all"
                            ? "Alerts are automatically triggered when product stock drops below minimum threshold."
                            : "All offline alerts have been dispatched or no offline events were captured."}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EMAIL CONFIGURATION & TEST EMAIL MODAL */}
      {showSmtpModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1000 }}
          onMouseDown={(e) => e.target === e.currentTarget && setShowSmtpModal(false)}
        >
          <div className="product-modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <h2>Store Manager Email & Service Settings</h2>
                <p>Configure email service credentials to deliver live low-stock alerts to your inbox.</p>
              </div>
              <button
                type="button"
                className="modal-x"
                onClick={() => setShowSmtpModal(false)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveSmtp} style={{ padding: "20px 24px" }}>
              {testFeedback && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: "0.9rem",
                    background: testFeedback.type === "success" ? "#f0fdf4" : "#fef2f2",
                    color: testFeedback.type === "success" ? "#166534" : "#b91c1c",
                    border: testFeedback.type === "success" ? "1px solid #bbf7d0" : "1px solid #fecaca"
                  }}
                >
                  {testFeedback.type === "success" ? "✓ " : "⚠️ "} {testFeedback.text}
                </div>
              )}

              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <label style={{ gridColumn: "span 2" }}>
                  <span>Store Manager Recipient Email *</span>
                  <input
                    type="email"
                    required
                    value={smtpForm.recipientEmail}
                    onChange={(e) => setSmtpForm({ ...smtpForm, recipientEmail: e.target.value })}
                    placeholder="your-email@gmail.com"
                  />
                  <small style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>
                    Threshold alerts will be delivered directly to this email address.
                  </small>
                </label>

                <label>
                  <span>SMTP Host *</span>
                  <input
                    required
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </label>

                <label>
                  <span>SMTP Port *</span>
                  <input
                    type="number"
                    required
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })}
                    placeholder="587"
                  />
                </label>

                <label>
                  <span>Sender Email / Username *</span>
                  <input
                    value={smtpForm.username}
                    onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                    placeholder="your-email@gmail.com"
                  />
                </label>

                <label>
                  <span>Password / App Password</span>
                  <input
                    type="password"
                    value={smtpForm.password}
                    onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                    placeholder="••••••••••••"
                  />
                </label>
              </div>

              <div style={{ marginTop: 14, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: "12px", color: "#475569" }}>
                <b>💡 How to send real emails to your Gmail inbox:</b><br />
                1. Set Host: <code>smtp.gmail.com</code>, Port: <code>587</code>.<br />
                2. Enter your Gmail address in Sender Email and Store Manager Recipient.<br />
                3. Go to Google Account &rarr; Security &rarr; <b>2-Step Verification</b> &rarr; <b>App passwords</b>.<br />
                4. Generate an app password (16 letters) and paste it into the Password field.<br />
                5. Click <b>Save Settings</b>, then click <b>Send Test Email</b>!
              </div>

              <div className="modal-footer" style={{ marginTop: 20, padding: 0, border: "none" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSendTestEmail}
                  disabled={testSending || smtpSaving}
                  style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}
                >
                  <Icon name="mail" size={14} />
                  {testSending ? "Sending Test..." : "Send Test Email"}
                </button>

                <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setShowSmtpModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={smtpSaving || testSending}
                  >
                    {smtpSaving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
