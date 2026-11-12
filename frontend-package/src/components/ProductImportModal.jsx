import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Icon from './Icon';
import './ProductImportModal.css';

const LOCAL_STORAGE_MAPPING_KEY = 'hybrid_inventory_last_column_mapping';

const LOGICAL_FIELDS = [
  { key: 'barcode', label: 'Barcode', required: true, description: 'Unique identifier / SKU' },
  { key: 'productName', label: 'Product Name', required: true, description: 'Maps to product_name and name' },
  { key: 'costPrice', label: 'Cost Price', required: true, description: 'Maps to cost_price and purchase_price' },
  { key: 'sellingPrice', label: 'Selling Price', required: true, description: 'Retail price' },
  { key: 'quantity', label: 'Stock Quantity', required: true, description: 'Maps to stock_quantity and quantity' },
  { key: 'minimumStockLevel', label: 'Minimum Stock Level', required: true, description: 'Maps to min_stock_threshold & minimum_stock_level' },
  { key: 'category', label: 'Category', required: false, description: 'Product classification' },
  { key: 'supplier', label: 'Supplier', required: false, description: 'Vendor / distributor' },
  { key: 'adminEmail', label: 'Admin Email', required: false, description: 'Alert recipient' },
  { key: 'managerEmail', label: 'Manager Email', required: false, description: 'Store manager alert email' }
];

export default function ProductImportModal({ isOpen, onClose, onImportSuccess }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Review, 4: Result
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Upload/Preview State
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [fileColumns, setFileColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [allParsedRows, setAllParsedRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);

  // Mapping State
  const [mapping, setMapping] = useState({});
  const [defaultMinStock, setDefaultMinStock] = useState(0);
  const [autoGenBarcodes, setAutoGenBarcodes] = useState(false);
  const [rememberMapping, setRememberMapping] = useState(true);

  // Validation State
  const [validationResult, setValidationResult] = useState(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState('SKIP'); // SKIP, UPDATE, ADD_STOCK

  // Result State
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setStep(1);
      setFile(null);
      setError('');
      setSheetNames([]);
      setSelectedSheet('');
      setFileColumns([]);
      setPreviewRows([]);
      setAllParsedRows([]);
      setMapping({});
      setValidationResult(null);
      setImportResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // =========================================================================
  // STEP 1: FILE UPLOAD & PARSE
  // =========================================================================

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    const validExtensions = ['.csv', '.xlsx', '.xls', '.xlsm'];
    const isValid = validExtensions.some(ext => name.endsWith(ext));

    if (!isValid) {
      setError(`Unsupported file format. Please upload a .csv, .xlsx, .xls, or .xlsm file.`);
      return;
    }

    setFile(selectedFile);
    setError('');
    await uploadAndParseFile(selectedFile, null);
  };

  const uploadAndParseFile = async (f, sheet) => {
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', f);
    if (sheet) {
      formData.append('sheetName', sheet);
    }

    try {
      const res = await api.post('/products/import/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data;
      setSheetNames(data.sheetNames || []);
      setSelectedSheet(data.selectedSheet || '');
      setFileColumns(data.columns || []);
      setPreviewRows(data.previewRows || []);
      setAllParsedRows(data.allRows || []);
      setTotalRows(data.totalRows || 0);

      // Restore saved mapping or use backend suggested mapping
      let initialMapping = data.suggestedMapping || {};
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_MAPPING_KEY);
        if (saved) {
          const parsedSaved = JSON.parse(saved);
          // Check if saved mapping columns exist in this file
          const validSavedMapping = {};
          Object.entries(parsedSaved).forEach(([field, col]) => {
            if (data.columns.includes(col)) {
              validSavedMapping[field] = col;
            }
          });
          initialMapping = { ...initialMapping, ...validSavedMapping };
        }
      } catch (err) {
        console.warn('Error reading stored mapping:', err);
      }

      setMapping(initialMapping);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to read uploaded file.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = async (e) => {
    const newSheet = e.target.value;
    setSelectedSheet(newSheet);
    if (file) {
      await uploadAndParseFile(file, newSheet);
    }
  };

  // =========================================================================
  // STEP 2: MAPPING CONFIRMATION & VALIDATION CHECK
  // =========================================================================

  const handleMappingChange = (logicalField, fileCol) => {
    const updated = { ...mapping };
    if (!fileCol || fileCol === '__NONE__') {
      delete updated[logicalField];
    } else {
      updated[logicalField] = fileCol;
    }
    setMapping(updated);
  };

  const validateMappingAndProceed = async () => {
    // Check required fields
    const missing = [];

    if (!mapping.barcode && !autoGenBarcodes) {
      missing.push('Barcode (or check Auto-generate unique barcodes)');
    }
    if (!mapping.productName) missing.push('Product Name');
    if (!mapping.costPrice) missing.push('Cost Price');
    if (!mapping.sellingPrice) missing.push('Selling Price');
    if (!mapping.quantity) missing.push('Stock Quantity');
    if (!mapping.minimumStockLevel && (defaultMinStock === '' || defaultMinStock < 0)) {
      missing.push('Minimum Stock Level (or enter a default value >= 0)');
    }

    if (missing.length > 0) {
      setError(`Please complete the following required mappings: ${missing.join(', ')}`);
      return;
    }

    // Check for duplicate columns mapped to different fields
    const usedCols = new Set();
    for (const [field, col] of Object.entries(mapping)) {
      if (usedCols.has(col)) {
        setError(`Column '${col}' is mapped to multiple fields. Each column can only be mapped once.`);
        return;
      }
      usedCols.add(col);
    }

    setError('');

    // Remember mapping if user opted in
    if (rememberMapping) {
      try {
        localStorage.setItem(LOCAL_STORAGE_MAPPING_KEY, JSON.stringify(mapping));
      } catch (err) {
        console.warn('Failed to save mapping to localStorage', err);
      }
    }

    // Call validation endpoint
    setLoading(true);
    try {
      const res = await api.post('/products/import/validate', {
        rows: allParsedRows,
        columnMapping: mapping,
        defaultMinStockLevel: defaultMinStock !== '' ? Number(defaultMinStock) : 0,
        autoGenerateBarcodes: autoGenBarcodes,
        duplicateStrategy
      });
      setValidationResult(res.data);
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Validation failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // STEP 3: EXECUTE IMPORT
  // =========================================================================

  const executeImport = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/products/import/execute', {
        rows: allParsedRows,
        columnMapping: mapping,
        defaultMinStockLevel: defaultMinStock !== '' ? Number(defaultMinStock) : 0,
        autoGenerateBarcodes: autoGenBarcodes,
        duplicateStrategy
      });

      setImportResult(res.data);
      setStep(4);
      if (onImportSuccess) {
        onImportSuccess(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Import execution failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // DOWNLOAD SKIPPED ROWS CSV
  // =========================================================================

  const downloadSkippedCsv = (skippedList) => {
    if (!skippedList || skippedList.length === 0) return;

    let csvContent = "Row_Number,Barcode,Product_Name,Skip_Reason\r\n";
    skippedList.forEach(item => {
      const rowNum = item.rowNumber || '';
      const bcode = (item.barcode || '').replace(/"/g, '""');
      const pName = (item.productName || '').replace(/"/g, '""');
      const reason = (item.reason || '').replace(/"/g, '""');
      csvContent += `${rowNum},"${bcode}","${pName}","${reason}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'skipped_import_rows.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="import-modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="import-modal">
        {/* Modal Header */}
        <div className="import-header">
          <div>
            <h2><Icon name="upload" size={18} /> Bulk Product Import</h2>
            <p>Import products directly from CSV or Excel files with automatic column mapping.</p>
          </div>
          <button type="button" className="modal-x" onClick={onClose} title="Close">
            <Icon name="close" size={17} />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="import-steps-bar">
          <button className={`import-step-tab ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="step-circle">{step > 1 ? '✓' : '1'}</span>
            1. Upload & Preview
          </button>
          <button className={`import-step-tab ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="step-circle">{step > 2 ? '✓' : '2'}</span>
            2. Map Columns
          </button>
          <button className={`import-step-tab ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <span className="step-circle">{step > 3 ? '✓' : '3'}</span>
            3. Review & Validate
          </button>
          <button className={`import-step-tab ${step === 4 ? 'active' : ''}`}>
            <span className="step-circle">4</span>
            4. Summary
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="import-body">
          {error && (
            <div className="import-error-banner">
              <Icon name="warning" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD & PREVIEW */}
          {step === 1 && (
            <div>
              <div
                className="dropzone"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => document.getElementById('bulk-import-file-input').click()}
              >
                <input
                  id="bulk-import-file-input"
                  type="file"
                  accept=".csv, .xlsx, .xls, .xlsm"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files && handleFileChange(e.target.files[0])}
                />
                <div className="dropzone-icon">
                  <Icon name="upload" size={24} />
                </div>
                <h3>Choose a file or drag & drop here</h3>
                <p>Supports .CSV, .XLSX, .XLS, and .XLSM</p>
                <span className="dropzone-hint">Automatic delimiter detection (comma, semicolon, tab) & UTF-8/Latin-1 encoding support</span>
              </div>

              {file && (
                <div className="file-info-badge">
                  <span><b>Selected File:</b> {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                  <span><b>Total Detected Rows:</b> {totalRows}</span>
                </div>
              )}

              {sheetNames.length > 1 && (
                <div className="sheet-selector">
                  <label><b>Workbook Sheets:</b></label>
                  <select value={selectedSheet} onChange={handleSheetChange}>
                    {sheetNames.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span>Select which sheet to import</span>
                </div>
              )}

              {previewRows.length > 0 && (
                <div className="preview-section">
                  <div className="preview-title">
                    <span>Preview First 10 Rows</span>
                    <small>Showing {previewRows.length} of {totalRows} rows</small>
                  </div>
                  <div className="preview-table-wrap">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          {fileColumns.map(col => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            {fileColumns.map(col => (
                              <td key={col}>{row[col] || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MAP COLUMNS */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: '11px', color: '#687388', marginTop: 0 }}>
                We matched columns using name matching and aliases. Adjust any mapping below to match your file columns.
              </p>

              <div className="mapping-grid">
                {LOGICAL_FIELDS.map(f => {
                  const currentMapped = mapping[f.key] || '__NONE__';
                  return (
                    <div className="mapping-field-card" key={f.key}>
                      <div className="mapping-field-header">
                        <span className="field-label">{f.label}</span>
                        {f.required ? (
                          <span className="field-req">Required</span>
                        ) : (
                          <span className="field-opt">Optional</span>
                        )}
                      </div>
                      <select
                        value={currentMapped}
                        onChange={e => handleMappingChange(f.key, e.target.value)}
                      >
                        <option value="__NONE__">— Select Column (None) —</option>
                        {fileColumns.map(col => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                      <small style={{ fontSize: '9px', color: '#8d98ab' }}>{f.description}</small>
                    </div>
                  );
                })}
              </div>

              {/* Extra fallback options */}
              <div className="mapping-extra-options">
                {!mapping.minimumStockLevel && (
                  <div className="extra-row">
                    <div>
                      <strong>Default Minimum Stock Level:</strong>
                      <div style={{ fontSize: '10px', color: '#7a8599' }}>
                        Applied to all imported rows when no Minimum Stock Level column is mapped.
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={defaultMinStock}
                      onChange={e => setDefaultMinStock(e.target.value)}
                    />
                  </div>
                )}

                {!mapping.barcode && (
                  <div className="extra-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={autoGenBarcodes}
                        onChange={e => setAutoGenBarcodes(e.target.checked)}
                      />
                      <span>Auto-generate unique barcodes for rows with missing barcode</span>
                    </label>
                  </div>
                )}

                <div className="extra-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={rememberMapping}
                      onChange={e => setRememberMapping(e.target.checked)}
                    />
                    <span>Remember this column mapping for future imports</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & VALIDATE */}
          {step === 3 && validationResult && (
            <div>
              <div className="review-stats">
                <div className="review-stat-box">
                  <span>Total Rows</span>
                  <strong>{validationResult.totalRows}</strong>
                </div>
                <div className="review-stat-box success">
                  <span>Valid Rows</span>
                  <strong>{validationResult.validCount}</strong>
                </div>
                <div className="review-stat-box warning">
                  <span>Rows to Skip</span>
                  <strong>{validationResult.skippedCount}</strong>
                </div>
                <div className="review-stat-box purple">
                  <span>Catalog Duplicates</span>
                  <strong>{validationResult.existingBarcodeCount}</strong>
                </div>
              </div>

              {/* Duplicate Handling Strategy */}
              <div className="duplicate-strategy-card">
                <div className="strategy-title">Duplicate Product Handling (by Barcode):</div>
                <div className="strategy-options">
                  <label>
                    <input
                      type="radio"
                      name="dupStrategy"
                      value="SKIP"
                      checked={duplicateStrategy === 'SKIP'}
                      onChange={e => setDuplicateStrategy(e.target.value)}
                    />
                    <span>Skip duplicates (keep catalog unchanged)</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="dupStrategy"
                      value="UPDATE"
                      checked={duplicateStrategy === 'UPDATE'}
                      onChange={e => setDuplicateStrategy(e.target.value)}
                    />
                    <span>Update existing products with file data</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="dupStrategy"
                      value="ADD_STOCK"
                      checked={duplicateStrategy === 'ADD_STOCK'}
                      onChange={e => setDuplicateStrategy(e.target.value)}
                    />
                    <span>Add imported quantity to existing stock</span>
                  </label>
                </div>
              </div>

              {/* Skipped Rows Table */}
              {validationResult.skippedRows && validationResult.skippedRows.length > 0 && (
                <div className="skipped-rows-section">
                  <div className="skipped-rows-header">
                    <span>{validationResult.skippedRows.length} Rows Will Be Skipped</span>
                    <button
                      type="button"
                      className="link-button"
                      style={{ height: '22px', fontSize: '9px', background: '#ffffff' }}
                      onClick={() => downloadSkippedCsv(validationResult.skippedRows)}
                    >
                      <Icon name="download" size={12} /> Download Skipped List
                    </button>
                  </div>
                  <div className="skipped-rows-wrap">
                    <table className="skipped-table">
                      <thead>
                        <tr>
                          <th>Row #</th>
                          <th>Barcode</th>
                          <th>Product Name</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.skippedRows.map((s, idx) => (
                          <tr key={idx}>
                            <td>{s.rowNumber}</td>
                            <td><code>{s.barcode || '—'}</code></td>
                            <td>{s.productName || '—'}</td>
                            <td>{s.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: IMPORT RESULT SUMMARY */}
          {step === 4 && importResult && (
            <div>
              <div className="result-success-banner">
                <div className="result-success-icon">
                  <Icon name="check" size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px' }}>Import Completed Successfully</h3>
                  <p style={{ margin: '3px 0 0', fontSize: '11px', opacity: 0.9 }}>{importResult.message}</p>
                </div>
              </div>

              <div className="result-metrics">
                <div className="metric-card inserted">
                  <span>New Products Inserted</span>
                  <strong>{importResult.insertedCount}</strong>
                </div>
                <div className="metric-card updated">
                  <span>Products Updated</span>
                  <strong>{importResult.updatedCount}</strong>
                </div>
                <div className="metric-card skipped">
                  <span>Rows Skipped</span>
                  <strong>{importResult.skippedCount}</strong>
                </div>
              </div>

              {importResult.skippedDetails && importResult.skippedDetails.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ margin: '0 auto', display: 'inline-flex' }}
                    onClick={() => downloadSkippedCsv(importResult.skippedDetails)}
                  >
                    <Icon name="download" size={14} /> Download Skipped / Failed Rows (CSV)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="import-footer">
          <div>
            {step === 2 && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back to Preview
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                Back to Mapping
              </button>
            )}
          </div>

          <div className="footer-actions">
            {step < 4 ? (
              <button
                type="button"
                className="cancel-button"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            ) : null}

            {step === 1 && (
              <button
                type="button"
                className="primary-button"
                disabled={!file || previewRows.length === 0 || loading}
                onClick={() => {
                  setError('');
                  setStep(2);
                }}
              >
                {loading ? 'Processing...' : 'Next: Map Columns'}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                className="primary-button"
                disabled={loading}
                onClick={validateMappingAndProceed}
              >
                {loading ? 'Validating...' : 'Next: Review & Validate'}
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                className="primary-button"
                disabled={loading || (validationResult && validationResult.validCount === 0)}
                onClick={executeImport}
              >
                {loading ? 'Importing Products...' : `Import ${validationResult?.validCount || 0} Products`}
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                className="primary-button"
                onClick={onClose}
              >
                Done & Refresh Catalog
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
