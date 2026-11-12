import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';

export default function Reports() {
  // Report Type Selection
  // 1: INVENTORY_CATALOG
  // 2: SALES_LEDGER
  // 3: PURCHASES_LEDGER
  // 4: LOW_STOCK_ALERT
  // 5: VELOCITY_REPORT
  const [reportType, setReportType] = useState('INVENTORY_CATALOG');

  // Filter criteria
  const [dateRange, setDateRange] = useState('ALL'); // ALL, TODAY, WEEK, MONTH, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileFormat, setFileFormat] = useState('CSV_EXCEL'); // CSV_EXCEL (.csv / .xlsx compatible)

  // Data fetching & feedback
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fastMoving, setFastMoving] = useState([]);
  const [slowMoving, setSlowMoving] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load backend catalog and transactions on mount for instant preview
  useEffect(() => {
    loadSourceData();
  }, []);

  const loadSourceData = async () => {
    try {
      setLoadingData(true);
      setErrorMessage('');

      const [prodsRes, txRes, fastRes, slowRes] = await Promise.allSettled([
        api.get('/products'),
        api.get('/transactions'),
        api.get('/dashboard/fast-moving'),
        api.get('/dashboard/slow-moving')
      ]);

      if (prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value.data)) {
        setProducts(prodsRes.value.data);
      }
      if (txRes.status === 'fulfilled' && Array.isArray(txRes.value.data)) {
        setTransactions(txRes.value.data);
      }
      if (fastRes.status === 'fulfilled' && Array.isArray(fastRes.value.data)) {
        setFastMoving(fastRes.value.data);
      }
      if (slowRes.status === 'fulfilled' && Array.isArray(slowRes.value.data)) {
        setSlowMoving(slowRes.value.data);
      }
    } catch (err) {
      console.warn('Error pre-loading report source data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Report Definitions
  const reportOptions = [
    {
      id: 'INVENTORY_CATALOG',
      title: 'Complete Inventory & Valuation Master Sheet',
      icon: 'boxes',
      color: '#107c41', // Excel Green
      badge: 'Master Catalog',
      description: 'Comprehensive catalog export with unit purchase prices, selling prices, available quantities, minimum stock levels, and total stock valuation.',
      columns: ['Product ID', 'Product Name', 'Barcode / SKU', 'Category', 'Supplier', 'Purchase Price (₹)', 'Selling Price (₹)', 'Stock On Hand', 'Min Stock Level', 'Inventory Value (₹)', 'Stock Health Status']
    },
    {
      id: 'SALES_LEDGER',
      title: 'Sales & Revenue Transactions Ledger',
      icon: 'sales',
      color: '#059669', // Emerald
      badge: 'Revenue Stream',
      description: 'Chronological customer POS transactions, itemized sales quantities, billing prices, invoice revenue, and transaction timestamps.',
      columns: ['Invoice ID', 'Date & Time', 'Product ID', 'Product Name', 'Category', 'Quantity Sold', 'Unit Price (₹)', 'Total Revenue (₹)', 'Sync Status']
    },
    {
      id: 'PURCHASES_LEDGER',
      title: 'Procurement & Purchase Restocking Report',
      icon: 'purchases',
      color: '#2563eb', // Blue
      badge: 'Inward Stock',
      description: 'Itemized supplier purchases and warehouse restocking orders, procurement expenditure, supplier information, and purchase dates.',
      columns: ['Purchase ID', 'Date & Time', 'Product ID', 'Product Name', 'Quantity Restocked', 'Unit Cost (₹)', 'Total Expense (₹)', 'Sync Status']
    },
    {
      id: 'LOW_STOCK_ALERT',
      title: 'Low Stock & Urgent Reorder Threshold Sheet',
      icon: 'warning',
      color: '#dc2626', // Red
      badge: 'Stockout Hazard',
      description: 'Critical inventory items at or below reorder threshold, required replenishment quantities, estimated restocking budget, and contact emails.',
      columns: ['Product ID', 'Product Name', 'Category', 'Current Available Stock', 'Minimum Safe Level', 'Shortage Deficit', 'Estimated Reorder Budget (₹)', 'Supplier Contact', 'Manager Email', 'Admin Email']
    },
    {
      id: 'VELOCITY_REPORT',
      title: 'Product Turnover Velocity (Fast & Slow Movers)',
      icon: 'forecast',
      color: '#7044e8', // Purple
      badge: 'Analytics',
      description: 'Sales velocity analysis categorizing items into high-turnover fast movers vs dormant slow-moving inventory with capital retention value.',
      columns: ['Product ID', 'Product Name', 'Category', 'Current Stock', 'Total Units Sold', 'Selling Price (₹)', 'Turnover Category', 'Capital Tied Up (₹)', 'Replenishment Priority']
    }
  ];

  const currentReport = useMemo(() => {
    return reportOptions.find(r => r.id === reportType) || reportOptions[0];
  }, [reportType]);

  // Product map helper
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach(p => map.set(String(p.id), p));
    return map;
  }, [products]);

  // Date filtering helper
  const isDateInRange = (dateStr) => {
    if (!dateStr || dateRange === 'ALL') return true;
    const d = new Date(dateStr);
    const now = new Date();

    if (dateRange === 'TODAY') {
      return d.toDateString() === now.toDateString();
    } else if (dateRange === 'WEEK') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return d >= past;
    } else if (dateRange === 'MONTH') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      return d >= past;
    } else if (dateRange === 'CUSTOM') {
      if (startDate && d < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    }
    return true;
  };

  // Calculate estimated record count
  const estimatedRecords = useMemo(() => {
    if (reportType === 'INVENTORY_CATALOG') {
      return products.length;
    } else if (reportType === 'SALES_LEDGER') {
      return transactions.filter(t => t.transactionType === 'SALE' && isDateInRange(t.transactionDate)).length;
    } else if (reportType === 'PURCHASES_LEDGER') {
      return transactions.filter(t => t.transactionType === 'PURCHASE' && isDateInRange(t.transactionDate)).length;
    } else if (reportType === 'LOW_STOCK_ALERT') {
      return products.filter(p => (p.quantity ?? 0) <= (p.minimumStockLevel ?? 10)).length;
    } else if (reportType === 'VELOCITY_REPORT') {
      return fastMoving.length + slowMoving.length || products.length;
    }
    return 0;
  }, [reportType, products, transactions, fastMoving, slowMoving, dateRange, startDate, endDate]);

  // Generate Excel Spreadsheet and trigger download
  const handleGenerateExcel = () => {
    try {
      setDownloading(true);
      setErrorMessage('');
      setSuccessMessage('');

      const todayStr = new Date().toISOString().split('T')[0];
      let filename = '';
      let headers = currentReport.columns;
      let rows = [];

      if (reportType === 'INVENTORY_CATALOG') {
        filename = `Inventory_Master_Catalog_${todayStr}.csv`;
        let totalValuation = 0;
        let totalQty = 0;

        rows = products.map(p => {
          const qty = Number(p.quantity || 0);
          const minLevel = Number(p.minimumStockLevel || 10);
          const pPrice = Number(p.purchasePrice || 0);
          const sPrice = Number(p.sellingPrice || 0);
          const val = qty * sPrice;
          totalValuation += val;
          totalQty += qty;

          let status = 'In Stock';
          if (qty === 0) status = 'Out of Stock';
          else if (qty <= minLevel) status = 'Low Stock';

          return [
            p.id,
            p.productName || `Product #${p.id}`,
            p.barcode || 'N/A',
            p.category || 'General',
            p.supplier || 'N/A',
            pPrice.toFixed(2),
            sPrice.toFixed(2),
            qty,
            minLevel,
            val.toFixed(2),
            status
          ];
        });

        // Add summary row
        rows.push([
          'TOTAL',
          `${products.length} Products`,
          '',
          '',
          '',
          '',
          '',
          totalQty,
          '',
          totalValuation.toFixed(2),
          ''
        ]);
      } else if (reportType === 'SALES_LEDGER') {
        filename = `Sales_Transactions_Ledger_${todayStr}.csv`;
        const salesTx = transactions.filter(t => t.transactionType === 'SALE' && isDateInRange(t.transactionDate));
        let totalRev = 0;
        let totalUnits = 0;

        rows = salesTx.map(t => {
          const prod = productMap.get(String(t.productId));
          const qty = Number(t.quantity || 0);
          const unitPrice = Number(t.unitPrice || 0);
          const totalAmt = Number(t.totalAmount || 0);
          totalRev += totalAmt;
          totalUnits += qty;

          const dateStr = t.transactionDate
            ? new Date(t.transactionDate).toLocaleString('en-IN')
            : 'Recent';

          return [
            `#${String(t.id).padStart(4, '0')}`,
            dateStr,
            t.productId,
            prod?.productName || `Product #${t.productId}`,
            prod?.category || 'General',
            qty,
            unitPrice.toFixed(2),
            totalAmt.toFixed(2),
            t.syncStatus || 'SYNCED'
          ];
        });

        rows.push([
          'TOTAL',
          `${salesTx.length} Transactions`,
          '',
          '',
          '',
          totalUnits,
          '',
          totalRev.toFixed(2),
          ''
        ]);
      } else if (reportType === 'PURCHASES_LEDGER') {
        filename = `Purchases_Procurement_Ledger_${todayStr}.csv`;
        const purchaseTx = transactions.filter(t => t.transactionType === 'PURCHASE' && isDateInRange(t.transactionDate));
        let totalExp = 0;
        let totalUnits = 0;

        rows = purchaseTx.map(t => {
          const prod = productMap.get(String(t.productId));
          const qty = Number(t.quantity || 0);
          const unitPrice = Number(t.unitPrice || 0);
          const totalAmt = Number(t.totalAmount || 0);
          totalExp += totalAmt;
          totalUnits += qty;

          const dateStr = t.transactionDate
            ? new Date(t.transactionDate).toLocaleString('en-IN')
            : 'Recent';

          return [
            `#${String(t.id).padStart(4, '0')}`,
            dateStr,
            t.productId,
            prod?.productName || `Product #${t.productId}`,
            qty,
            unitPrice.toFixed(2),
            totalAmt.toFixed(2),
            t.syncStatus || 'SYNCED'
          ];
        });

        rows.push([
          'TOTAL',
          `${purchaseTx.length} Purchases`,
          '',
          '',
          totalUnits,
          '',
          totalExp.toFixed(2),
          ''
        ]);
      } else if (reportType === 'LOW_STOCK_ALERT') {
        filename = `Low_Stock_Urgent_Reorder_${todayStr}.csv`;
        const lowItems = products.filter(p => (p.quantity ?? 0) <= (p.minimumStockLevel ?? 10));
        let totalEstimatedBudget = 0;

        rows = lowItems.map(p => {
          const qty = Number(p.quantity || 0);
          const minLevel = Number(p.minimumStockLevel || 10);
          const deficit = Math.max(0, minLevel - qty);
          const pPrice = Number(p.purchasePrice || p.sellingPrice || 50);
          const budget = deficit * pPrice;
          totalEstimatedBudget += budget;

          return [
            p.id,
            p.productName || `Product #${p.id}`,
            p.category || 'General',
            qty,
            minLevel,
            deficit,
            budget.toFixed(2),
            p.supplier || 'N/A',
            p.managerEmail || 'store-manager@example.com',
            p.adminEmail || 'inventory-admin@example.com'
          ];
        });

        rows.push([
          'TOTAL',
          `${lowItems.length} Low Stock SKUs`,
          '',
          '',
          '',
          '',
          totalEstimatedBudget.toFixed(2),
          '',
          '',
          ''
        ]);
      } else if (reportType === 'VELOCITY_REPORT') {
        filename = `Product_Velocity_Turnover_${todayStr}.csv`;
        const combined = [
          ...fastMoving.map(item => ({ ...item, categoryTag: 'FAST' })),
          ...slowMoving.map(item => ({ ...item, categoryTag: 'SLOW' }))
        ];

        rows = combined.map(item => {
          const prod = productMap.get(String(item.productId));
          const stock = Number(item.currentStock ?? prod?.quantity ?? 0);
          const sold = Number(item.quantitySold ?? 0);
          const price = Number(item.sellingPrice ?? prod?.sellingPrice ?? 50);
          const capital = stock * price;
          const isFast = item.categoryTag === 'FAST';

          return [
            item.productId,
            item.productName || prod?.productName || `Product #${item.productId}`,
            item.category || prod?.category || 'General',
            stock,
            sold,
            price.toFixed(2),
            isFast ? 'FAST-MOVING (High Turnover)' : 'SLOW-MOVING (Dormant / Overstock)',
            capital.toFixed(2),
            isFast ? 'HIGH - Monitor for Stockout' : 'LOW - Promote or Clear Stock'
          ];
        });
      }

      // Format CSV with UTF-8 BOM so Microsoft Excel automatically parses characters properly
      const csvContent = '\uFEFF' + [
        headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
        ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Excel spreadsheet "${filename}" generated and downloaded successfully!`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err) {
      console.error('Error generating Excel file:', err);
      setErrorMessage('Failed to generate Excel spreadsheet. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="reports-page" style={{ paddingBottom: '50px' }}>
      {/* PAGE HEADER */}
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="breadcrumb">
            Intelligence <Icon name="chevronRight" size={13} /> Excel Reports
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '6px 0 4px', letterSpacing: '-0.7px' }}>
            Excel Report Generator
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
            Configure and export real-time Microsoft Excel spreadsheets (.xlsx / .csv) for inventory auditing, sales ledgers, and procurement.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: 9999 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#107c41' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
            Microsoft Excel Compatible (.xlsx / .csv)
          </span>
        </div>
      </div>

      {/* FEEDBACK NOTICES */}
      {successMessage && (
        <div style={{ padding: '14px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#065f46', fontSize: '0.88rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="check" size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: '0.88rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="warning" size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: CHOOSE REPORT TYPE */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#7044e8', color: '#fff', fontSize: '0.78rem', fontWeight: 800, display: 'grid', placeItems: 'center' }}>
            1
          </span>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Select Excel Report Type
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {reportOptions.map(opt => {
            const isSelected = opt.id === reportType;
            return (
              <div
                key={opt.id}
                onClick={() => setReportType(opt.id)}
                style={{
                  background: '#ffffff',
                  border: isSelected ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 4px 16px rgba(0,0,0,0.08)` : '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isSelected && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 32px 32px 0', borderColor: `transparent ${opt.color} transparent transparent` }}>
                    <span style={{ position: 'absolute', top: 2, right: -28, color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 9,
                      background: `${opt.color}15`,
                      color: opt.color,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon name={opt.icon} size={20} />
                  </div>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: `${opt.color}15`,
                        color: opt.color,
                        marginBottom: 2
                      }}
                    >
                      {opt.badge}
                    </span>
                    <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.3 }}>
                      {opt.title}
                    </strong>
                  </div>
                </div>

                <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                  {opt.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 2: CONFIGURE FILTERS & EXCEL PREVIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.8fr)', gap: 20, alignItems: 'start' }}>
        {/* LEFT: FILTER SETTINGS */}
        <div className="panel" style={{ padding: 22, borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#7044e8', color: '#fff', fontSize: '0.78rem', fontWeight: 800, display: 'grid', placeItems: 'center' }}>
              2
            </span>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Report Filters & Horizon
            </h3>
          </div>

          {/* Timeframe Selector */}
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
            Timeframe / Date Range
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 14 }}>
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'TODAY', label: 'Today Only' },
              { id: 'WEEK', label: 'Last 7 Days' },
              { id: 'MONTH', label: 'Last 30 Days' }
            ].map(tf => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setDateRange(tf.id)}
                style={{
                  padding: '8px 10px',
                  border: dateRange === tf.id ? '1px solid #7044e8' : '1px solid #cbd5e1',
                  background: dateRange === tf.id ? '#f3efff' : '#ffffff',
                  color: dateRange === tf.id ? '#7044e8' : '#475569',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: dateRange === tf.id ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Option */}
          <button
            type="button"
            onClick={() => setDateRange(dateRange === 'CUSTOM' ? 'ALL' : 'CUSTOM')}
            style={{
              width: '100%',
              padding: '7px 10px',
              border: dateRange === 'CUSTOM' ? '1px solid #7044e8' : '1px dashed #cbd5e1',
              background: dateRange === 'CUSTOM' ? '#f3efff' : '#f8fafc',
              color: dateRange === 'CUSTOM' ? '#7044e8' : '#64748b',
              borderRadius: 8,
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 14
            }}
          >
            {dateRange === 'CUSTOM' ? '✓ Custom Date Range Active' : '+ Specify Custom Date Range'}
          </button>

          {dateRange === 'CUSTOM' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginBottom: 4 }}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 6, padding: '0 8px', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginBottom: 4 }}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 6, padding: '0 8px', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          )}

          {/* Format Selection */}
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
            Spreadsheet Format
          </label>
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>📊</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.82rem', color: '#0f172a' }}>Microsoft Excel Format (.csv / .xlsx)</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Includes UTF-8 BOM encoding for seamless Excel opening</span>
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#107c41', background: '#dcfce7', padding: '2px 8px', borderRadius: 5 }}>
              Active
            </span>
          </div>

          {/* MAIN DOWNLOAD BUTTON */}
          <button
            onClick={handleGenerateExcel}
            disabled={downloading || loadingData}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: '#107c41', // Signature Excel Green
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 4px 14px rgba(16, 124, 65, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#0e6b37'}
            onMouseLeave={e => e.currentTarget.style.background = '#107c41'}
          >
            <Icon name="reports" size={18} />
            <span>{downloading ? 'Compiling Excel Spreadsheet...' : 'Generate & Download Excel Sheet'}</span>
          </button>
        </div>

        {/* RIGHT: LIVE EXCEL PREVIEW BOX */}
        <div className="panel" style={{ padding: 22, borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#7044e8', color: '#fff', fontSize: '0.78rem', fontWeight: 800, display: 'grid', placeItems: 'center' }}>
                3
              </span>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Excel Worksheet Output Preview
              </h3>
            </div>

            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Estimated: <b>{estimatedRecords} records</b>
            </span>
          </div>

          {/* File Meta Strip */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Target Worksheet</span>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{currentReport.title.split(' ')[0]} Master</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Row Count</span>
              <strong style={{ fontSize: '0.85rem', color: '#107c41' }}>{estimatedRecords} Data Rows</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Column Count</span>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{currentReport.columns.length} Columns</strong>
            </div>
          </div>

          {/* Column Structure List */}
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            Worksheet Header Columns ({currentReport.columns.length})
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {currentReport.columns.map((col, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#334155'
                }}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Mock Excel Table Visualizer */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#107c41', color: '#ffffff', padding: '8px 12px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📊 Microsoft Excel Sheet Preview</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>• {currentReport.columns.length} Fields</span>
            </div>
            <div style={{ overflowX: 'auto', background: '#fafbfc' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    {currentReport.columns.slice(0, 5).map((col, i) => (
                      <th key={i} style={{ padding: '8px 12px', color: '#334155', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                    {currentReport.columns.length > 5 && (
                      <th style={{ padding: '8px 12px', color: '#94a3b8', fontStyle: 'italic' }}>
                        +{currentReport.columns.length - 5} more columns...
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>Row #1</td>
                    <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>Sample Product Data</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>SKU-890123</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>General</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>₹120.00</td>
                    {currentReport.columns.length > 5 && <td style={{ padding: '8px 12px', color: '#94a3b8' }}>...</td>}
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>Row #2</td>
                    <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>Sample Product Data</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>SKU-890124</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>Noodles</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>₹45.00</td>
                    {currentReport.columns.length > 5 && <td style={{ padding: '8px 12px', color: '#94a3b8' }}>...</td>}
                  </tr>
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <td style={{ padding: '8px 12px', color: '#107c41' }}>TOTAL</td>
                    <td style={{ padding: '8px 12px', color: '#107c41' }}>Summary Totals</td>
                    <td style={{ padding: '8px 12px' }}>—</td>
                    <td style={{ padding: '8px 12px' }}>—</td>
                    <td style={{ padding: '8px 12px', color: '#107c41' }}>Sum calculated</td>
                    {currentReport.columns.length > 5 && <td style={{ padding: '8px 12px', color: '#94a3b8' }}>...</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}