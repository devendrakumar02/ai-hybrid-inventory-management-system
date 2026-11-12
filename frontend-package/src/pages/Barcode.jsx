import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { api } from "../services/api";
import Icon from "../components/Icon";

export default function Barcode() {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // START SCANNER
  // --------------------------------------------------

  const startScanner = async () => {
    try {
      setMessage("");
      setNotFound(false);
      setProduct(null);

      const reader = new BrowserMultiFormatReader();

      codeReaderRef.current = reader;

      setScanning(true);

      await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const scannedCode = result.getText();

            console.log("Barcode detected:", scannedCode);

            setBarcode(scannedCode);

            // Stop scanner after successful scan
            stopScanner();

            // Search product
            await findProduct(scannedCode);
          }
        }
      );
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to access camera. Please allow camera permission."
      );
      setScanning(false);
    }
  };

  // --------------------------------------------------
  // STOP SCANNER
  // --------------------------------------------------

  const stopScanner = () => {
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    } catch (error) {
      console.error(error);
    }

    setScanning(false);
  };

  // --------------------------------------------------
  // SEARCH PRODUCT
  // --------------------------------------------------

  const findProduct = async (code) => {
    if (!code) return;

    setLoading(true);
    setProduct(null);
    setNotFound(false);
    setMessage("");

    try {
      const response = await api.get(
        `/products/barcode/${encodeURIComponent(code)}`
      );

      const foundProduct = response.data;

      setProduct(foundProduct);
      setQuantity(Number(foundProduct.quantity || 0));

    } catch (error) {

      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        setMessage("Unable to search product.");
      }

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // MANUAL SEARCH
  // --------------------------------------------------

  const handleManualSearch = async (e) => {
    e.preventDefault();

    if (!barcode.trim()) {
      setMessage("Enter a barcode.");
      return;
    }

    await findProduct(barcode.trim());
  };

  // --------------------------------------------------
  // QUANTITY
  // --------------------------------------------------

  const increaseQuantity = () => {
    setQuantity((q) => q + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((q) => Math.max(0, q - 1));
  };

  // --------------------------------------------------
  // UPDATE STOCK
  // --------------------------------------------------

  const updateStock = async () => {

    if (!product) return;

    setLoading(true);

    try {

      await api.put(`/products/${product.id}`, {
        barcode: product.barcode,
        productName: product.productName,
        category: product.category || "",
        supplier: product.supplier || "",
        purchasePrice: Number(product.purchasePrice || 0),
        sellingPrice: Number(product.sellingPrice || 0),
        quantity: quantity,
        minimumStockLevel: Number(
          product.minimumStockLevel || 0
        )
      });

      setProduct({
        ...product,
        quantity: quantity
      });

      setMessage("Stock updated successfully.");

    } catch (error) {

      console.error(error);

      setMessage("Failed to update stock.");

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // ADD PRODUCT
  // --------------------------------------------------

  const addProduct = () => {

    // Save scanned barcode temporarily
    localStorage.setItem(
      "newProductBarcode",
      barcode
    );

    // Go to Products page
    window.location.href = "/products";
  };

  // --------------------------------------------------
  // CLEANUP
  // --------------------------------------------------

  useEffect(() => {

    return () => {
      try {
        if (codeReaderRef.current) {
          codeReaderRef.current.reset();
        }
      } catch (error) {
        console.error(error);
      }
    };

  }, []);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <section className="products-page">

      <div className="page-heading">

        <div>

          <div className="breadcrumb">
            Inventory
            <Icon name="chevronRight" size={13} />
            Barcode Scanner
          </div>

          <h1>Barcode Scanner</h1>

          <p>
            Scan a product barcode to view and update stock.
          </p>

        </div>

      </div>

      {/* SCANNER */}

      <div className="panel" style={{ padding: "24px" }}>

        <div
          style={{
            maxWidth: "650px",
            margin: "0 auto"
          }}
        >

          <div
            style={{
              background: "#111827",
              borderRadius: "14px",
              overflow: "hidden",
              position: "relative",
              minHeight: "320px"
            }}
          >

            <video
              ref={videoRef}
              style={{
                width: "100%",
                display: scanning ? "block" : "none"
              }}
            />

            {!scanning && (
              <div
                style={{
                  minHeight: "320px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  gap: "12px"
                }}
              >

                <Icon
                  name="scan"
                  size={55}
                  strokeWidth={1.5}
                />

                <strong>
                  Ready to scan
                </strong>

                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px"
                  }}
                >
                  Point the camera at a barcode
                </span>

              </div>
            )}

          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "16px"
            }}
          >

            {!scanning ? (

              <button
                className="primary-button"
                onClick={startScanner}
              >
                <Icon name="scan" size={16} />
                Start Scanner
              </button>

            ) : (

              <button
                className="cancel-button"
                onClick={stopScanner}
              >
                Stop Scanner
              </button>

            )}

          </div>

        </div>

      </div>

      {/* MANUAL BARCODE */}

      <div
        className="panel"
        style={{
          padding: "22px",
          marginTop: "18px"
        }}
      >

        <h3 style={{ marginTop: 0 }}>
          Manual Barcode Entry
        </h3>

        <form
          onSubmit={handleManualSearch}
          style={{
            display: "flex",
            gap: "10px",
            maxWidth: "650px"
          }}
        >

          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter barcode..."
            style={{
              flex: 1,
              padding: "12px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px"
            }}
          />

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            Search
          </button>

        </form>

      </div>

      {/* MESSAGE */}

      {message && (
        <div
          style={{
            marginTop: "18px",
            padding: "14px",
            borderRadius: "9px",
            background: "#f0fdf4",
            color: "#166534"
          }}
        >
          {message}
        </div>
      )}

      {/* PRODUCT FOUND */}

      {product && (

        <div
          className="panel"
          style={{
            marginTop: "18px",
            padding: "24px"
          }}
        >

          <h2 style={{ marginTop: 0 }}>
            Product Found
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: "16px"
            }}
          >

            <div>
              <small>Product</small>
              <h3>{product.productName}</h3>
            </div>

            <div>
              <small>Barcode</small>
              <h3>{product.barcode}</h3>
            </div>

            <div>
              <small>Selling Price</small>
              <h3>
                ₹{Number(
                  product.sellingPrice || 0
                ).toLocaleString("en-IN")}
              </h3>
            </div>

          </div>

          {/* QUANTITY */}

          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              background: "#f9fafb",
              borderRadius: "12px"
            }}
          >

            <div
              style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "10px"
              }}
            >
              Current Quantity
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px"
              }}
            >

              <button
                type="button"
                onClick={decreaseQuantity}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "22px"
                }}
              >
                −
              </button>

              <strong
                style={{
                  fontSize: "28px",
                  minWidth: "60px",
                  textAlign: "center"
                }}
              >
                {quantity}
              </strong>

              <button
                type="button"
                onClick={increaseQuantity}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "22px"
                }}
              >
                +
              </button>

            </div>

            <button
              className="primary-button"
              onClick={updateStock}
              disabled={loading}
              style={{ marginTop: "18px" }}
            >
              {loading ? "Updating..." : "Update Stock"}
            </button>

          </div>

        </div>

      )}

      {/* PRODUCT NOT FOUND */}

      {notFound && (

        <div
          className="panel"
          style={{
            marginTop: "18px",
            padding: "28px",
            textAlign: "center"
          }}
        >

          <Icon
            name="warning"
            size={42}
          />

          <h2>
            Product Not Found
          </h2>

          <p style={{ color: "#6b7280" }}>
            No product exists with barcode:
          </p>

          <strong>
            {barcode}
          </strong>

          <div style={{ marginTop: "20px" }}>

            <button
              className="primary-button"
              onClick={addProduct}
            >
              <Icon name="plus" size={16} />
              Add Product
            </button>

          </div>

        </div>

      )}

    </section>
  );
}