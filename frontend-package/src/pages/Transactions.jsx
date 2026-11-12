import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';
import { useNavigate } from 'react-router-dom';

export default function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, SALE, PURCHASE
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH
  const [sortBy, setSortBy] = useState('NEWEST'); // NEWEST, OLDEST, HIGHEST_AMOUNT, HIGHEST_QTY

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [txRes, prodRes] = await Promise.allSettled([
        api.get('/transactions'),
        api.get('/products')
      ]);

      const txList = txRes.status === 'fulfilled' && Array.isArray(txRes.value.data)
        ? txRes.value.data
        : [];
      setTransactions(txList);

      const prodList = prodRes.status === 'fulfilled' && Array.isArray(prodRes.value.data)
        ? prodRes.value.data
        : [];
      setProducts(prodList);
    } catch (err) {
      console.error('Error loading transactions ledger:', err);
      setError('Unable to load transaction records from server.');
    } finally {
      setLoading(false);
    }
  };

  // Product lookup dictionary: productId -> Product Object
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      map.set(String(p.id), p);
    });
    return map;
  }, [products]);

  // Enriched transactions with actual Product Name
  const enrichedTransactions = useMemo(() => {
    return transactions.map(t => {
      const prod = productMap.get(String(t.productId));
      return {
        ...t,
        productName: prod?.productName || `Product #${t.productId}`,
        category: prod?.category || 'General',
        barcode: prod?.barcode || '',
        formattedDate: t.transactionDate ? new Date(t.transactionDate).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : 'Recent'
      };
    });
  }, [transactions, productMap]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let list = [...enrichedTransactions];

    // 1. Type filter
    if (typeFilter !== 'ALL') {
      list = list.filter(t => String(t.transactionType).toUpperCase() === typeFilter);
    }

    // 2. Date filter
    if (dateFilter !== 'ALL') {
      const now = new Date();
      list = list.filter(t => {
        if (!t.transactionDate) return true;
        const d = new Date(t.transactionDate);
        if (dateFilter === 'TODAY') {
          return d.toDateString() === now.toDateString();
        } else if (dateFilter === 'WEEK') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return d >= sevenDaysAgo;
        } else if (dateFilter === 'MONTH') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return d >= thirtyDaysAgo;
        }
        return true;
      });
    }

    // 3. Search query (Product Name, Barcode, Category, or Invoice ID)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(t =>
        t.productName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.barcode && t.barcode.toLowerCase().includes(q)) ||
        String(t.id).includes(q) ||
        (t.localTransactionId && t.localTransactionId.toLowerCase().includes(q))
      );
    }

    // 4. Sort
    list.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return (new Date(b.transactionDate || 0)) - (new Date(a.transactionDate || 0)) || (b.id - a.id);
      } else if (sortBy === 'OLDEST') {
        return (new Date(a.transactionDate || 0)) - (new Date(b.transactionDate || 0)) || (a.id - b.id);
      } else if (sortBy === 'HIGHEST_AMOUNT') {
        return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      } else if (sortBy === 'HIGHEST_QTY') {
        return Number(b.quantity || 0) - Number(a.quantity || 0);
      }
      return 0;
    });

    return list;
  }, [enrichedTransactions, typeFilter, dateFilter, search, sortBy]);

  // Aggregated Summary Stats
  const stats = useMemo(() => {
    let salesTotal = 0;
    let purchasesTotal = 0;
    let salesUnits = 0;
    let purchaseUnits = 0;

    transactions.forEach(t => {
      const amount = Number(t.totalAmount || 0);
      const qty = Number(t.quantity || 0);
      if (t.transactionType === 'SALE') {
        salesTotal += amount;
        salesUnits += qty;
      } else if (t.transactionType === 'PURCHASE') {
        purchasesTotal += amount;
        purchaseUnits += qty;
      }
    });

    return {
      totalCount: transactions.length,
      salesTotal,
      purchasesTotal,
      salesUnits,
      purchaseUnits
    };
  }, [transactions]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Adjust page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <section className="transactions-page" style={{ paddingBottom: '40px' }}>
      {/* PAGE HEADER */}
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="breadcrumb">
            Inventory <Icon name="chevronRight" size={13} /> Transactions Ledger
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '6px 0 4px', letterSpacing: '-0.7px' }}>
            Inventory Transactions & Audit Ledger
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
            Chronological audit ledger of all sales checkouts, supplier purchase procurements, and inventory adjustments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="secondary-button"
            style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}
            onClick={loadData}
            title="Refresh transaction records"
          >
            <Icon name="sync" size={15} /> Refresh
          </button>
          <button
            className="primary-button"
            onClick={() => navigate('/reports')}
            title="Export full transaction ledger to Microsoft Excel"
          >
            <Icon name="reports" size={15} /> Export to Excel
          </button>
        </div>
      </div>

      {/* STATS RIBBON */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon purple"><Icon name="transactions" size={20} /></div>
          <div className="stat-main">
            <span>Total Transactions</span>
            <strong>{stats.totalCount.toLocaleString()}</strong>
            <small>All recorded transactions</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green"><Icon name="sales" size={20} /></div>
          <div className="stat-main">
            <span>Total Sales Revenue</span>
            <strong style={{ color: '#15803d' }}>₹{stats.salesTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            <small>{stats.salesUnits.toLocaleString()} units sold</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue"><Icon name="purchases" size={20} /></div>
          <div className="stat-main">
            <span>Total Purchases</span>
            <strong style={{ color: '#2563eb' }}>₹{stats.purchasesTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            <small>{stats.purchaseUnits.toLocaleString()} units restocked</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange"><Icon name="boxes" size={20} /></div>
          <div className="stat-main">
            <span>Net Turnover</span>
            <strong>{(stats.salesUnits + stats.purchaseUnits).toLocaleString()}</strong>
            <small>Total units moved</small>
          </div>
        </div>
      </div>

      {/* MAIN DATA PANEL */}
      <div className="panel" style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)', border: '1px solid #e2e8f0' }}>
        {/* TOOLBAR */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#fafbfc' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px', height: 38, flex: 1, minWidth: 260 }}>
            <Icon name="search" size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by Product Name, SKU, or Invoice ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%', color: '#0f172a' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills: Type */}
          <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: '3px', borderRadius: 8 }}>
            <button
              onClick={() => { setTypeFilter('ALL'); setCurrentPage(1); }}
              style={{
                border: 'none',
                background: typeFilter === 'ALL' ? '#ffffff' : 'transparent',
                color: typeFilter === 'ALL' ? '#7044e8' : '#64748b',
                fontWeight: typeFilter === 'ALL' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: typeFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              All Types
            </button>
            <button
              onClick={() => { setTypeFilter('SALE'); setCurrentPage(1); }}
              style={{
                border: 'none',
                background: typeFilter === 'SALE' ? '#ffffff' : 'transparent',
                color: typeFilter === 'SALE' ? '#16a34a' : '#64748b',
                fontWeight: typeFilter === 'SALE' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: typeFilter === 'SALE' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Sales Only
            </button>
            <button
              onClick={() => { setTypeFilter('PURCHASE'); setCurrentPage(1); }}
              style={{
                border: 'none',
                background: typeFilter === 'PURCHASE' ? '#ffffff' : 'transparent',
                color: typeFilter === 'PURCHASE' ? '#2563eb' : '#64748b',
                fontWeight: typeFilter === 'PURCHASE' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                boxShadow: typeFilter === 'PURCHASE' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Purchases Only
            </button>
          </div>

          {/* Date Range Selector */}
          <select
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
            style={{ height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontSize: '0.8rem', background: '#fff', color: '#334155', outline: 'none' }}
          >
            <option value="ALL">All Time Periods</option>
            <option value="TODAY">Today Only</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontSize: '0.8rem', background: '#fff', color: '#334155', outline: 'none' }}
          >
            <option value="NEWEST">Date: Newest First</option>
            <option value="OLDEST">Date: Oldest First</option>
            <option value="HIGHEST_AMOUNT">Amount: Highest First</option>
            <option value="HIGHEST_QTY">Quantity: Highest First</option>
          </select>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div style={{ padding: '16px 20px', background: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #fee2e2' }}>
            <Icon name="warning" size={16} /> {error}
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <div className="forecast-spinner" style={{ margin: '0 auto 12px' }} />
            <strong style={{ display: 'block', fontSize: '1rem', color: '#0f172a' }}>Loading Transactions Ledger...</strong>
            <span style={{ fontSize: '0.85rem' }}>Fetching real-time records and catalog associations.</span>
          </div>
        )}

        {/* TRANSACTIONS TABLE */}
        {!loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  <th style={{ padding: '12px 18px', width: '90px' }}>Invoice #</th>
                  <th style={{ padding: '12px 18px' }}>Product Name</th>
                  <th style={{ padding: '12px 18px', width: '110px' }}>Type</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', width: '90px' }}>Quantity</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', width: '110px' }}>Unit Price</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', width: '120px' }}>Total Amount</th>
                  <th style={{ padding: '12px 18px', width: '160px' }}>Transaction Date</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center', width: '90px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      <Icon name="receipt" size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: '#475569' }}>No matching transactions found</strong>
                      <span style={{ fontSize: '0.82rem' }}>Try adjusting your search query or filters.</span>
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t, idx) => {
                    const isSale = t.transactionType === 'SALE';
                    return (
                      <tr
                        key={t.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                          fontSize: '0.88rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fbfaff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* 1. INVOICE ID */}
                        <td style={{ padding: '13px 18px', color: '#64748b', fontWeight: 600, fontSize: '0.82rem' }}>
                          #{String(t.id).padStart(4, '0')}
                        </td>

                        {/* 2. PRODUCT NAME (SHOWS PRODUCT NAME INSTEAD OF LOCAL ID!) */}
                        <td style={{ padding: '13px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 7,
                                background: isSale ? '#f0fdf4' : '#eff6ff',
                                color: isSale ? '#16a34a' : '#2563eb',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                flexShrink: 0
                              }}
                            >
                              {isSale ? 'S' : 'P'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.productName}
                              </strong>
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                {t.category} {t.barcode ? `• SKU: ${t.barcode}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. TYPE BADGE */}
                        <td style={{ padding: '13px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              letterSpacing: '0.3px',
                              background: isSale ? '#dcfce7' : '#dbeafe',
                              color: isSale ? '#15803d' : '#1e40af'
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                            {isSale ? 'SALE' : 'PURCHASE'}
                          </span>
                        </td>

                        {/* 4. QUANTITY */}
                        <td style={{ padding: '13px 18px', textAlign: 'right', fontWeight: 700, color: isSale ? '#dc2626' : '#16a34a' }}>
                          {isSale ? `-${t.quantity}` : `+${t.quantity}`} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>units</span>
                        </td>

                        {/* 5. UNIT PRICE */}
                        <td style={{ padding: '13px 18px', textAlign: 'right', color: '#475569', fontSize: '0.85rem' }}>
                          ₹{Number(t.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 6. TOTAL AMOUNT */}
                        <td style={{ padding: '13px 18px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                          ₹{Number(t.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 7. TRANSACTION DATE */}
                        <td style={{ padding: '13px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                          {t.formattedDate}
                        </td>

                        {/* 8. SYNC STATUS */}
                        <td style={{ padding: '13px 18px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 5,
                              background: '#f1f5f9',
                              color: '#475569'
                            }}
                          >
                            {t.syncStatus || 'SYNCED'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {!loading && filteredTransactions.length > 0 && (
          <div style={{ padding: '14px 20px', background: '#fafbfc', borderTop: '1px solid #edf0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Showing <b>{Math.min(filteredTransactions.length, (currentPage - 1) * pageSize + 1)}</b> to <b>{Math.min(filteredTransactions.length, currentPage * pageSize)}</b> of <b>{filteredTransactions.length}</b> transactions
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Page Size Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#64748b' }}>
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  style={{ height: 28, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.8rem', background: '#fff', outline: 'none' }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Next Buttons */}
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  height: 30,
                  padding: '0 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: '#fff',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.45 : 1,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569'
                }}
              >
                Previous
              </button>

              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', padding: '0 6px' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  height: 30,
                  padding: '0 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: '#fff',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.45 : 1,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
