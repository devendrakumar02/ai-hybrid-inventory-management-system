import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../services/api";
import Icon from "../components/Icon";
import BarcodeScanner from "../components/BarcodeScanner";
import { useConnectivity } from "../context/Connectivity";
import {
  getCachedProducts,
  cacheProducts,
  queueTransaction,
  getProductByBarcodeOffline
} from "../utils/offline";

export default function Transaction({ type = "SALE" }) {
  const location = useLocation();
  const isSale = type === "SALE";

  const {
    online,
    simulatedOffline,
    toggleOfflineMode,
    pending,
    sync,
    updatePendingCount
  } = useConnectivity();

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const searchContainerRef = useRef(null);
  const listRef = useRef(null);

  const [cart, setCart] = useState([]);

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customer, setCustomer] = useState("");
  const [supplier, setSupplier] = useState("");

  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  // ZXing scanner modal
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState("");

  // New product modal
  const [showAddProduct, setShowAddProduct] = useState(false);
  const emptyProduct = {
    barcode: "",
    productName: "",
    category: "",
    supplier: "",
    purchasePrice: "",
    sellingPrice: "",
    quantity: "",
    minimumStockLevel: ""
  };
  const [newProduct, setNewProduct] = useState(emptyProduct);

  const showMessage = (text, typeValue = "success") => {
    setMessage(text);
    setMessageType(typeValue);
    setTimeout(() => {
      setMessage("");
    }, 4500);
  };

  // ==========================================
  // LOAD PRODUCTS (ONLINE & OFFLINE LOCAL STORAGE)
  // ==========================================
  const loadProducts = async () => {
    setProductsLoading(true);

    if (!online) {
      try {
        const cached = await getCachedProducts();
        if (Array.isArray(cached) && cached.length > 0) {
          setProducts(cached);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.warn("Could not load from offline storage:", err);
      } finally {
        setProductsLoading(false);
      }
      return;
    }

    try {
      const response = await api.get("/products", { timeout: 3500 });
      if (Array.isArray(response.data)) {
        setProducts(response.data);
        await cacheProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.warn("Backend unavailable. Loading from local offline storage:", error);
      try {
        const cached = await getCachedProducts();
        setProducts(cached || []);
      } catch (e) {
        showMessage("Unable to load products from local storage.", "error");
      }
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    setCart([]);
    setSearch("");
  }, [type, online]);

  // Handle prefill from Forecast module recommendations
  useEffect(() => {
    if (location.state?.prefillProductId && products.length > 0) {
      const target = products.find(p => String(p.id) === String(location.state.prefillProductId));
      if (target) {
        const qty = Number(location.state.prefillQuantity) || 1;
        setCart([{ ...target, cartQuantity: qty }]);
        showMessage(`Prefilled ${target.productName} (${qty} units) from Forecast Reorder Recommendation`, "success");
      }
    }
  }, [products, location.state]);

  // ==========================================
  // ZXING SCANNER HANDLER
  // ==========================================
  const handleBarcodeScan = async (scannedCode) => {
    if (!scannedCode) return;
    setScanFeedback(`Detected Barcode: ${scannedCode}`);

    let found = products.find(p => String(p.barcode) === String(scannedCode));
    if (!found) {
      try {
        found = await getProductByBarcodeOffline(scannedCode);
      } catch (e) {}
    }

    if (found) {
      addToCart(found);
      setScanFeedback(`✓ Identified: ${found.productName} (Added to cart!)`);
      showMessage(`ZXing identified and added: ${found.productName}`, "success");
      setTimeout(() => setScannerOpen(false), 1200);
    } else {
      if (!isSale) {
        setNewProduct({ ...emptyProduct, barcode: scannedCode });
        setShowAddProduct(true);
        setScannerOpen(false);
        showMessage(`New barcode '${scannedCode}'. Add product details below.`, "success");
      } else {
        showMessage(`Scanned barcode '${scannedCode}' not found in catalog.`, "error");
      }
    }
  };

  // ==========================================
  // SEARCH PRODUCTS & DROPDOWN LOGIC
  // ==========================================
  // Available categories in catalog
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  const searchResults = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    let list = products;

    if (selectedCategory && selectedCategory !== "ALL") {
      list = list.filter((p) => String(p.category || "").toLowerCase() === selectedCategory.toLowerCase());
    }

    if (q) {
      list = list.filter((p) => {
        const name = String(p.productName || "").toLowerCase();
        const code = String(p.barcode || "").toLowerCase();
        const cat = String(p.category || "").toLowerCase();
        const supp = String(p.supplier || "").toLowerCase();
        return name.includes(q) || code.includes(q) || cat.includes(q) || supp.includes(q);
      });
    }

    return list.slice(0, 60);
  }, [products, search, selectedCategory]);

  const totalMatches = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    let list = products;

    if (selectedCategory && selectedCategory !== "ALL") {
      list = list.filter((p) => String(p.category || "").toLowerCase() === selectedCategory.toLowerCase());
    }

    if (q) {
      list = list.filter((p) => {
        const name = String(p.productName || "").toLowerCase();
        const code = String(p.barcode || "").toLowerCase();
        const cat = String(p.category || "").toLowerCase();
        const supp = String(p.supplier || "").toLowerCase();
        return name.includes(q) || code.includes(q) || cat.includes(q) || supp.includes(q);
      });
    }

    return list.length;
  }, [products, search, selectedCategory]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight whenever search changes
  useEffect(() => {
    setHighlightedIndex(-1);
    if (search.trim()) {
      setDropdownOpen(true);
    }
  }, [search]);

  const scrollIndexIntoView = (index) => {
    if (!listRef.current) return;
    const item = listRef.current.children[index];
    if (item && typeof item.scrollIntoView === "function") {
      item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!dropdownOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setDropdownOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < searchResults.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : searchResults.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
        e.preventDefault();
        addToCart(searchResults[highlightedIndex]);
        setDropdownOpen(false);
      } else if (searchResults.length === 1) {
        e.preventDefault();
        addToCart(searchResults[0]);
        setDropdownOpen(false);
      }
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  const handleCreateFromSearch = () => {
    const q = String(search || "").trim();
    const isBarcodeLike = /^\d{6,14}$/.test(q);
    setNewProduct({
      ...emptyProduct,
      barcode: isBarcodeLike ? q : "",
      productName: isBarcodeLike ? "" : q
    });
    setShowAddProduct(true);
    setDropdownOpen(false);
  };

  // ==========================================
  // CART ACTIONS
  // ==========================================
  const addToCart = (product) => {
    if (!product) return;
    const stock = Number(product.quantity || 0);

    if (isSale && stock <= 0) {
      showMessage(`${product.productName} is out of stock.`, "error");
      return;
    }

    const existing = cart.find(item => Number(item.id) === Number(product.id));
    if (existing) {
      increaseItem(product.id);
      setSearch("");
      setDropdownOpen(false);
      return;
    }

    setCart(items => [...items, { ...product, cartQuantity: 1 }]);
    setSearch("");
    setDropdownOpen(false);
  };

  const increaseItem = (id) => {
    setCart(items =>
      items.map(item => {
        if (Number(item.id) !== Number(id)) return item;
        const availableStock = Number(item.quantity || 0);

        if (isSale && Number(item.cartQuantity) >= availableStock) {
          showMessage(`Cannot sell more than available stock (${availableStock}) for ${item.productName}.`, "error");
          return item;
        }

        return { ...item, cartQuantity: Number(item.cartQuantity || 0) + 1 };
      })
    );
  };

  const decreaseItem = (id) => {
    setCart(items =>
      items
        .map(item => {
          if (Number(item.id) !== Number(id)) return item;
          return { ...item, cartQuantity: Number(item.cartQuantity || 0) - 1 };
        })
        .filter(item => Number(item.cartQuantity) > 0)
    );
  };

  const removeItem = (id) => {
    setCart(items => items.filter(item => Number(item.id) !== Number(id)));
  };

  const clearCart = () => {
    if (loading) return;
    setCart([]);
    setDiscount(0);
    setCustomer("");
    setSupplier("");
  };

  // ==========================================
  // CALCULATIONS
  // ==========================================
  const subtotal = cart.reduce((sum, item) => {
    const price = Number(isSale ? (item.sellingPrice || 0) : (item.purchasePrice || 0));
    return sum + price * Number(item.cartQuantity || 0);
  }, 0);

  const discountAmount = Math.min(Math.max(Number(discount || 0), 0), subtotal);
  const total = Math.max(0, subtotal - discountAmount);

  // ==========================================
  // ADD NEW PRODUCT (ONLINE & OFFLINE)
  // ==========================================
  const addNewProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.barcode.trim() || !newProduct.productName.trim()) {
      showMessage("Barcode and product name are required.", "error");
      return;
    }

    const payload = {
      barcode: newProduct.barcode.trim(),
      productName: newProduct.productName.trim(),
      category: newProduct.category.trim() || "General",
      supplier: newProduct.supplier.trim() || (supplier || "Direct"),
      purchasePrice: Number(newProduct.purchasePrice || 0),
      sellingPrice: Number(newProduct.sellingPrice || 0),
      quantity: Number(newProduct.quantity || 0),
      minimumStockLevel: Number(newProduct.minimumStockLevel || 0)
    };

    setLoading(true);
    try {
      if (online) {
        const res = await api.post("/products", payload);
        const created = res.data;
        showMessage("Product added to catalog.", "success");
        await loadProducts();
        if (!isSale && created?.id) {
          addToCart(created);
        }
      } else {
        // Offline product creation
        const localProduct = { ...payload, id: Date.now() };
        const updated = [localProduct, ...products];
        setProducts(updated);
        await cacheProducts(updated);
        showMessage("Product saved to local catalog (Offline Mode).", "success");
        if (!isSale) {
          addToCart(localProduct);
        }
      }
      setShowAddProduct(false);
      setNewProduct(emptyProduct);
    } catch (err) {
      console.error(err);
      showMessage("Unable to save product.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // COMPLETE SALE / PURCHASE (BULLETPROOF)
  // ==========================================
  const completeTransaction = async () => {
    if (cart.length === 0) {
      showMessage("Please add at least one product to the cart.", "error");
      return;
    }

    for (const item of cart) {
      const q = Number(item.cartQuantity || 0);
      if (q <= 0) {
        showMessage(`Invalid quantity for ${item.productName}.`, "error");
        return;
      }
      if (isSale) {
        const stock = Number(item.quantity || 0);
        if (q > stock) {
          showMessage(`Insufficient stock for ${item.productName}. Available: ${stock}, requested: ${q}.`, "error");
          return;
        }
      }
    }

    setLoading(true);
    setMessage("");

    const savedOffline = [];
    const completedOnline = [];

    try {
      for (const item of cart) {
        const localId = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
          ? crypto.randomUUID()
          : `${isSale ? "SALE" : "PURCHASE"}-${Date.now()}-${item.id}-${Math.random().toString(36).substring(2, 8)}`;

        const transaction = {
          localTransactionId: localId,
          productId: Number(item.id),
          barcode: item.barcode || "",
          productName: item.productName || "",
          transactionType: isSale ? "SALE" : "PURCHASE",
          quantity: Number(item.cartQuantity),
          unitPrice: Number(isSale ? (item.sellingPrice || 0) : (item.purchasePrice || 0))
        };

        if (!online) {
          // OFFLINE MODE
          await queueTransaction(transaction);
          savedOffline.push(transaction);
        } else {
          // ONLINE MODE
          try {
            await api.post("/transactions", transaction, { timeout: 3500 });
            completedOnline.push(transaction);
          } catch (postErr) {
            console.warn("Backend request failed, saving to local offline queue:", postErr);
            await queueTransaction(transaction);
            savedOffline.push(transaction);
          }
        }
      }

      // Update local product stock in React state immediately
      setProducts(currentProducts =>
        currentProducts.map(product => {
          const cartItem = cart.find(item => Number(item.id) === Number(product.id));
          if (!cartItem) return product;
          const q = Number(cartItem.cartQuantity || 0);
          const cur = Number(product.quantity || 0);
          return {
            ...product,
            quantity: isSale ? Math.max(0, cur - q) : cur + q
          };
        })
      );

      await updatePendingCount();

      if (savedOffline.length > 0) {
        showMessage(
          `⚡ ${isSale ? "Sale" : "Purchase"} saved to local offline storage! (${savedOffline.length} transaction${savedOffline.length > 1 ? "s" : ""} pending sync to server).`,
          "success"
        );
      } else {
        showMessage(
          `✓ ${isSale ? "Sale" : "Purchase"} successfully completed and recorded to central MySQL database!`,
          "success"
        );
      }

      setCart([]);
      setDiscount(0);
      setCustomer("");
      setSupplier("");
      setSearch("");

      if (online) {
        await loadProducts();
      }
    } catch (err) {
      console.error("Transaction execution error:", err);
      showMessage("Error completing transaction. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="transaction-page">
      {/* PAGE HEADING */}
      <div className="page-heading">
        <div>
          <div className="breadcrumb">
            Inventory <Icon name="chevronRight" size={13} /> {isSale ? "Sales" : "Purchases"}
          </div>
          <h1>{isSale ? "Point of Sale (POS)" : "Purchase Inventory"}</h1>
          <p>
            {isSale
              ? "Record product sales, update stock, and trigger automated low-stock alerts."
              : "Record stock purchases, update supplier inventory, and adjust local catalog."}
          </p>
        </div>

        {/* CONNECTION PILL & ACTIONS */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className={`connection-pill ${online ? "online-pill" : "offline-pill"}`}
            onClick={toggleOfflineMode}
            title={online ? "Click to simulate Offline Mode" : "Click to reconnect to Online Mode & sync"}
            style={{ cursor: "pointer", border: "1px solid", outline: "none" }}
          >
            <Icon name={online ? "online" : "offline"} size={15} />
            <span>{online ? "Online" : (simulatedOffline ? "Offline (Sim)" : "Offline")}</span>
          </button>

          {pending > 0 && online && (
            <button
              type="button"
              className="primary-button"
              onClick={sync}
              style={{ height: "38px", padding: "0 12px", background: "#7c3aed" }}
              title="Sync pending transactions to MySQL"
            >
              <Icon name="sync" size={15} /> Sync Now ({pending})
            </button>
          )}
        </div>
      </div>

      {/* OFFLINE BANNER */}
      {!online && (
        <div
          style={{
            padding: "14px 18px",
            marginBottom: "20px",
            borderRadius: "10px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            boxShadow: "0 2px 8px rgba(234, 88, 12, 0.08)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Icon name="offline" size={22} />
            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>
                Offline Mode Active — Local Offline Storage
              </strong>
              <div style={{ fontSize: "13px", marginTop: "2px", color: "#c2410c" }}>
                Transactions are recorded safely in local offline storage with status <b>PENDING</b>. Inventory stock is updated locally in real time.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleOfflineMode}
            className="secondary-button"
            style={{ height: "34px", padding: "0 14px", background: "#ea580c", whiteSpace: "nowrap" }}
          >
            Switch to Online
          </button>
        </div>
      )}

      {/* FEEDBACK MESSAGE */}
      {message && (
        <div
          style={{
            marginBottom: "18px",
            padding: "14px 16px",
            borderRadius: "10px",
            background: messageType === "error" ? "#fef2f2" : "#f0fdf4",
            color: messageType === "error" ? "#b91c1c" : "#166534",
            border: messageType === "error" ? "1px solid #fecaca" : "1px solid #bbf7d0",
            fontSize: "14px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>{messageType === "error" ? "⚠️" : "✓"}</span>
          <span>{message}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN POS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 390px",
          gap: "20px",
          alignItems: "start"
        }}
      >
        {/* LEFT COLUMN: PRODUCT SELECTION & CART TABLE */}
        <div style={{ position: "relative", zIndex: 30, minWidth: 0 }}>
          {/* SEARCH & BARCODE SCANNER BAR */}
          <div
            className="panel"
            style={{
              padding: "20px",
              marginBottom: "18px",
              overflow: "visible",
              position: "relative",
              zIndex: 40
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Select Product</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                {!isSale && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setNewProduct(emptyProduct);
                      setShowAddProduct(true);
                    }}
                    style={{ padding: "0 12px", height: "36px", fontSize: "12px" }}
                  >
                    <Icon name="plus" size={14} /> New Product
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", position: "relative", zIndex: 50 }}>
              <div
                ref={searchContainerRef}
                style={{ position: "relative", flex: 1, zIndex: 60 }}
              >
                <div
                  onClick={() => setDropdownOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    border: dropdownOpen ? "1px solid #7044e8" : "1px solid #d1d5db",
                    borderRadius: "10px",
                    padding: "0 14px",
                    background: "#fff",
                    boxShadow: dropdownOpen ? "0 0 0 3px rgba(112, 68, 232, 0.12)" : "none",
                    cursor: "text",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Icon
                    name="search"
                    size={18}
                    style={{ color: dropdownOpen ? "#7044e8" : "#6b7280", flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (!dropdownOpen) setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={
                      isSale
                        ? "Select or search product to sell (by name, barcode, SKU)..."
                        : "Select or search product to purchase / restock..."
                    }
                    autoComplete="off"
                    spellCheck="false"
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      padding: "12px 0",
                      fontSize: "14px",
                      background: "transparent"
                    }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearch("");
                        setHighlightedIndex(-1);
                      }}
                      style={{
                        border: "none",
                        background: "#f1f5f9",
                        borderRadius: "50%",
                        width: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#6b7280",
                        transition: "background 0.15s ease",
                        flexShrink: 0
                      }}
                      title="Clear search text"
                    >
                      ×
                    </button>
                  )}
                  {/* Chevron dropdown toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen((prev) => !prev);
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      padding: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: dropdownOpen ? "#7044e8" : "#94a3b8",
                      transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease, color 0.2s ease",
                      flexShrink: 0
                    }}
                    title={dropdownOpen ? "Close catalog dropdown" : "Open catalog dropdown"}
                  >
                    <Icon name="chevronDown" size={17} />
                  </button>
                </div>

                {/* SEARCH & CATALOG DROPDOWN */}
                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "calc(100% + 6px)",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 20px 45px -4px rgba(0,0,0,0.22), 0 10px 20px -6px rgba(0,0,0,0.12)",
                      zIndex: 9999,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column"
                    }}
                  >
                    {/* Category Filter Pills (if categories exist) */}
                    {categories.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 12px",
                          background: "#f8fafc",
                          borderBottom: "1px solid #f1f5f9",
                          overflowX: "auto"
                        }}
                      >
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginRight: 4, flexShrink: 0 }}>
                          Category:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCategory("ALL")}
                          style={{
                            padding: "3px 10px",
                            borderRadius: "14px",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            border: selectedCategory === "ALL" ? "1px solid #7044e8" : "1px solid #e2e8f0",
                            background: selectedCategory === "ALL" ? "#ede9fe" : "#ffffff",
                            color: selectedCategory === "ALL" ? "#7044e8" : "#475569",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                          }}
                        >
                          All ({products.length})
                        </button>
                        {categories.map((cat) => {
                          const isCatActive = selectedCategory === cat;
                          const count = products.filter((p) => p.category === cat).length;
                          return (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              style={{
                                padding: "3px 10px",
                                borderRadius: "14px",
                                fontSize: "0.74rem",
                                fontWeight: 600,
                                border: isCatActive ? "1px solid #7044e8" : "1px solid #e2e8f0",
                                background: isCatActive ? "#ede9fe" : "#ffffff",
                                color: isCatActive ? "#7044e8" : "#475569",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                flexShrink: 0
                              }}
                            >
                              {cat} ({count})
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Subheader info bar */}
                    <div
                      style={{
                        padding: "7px 14px",
                        background: "#ffffff",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.78rem",
                        color: "#64748b"
                      }}
                    >
                      <span>
                        {search.trim() ? (
                          <>Matching <strong>{totalMatches}</strong> of {products.length} products</>
                        ) : (
                          <>Catalog: <strong>{totalMatches}</strong> available products</>
                        )}
                      </span>
                      <span style={{ fontSize: "0.72rem", background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontWeight: 500, color: "#64748b" }}>
                        ↑↓ Navigate • Enter to select • Esc to close
                      </span>
                    </div>

                    {/* Loading State */}
                    {productsLoading && (
                      <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
                        Loading products catalog...
                      </div>
                    )}

                    {/* Zero State with Quick Add to Catalog */}
                    {!productsLoading && searchResults.length === 0 && (
                      <div style={{ padding: "24px 18px", textAlign: "center" }}>
                        <div style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 12 }}>
                          {search.trim() ? (
                            <>No products found matching "<strong>{search}</strong>"</>
                          ) : (
                            <>No products found in this category.</>
                          )}
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={handleCreateFromSearch}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 14px",
                            fontSize: "0.84rem",
                            background: "#ede9fe",
                            color: "#7044e8",
                            border: "1px solid #c4b5fd"
                          }}
                        >
                          <Icon name="plus" size={14} />
                          {search.trim() ? `Add "${search}" to Catalog` : "Add New Product"}
                        </button>
                      </div>
                    )}

                    {/* Scrollable Product List */}
                    {!productsLoading && searchResults.length > 0 && (
                      <div
                        ref={listRef}
                        style={{
                          maxHeight: "360px",
                          overflowY: "auto",
                          padding: "6px"
                        }}
                      >
                        {searchResults.map((product, idx) => {
                          const stock = Number(product.quantity || 0);
                          const isOutOfStock = isSale && stock <= 0;
                          const isLowStock = stock > 0 && stock <= Number(product.minimumStockLevel || 10);
                          const isHighlighted = highlightedIndex === idx;
                          const price = Number(isSale ? product.sellingPrice : product.purchasePrice || 0);

                          return (
                            <div
                              key={product.id}
                              onClick={() => {
                                if (!isOutOfStock) {
                                  addToCart(product);
                                }
                              }}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                marginBottom: "3px",
                                cursor: isOutOfStock ? "not-allowed" : "pointer",
                                background: isHighlighted ? "#f5f3ff" : (isOutOfStock ? "#fafafa" : "#ffffff"),
                                border: isHighlighted ? "1px solid #c4b5fd" : "1px solid transparent",
                                opacity: isOutOfStock ? 0.65 : 1,
                                transition: "all 0.12s ease"
                              }}
                            >
                              {/* Left: Product Info */}
                              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: "0.92rem",
                                      color: isOutOfStock ? "#64748b" : "#0f172a"
                                    }}
                                  >
                                    {product.productName}
                                  </span>
                                  {product.category && (
                                    <span
                                      style={{
                                        fontSize: "0.72rem",
                                        background: "#f1f5f9",
                                        color: "#475569",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        fontWeight: 500
                                      }}
                                    >
                                      {product.category}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: "0.78rem", color: "#64748b" }}>
                                  <span>Barcode: <strong style={{ color: "#334155" }}>{product.barcode || "—"}</strong></span>
                                  {product.supplier && <span>Supplier: {product.supplier}</span>}
                                </div>
                              </div>

                              {/* Right: Stock, Price & Quick Add */}
                              <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                                <div style={{ textAlign: "right" }}>
                                  {isSale ? (
                                    // Sale mode stock indicators
                                    isOutOfStock ? (
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: "0.74rem",
                                          padding: "2px 8px",
                                          borderRadius: "12px",
                                          fontWeight: 600,
                                          background: "#ffe4e6",
                                          color: "#e11d48"
                                        }}
                                      >
                                        Out of Stock
                                      </span>
                                    ) : isLowStock ? (
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: "0.74rem",
                                          padding: "2px 8px",
                                          borderRadius: "12px",
                                          fontWeight: 600,
                                          background: "#fef3c7",
                                          color: "#b45309"
                                        }}
                                      >
                                        Low: {stock} left
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: "0.74rem",
                                          padding: "2px 8px",
                                          borderRadius: "12px",
                                          fontWeight: 600,
                                          background: "#dcfce7",
                                          color: "#15803d"
                                        }}
                                      >
                                        {stock} in stock
                                      </span>
                                    )
                                  ) : (
                                    // Purchase mode stock indicators (allows restock even when 0)
                                    stock <= 0 ? (
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: "0.74rem",
                                          padding: "2px 8px",
                                          borderRadius: "12px",
                                          fontWeight: 600,
                                          background: "#eff6ff",
                                          color: "#2563eb"
                                        }}
                                      >
                                        0 in stock (Restock)
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: "0.74rem",
                                          padding: "2px 8px",
                                          borderRadius: "12px",
                                          fontWeight: 600,
                                          background: "#f1f5f9",
                                          color: "#475569"
                                        }}
                                      >
                                        Current: {stock} units
                                      </span>
                                    )
                                  )}

                                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                                    ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isOutOfStock}
                                  style={{
                                    background: isHighlighted ? "#7044e8" : "#f1f5f9",
                                    color: isHighlighted ? "#ffffff" : "#475569",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "6px 12px",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    cursor: isOutOfStock ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  <Icon name="plus" size={13} /> {isSale ? "Add to Sale" : "Add to Purchase"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ZXING BARCODE SCANNER BUTTON */}
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setScanFeedback("");
                  setScannerOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  padding: "0 16px",
                  height: "44px"
                }}
                title="Scan product barcode directly using device camera and ZXing"
              >
                <Icon name="barcode" size={18} />
                Scan (ZXing)
              </button>
            </div>
          </div>

          {/* CART ITEMS TABLE */}
          <div className="panel" style={{ padding: 0, overflow: "hidden", position: "relative", zIndex: 1 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                {isSale ? "Sale Items" : "Purchase Items"} ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
                <Icon name="cart" size={36} />
                <p style={{ marginTop: "12px", fontSize: "14px" }}>
                  Your {isSale ? "sale" : "purchase"} cart is empty.
                </p>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                  Search for products above or scan a barcode with ZXing camera to begin.
                </span>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>BARCODE</th>
                      <th>PRICE</th>
                      <th style={{ textAlign: "center" }}>QUANTITY</th>
                      <th style={{ textAlign: "right" }}>TOTAL</th>
                      <th style={{ textAlign: "center" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => {
                      const price = Number(isSale ? (item.sellingPrice || 0) : (item.purchasePrice || 0));
                      const itemTotal = price * Number(item.cartQuantity || 0);

                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.productName}</strong>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              Current Stock: {item.quantity}
                            </div>
                          </td>
                          <td><code>{item.barcode || "—"}</code></td>
                          <td>₹{price.toLocaleString("en-IN")}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => decreaseItem(item.id)}
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  background: "#fff",
                                  cursor: "pointer"
                                }}
                              >
                                −
                              </button>
                              <strong style={{ minWidth: "24px", textAlign: "center" }}>
                                {item.cartQuantity}
                              </strong>
                              <button
                                type="button"
                                onClick={() => increaseItem(item.id)}
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  border: "1px solid #d1d5db",
                                  background: "#fff",
                                  cursor: "pointer"
                                }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            ₹{itemTotal.toLocaleString("en-IN")}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: "4px"
                              }}
                              title="Remove item"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHECKOUT & PAYMENT SUMMARY */}
        <div style={{ position: "relative", zIndex: 1, minWidth: 0 }}>
          <div className="panel" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 18px", fontSize: "1.1rem" }}>Transaction Summary</h3>

            {/* CUSTOMER / SUPPLIER INFO */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                {isSale ? "Customer Name (Optional)" : "Supplier Name"}
              </label>
              <input
                type="text"
                value={isSale ? customer : supplier}
                onChange={(e) => (isSale ? setCustomer(e.target.value) : setSupplier(e.target.value))}
                placeholder={isSale ? "Walk-in Customer" : "e.g. ABC Traders"}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "13px"
                }}
              />
            </div>

            {/* PAYMENT METHOD */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "8px", color: "#374151" }}>
                Payment Method
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { value: "Cash", label: "Cash", sub: "Cash Counter", icon: "rupee" },
                  { value: "UPI", label: "UPI / Digital", sub: "Instant QR / VPA", icon: "scan" },
                  { value: "Card", label: "Card", sub: "Debit / Credit", icon: "receipt" },
                  { value: "Bank Transfer", label: "Bank Transfer", sub: "Direct Transfer", icon: "boxes" }
                ].map((opt) => {
                  const isSelected = paymentMethod === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setPaymentMethod(opt.value)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid #7044e8" : "1px solid #e2e8f0",
                        background: isSelected ? "#f5f3ff" : "#ffffff",
                        color: isSelected ? "#7044e8" : "#1e293b",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 2px 4px rgba(112, 68, 232, 0.08)" : "none"
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "6px",
                          background: isSelected ? "#ede9fe" : "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isSelected ? "#7044e8" : "#64748b",
                          flexShrink: 0
                        }}
                      >
                        <Icon name={opt.icon} size={15} />
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: isSelected ? "#7044e8" : "#94a3b8", whiteSpace: "nowrap" }}>
                          {opt.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DISCOUNT */}
            {isSale && (
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px"
                  }}
                />
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "16px 0" }} />

            {/* PRICE BREAKDOWN */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#64748b" }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>

            {isSale && discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#16a34a" }}>
                <span>Discount:</span>
                <span>−₹{discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", marginBottom: "20px", fontSize: "18px", fontWeight: 800 }}>
              <span>Total Payable:</span>
              <span style={{ color: "#7044e8" }}>₹{total.toLocaleString("en-IN")}</span>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="button"
              className="primary-button"
              onClick={completeTransaction}
              disabled={loading || cart.length === 0}
              style={{
                width: "100%",
                height: "46px",
                justifyContent: "center",
                fontSize: "14px",
                boxShadow: "0 8px 20px rgba(112, 68, 232, 0.28)"
              }}
            >
              {loading
                ? "Processing..."
                : isSale
                  ? `Complete Sale (₹${total.toLocaleString("en-IN")})`
                  : `Record Purchase (₹${total.toLocaleString("en-IN")})`}
            </button>

            {/* STORAGE STATUS PILL */}
            <div style={{ marginTop: "16px", textAlign: "center", fontSize: "11px", color: "#64748b" }}>
              {online
                ? "🟢 Central Server Online (Instant database commit & automated email alert dispatch)"
                : "🟠 Local Offline Storage Active (Saved locally, auto-sync when online)"}
            </div>
          </div>
        </div>
      </div>

      {/* ZXING BARCODE SCANNER MODAL */}
      {scannerOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1000 }}
          onMouseDown={(e) => e.target === e.currentTarget && setScannerOpen(false)}
        >
          <div className="product-modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div>
                <h2>ZXing Camera Barcode Scanner</h2>
                <p>Point device camera at the product barcode to select it instantly.</p>
              </div>
              <button
                type="button"
                className="modal-x"
                onClick={() => setScannerOpen(false)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div
                style={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "2px solid #7044e8",
                  background: "#000",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <BarcodeScanner onScan={handleBarcodeScan} />
              </div>

              {scanFeedback && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    color: "#166534",
                    borderRadius: 8,
                    fontSize: "0.92rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  <span>✓</span> {scanFeedback}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setScannerOpen(false)}
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW PRODUCT MODAL */}
      {showAddProduct && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1000 }}
          onMouseDown={(e) => e.target === e.currentTarget && setShowAddProduct(false)}
        >
          <form className="product-modal" onSubmit={addNewProduct}>
            <div className="modal-header">
              <div>
                <h2>Add Product to Catalog</h2>
                <p>Register new product details to update stock directly.</p>
              </div>
              <button
                type="button"
                className="modal-x"
                onClick={() => setShowAddProduct(false)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            <div className="form-grid">
              <label>
                <span>Barcode *</span>
                <input
                  required
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  placeholder="8901234567890"
                />
              </label>

              <label>
                <span>Product Name *</span>
                <input
                  required
                  value={newProduct.productName}
                  onChange={(e) => setNewProduct({ ...newProduct, productName: e.target.value })}
                  placeholder="e.g. Parle-G 100g"
                />
              </label>

              <label>
                <span>Category</span>
                <input
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  placeholder="e.g. Biscuits"
                />
              </label>

              <label>
                <span>Supplier</span>
                <input
                  value={newProduct.supplier}
                  onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                  placeholder="e.g. Parle Products"
                />
              </label>

              <label>
                <span>Purchase Price (₹) *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={newProduct.purchasePrice}
                  onChange={(e) => setNewProduct({ ...newProduct, purchasePrice: e.target.value })}
                  placeholder="15.00"
                />
              </label>

              <label>
                <span>Selling Price (₹) *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={newProduct.sellingPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })}
                  placeholder="20.00"
                />
              </label>

              <label>
                <span>Initial Stock *</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                  placeholder="50"
                />
              </label>

              <label>
                <span>Minimum Stock Level *</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={newProduct.minimumStockLevel}
                  onChange={(e) => setNewProduct({ ...newProduct, minimumStockLevel: e.target.value })}
                  placeholder="10"
                />
              </label>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowAddProduct(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? "Saving..." : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )  ;
}