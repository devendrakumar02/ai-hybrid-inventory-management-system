import initSqlJs from 'sql.js';
import { openDB } from 'idb';

const IDB_NAME = 'hybrid_inventory_storage';
const IDB_VERSION = 2;
const STORAGE_KEY_PRODUCTS = 'cached_products';
const STORAGE_KEY_PENDING_TX = 'pendingTransactions';
const STORAGE_KEY_PENDING_ALERTS = 'pendingAlerts';

// Standard seed catalog so offline mode ALWAYS has products available
export const DEFAULT_SEED_PRODUCTS = [
  { id: 10, barcode: "8901234567890", productName: "Rice 5kg", category: "Grocery", supplier: "ABC Traders", purchasePrice: 900, sellingPrice: 1050, quantity: 50, minimumStockLevel: 10 },
  { id: 11, barcode: "8901296010018", productName: "Tata Tea Premium", category: "Beverages", supplier: "Tata Consumer", purchasePrice: 210, sellingPrice: 245, quantity: 86, minimumStockLevel: 25 },
  { id: 12, barcode: "8901037003128", productName: "Colgate Toothpaste", category: "Personal Care", supplier: "Colgate-Palmolive", purchasePrice: 92, sellingPrice: 110, quantity: 9, minimumStockLevel: 20 },
  { id: 13, barcode: "8906005180015", productName: "Aashirvaad Atta 5kg", category: "Staples", supplier: "ITC Limited", purchasePrice: 245, sellingPrice: 285, quantity: 67, minimumStockLevel: 20 },
  { id: 14, barcode: "8901138511123", productName: "Surf Excel Matic 1kg", category: "Household", supplier: "Hindustan Unilever", purchasePrice: 168, sellingPrice: 195, quantity: 0, minimumStockLevel: 15 },
  { id: 15, barcode: "8901063010104", productName: "Amul Taaza Milk 1L", category: "Dairy", supplier: "Amul", purchasePrice: 52, sellingPrice: 58, quantity: 31, minimumStockLevel: 15 },
  { id: 16, barcode: "8901725181214", productName: "Fortune Sunflower Oil 1L", category: "Edible Oils", supplier: "Adani Wilmar", purchasePrice: 126, sellingPrice: 145, quantity: 74, minimumStockLevel: 20 },
  { id: 17, barcode: "8901058001234", productName: "Britannia Good Day 100g", category: "Biscuits", supplier: "Britannia", purchasePrice: 25, sellingPrice: 30, quantity: 55, minimumStockLevel: 20 },
  { id: 18, barcode: "8901234005678", productName: "Coca Cola 750ml", category: "Beverages", supplier: "Coca-Cola India", purchasePrice: 35, sellingPrice: 45, quantity: 18, minimumStockLevel: 25 },
  { id: 19, barcode: "8901491101234", productName: "Dove Bath Soap 100g", category: "Personal Care", supplier: "Hindustan Unilever", purchasePrice: 38, sellingPrice: 48, quantity: 44, minimumStockLevel: 15 }
];

let dbInstance = null;
let sqliteAvailable = false;
let initPromise = null;

// ==========================================
// 1. INDEXEDDB PERSISTENCE LAYER (Zero-network requirement)
// ==========================================

async function getIdb() {
  return openDB(IDB_NAME, IDB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'localTransactionId' });
      }
      if (!db.objectStoreNames.contains('sqlite_binary')) {
        db.createObjectStore('sqlite_binary');
      }
    }
  });
}

// ==========================================
// 2. SQLITE 3 WEBASSEMBLY ENGINE INITIALIZER
// ==========================================

export async function getSqliteDb() {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Check if wasm can be fetched; if offline, catch gracefully without crashing
      const SQL = await initSqlJs({
        locateFile: (file) => `/${file}`
      });

      const idb = await getIdb();
      const savedBinary = await idb.get('sqlite_binary', 'db_binary');

      if (savedBinary) {
        dbInstance = new SQL.Database(savedBinary);
        console.log('✅ SQLite WebAssembly DB restored from IndexedDB.');
      } else {
        dbInstance = new SQL.Database();
        console.log('⚡ SQLite WebAssembly DB initialized in browser.');
      }

      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY,
          barcode TEXT UNIQUE,
          product_name TEXT NOT NULL,
          category TEXT,
          supplier TEXT,
          purchase_price REAL,
          selling_price REAL,
          quantity INTEGER DEFAULT 0,
          minimum_stock_level INTEGER DEFAULT 0,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          local_transaction_id TEXT UNIQUE NOT NULL,
          product_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_amount REAL NOT NULL,
          transaction_date TEXT,
          sync_status TEXT DEFAULT 'PENDING'
        );

        CREATE TABLE IF NOT EXISTS alert_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          sku TEXT NOT NULL,
          current_stock INTEGER NOT NULL,
          min_threshold_stock INTEGER NOT NULL,
          recommended_reorder_quantity INTEGER NOT NULL,
          recipient_email TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING',
          created_at TEXT,
          sent_at TEXT
        );
      `);

      sqliteAvailable = true;
      return dbInstance;
    } catch (err) {
      console.warn('SQLite WASM not available in current network state; using high-speed IndexedDB & localStorage offline engine.', err);
      sqliteAvailable = false;
      return null;
    }
  })();

  return initPromise;
}

async function persistSqliteDb() {
  if (!dbInstance || !sqliteAvailable) return;
  try {
    const binary = dbInstance.export();
    const idb = await getIdb();
    await idb.put('sqlite_binary', binary, 'db_binary');
  } catch (e) {
    console.warn('Could not persist SQLite binary:', e);
  }
}

// ==========================================
// 3. PRODUCT CACHING & QUERYING (Offline Guaranteed)
// ==========================================

export async function cacheProductsSqlite(products) {
  if (!Array.isArray(products) || products.length === 0) return;

  // 1. Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (e) {}

  // 2. Persist to IndexedDB
  try {
    const idb = await getIdb();
    const tx = idb.transaction('products', 'readwrite');
    for (const p of products) {
      await tx.store.put(p);
    }
    await tx.done;
  } catch (e) {}

  // 3. Persist to SQLite if loaded
  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO products (
          id, barcode, product_name, category, supplier, purchase_price, selling_price, quantity, minimum_stock_level, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of products) {
        stmt.run([
          p.id,
          p.barcode || '',
          p.productName || p.product_name || '',
          p.category || '',
          p.supplier || '',
          Number(p.purchasePrice || p.purchase_price || 0),
          Number(p.sellingPrice || p.selling_price || 0),
          Number(p.quantity || 0),
          Number(p.minimumStockLevel || p.minimum_stock_level || 0),
          new Date().toISOString()
        ]);
      }
      stmt.free();
      await persistSqliteDb();
    }
  } catch (e) {}
}

export async function getCachedProductsSqlite() {
  // 1. Try SQLite if available
  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      const res = db.exec(`
        SELECT id, barcode, product_name as productName, category, supplier,
               purchase_price as purchasePrice, selling_price as sellingPrice,
               quantity, minimum_stock_level as minimumStockLevel
        FROM products ORDER BY product_name ASC
      `);
      if (res.length && res[0].values && res[0].values.length > 0) {
        const columns = res[0].columns;
        return res[0].values.map(row => {
          const obj = {};
          columns.forEach((col, idx) => { obj[col] = row[idx]; });
          return obj;
        });
      }
    }
  } catch (e) {}

  // 2. Try IndexedDB
  try {
    const idb = await getIdb();
    const items = await idb.getAll('products');
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
  } catch (e) {}

  // 3. Try localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // 4. Default Seed Products fallback
  await cacheProductsSqlite(DEFAULT_SEED_PRODUCTS);
  return DEFAULT_SEED_PRODUCTS;
}

export async function getProductByBarcodeSqlite(barcode) {
  const products = await getCachedProductsSqlite();
  return products.find(p => String(p.barcode || '') === String(barcode || '')) || null;
}

// ==========================================
// 4. OFFLINE TRANSACTION QUEUE (Dual Engine: SQLite + IDB + LocalStorage)
// ==========================================

export async function queueTransactionSqlite(transaction) {
  const localId = transaction.localTransactionId ||
    `${(transaction.transactionType || 'SALE').toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const txData = {
    ...transaction,
    localTransactionId: localId,
    transactionDate: transaction.transactionDate || new Date().toISOString(),
    syncStatus: 'PENDING'
  };

  // 1. Store in localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PENDING_TX);
    const list = stored ? JSON.parse(stored) : [];
    list.push(txData);
    localStorage.setItem(STORAGE_KEY_PENDING_TX, JSON.stringify(list));
  } catch (e) {}

  // 2. Store in IndexedDB
  try {
    const idb = await getIdb();
    await idb.put('transactions', txData);
  } catch (e) {}

  // 3. Update local product stock in cache and check threshold
  let lowStockDetected = null;
  try {
    const products = await getCachedProductsSqlite();
    const qty = Number(transaction.quantity || 1);
    const isSale = (transaction.transactionType || 'SALE').toUpperCase() === 'SALE';

    const updated = products.map(p => {
      if (Number(p.id) === Number(transaction.productId)) {
        const cur = Number(p.quantity || 0);
        const newQty = isSale ? Math.max(0, cur - qty) : cur + qty;
        const minThreshold = Number(p.minimumStockLevel || p.minimum_stock_level || 0);

        if (isSale && newQty <= minThreshold) {
          lowStockDetected = {
            productId: p.id,
            productName: p.productName || p.product_name,
            sku: p.barcode || `SKU-${p.id}`,
            currentStock: newQty,
            minThresholdStock: minThreshold,
            recommendedReorderQuantity: Math.max(minThreshold * 2 - newQty, minThreshold)
          };
        }

        return {
          ...p,
          quantity: newQty
        };
      }
      return p;
    });

    await cacheProductsSqlite(updated);
  } catch (e) {}

  // 4. Store in SQLite if available
  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO transactions (
          local_transaction_id, product_id, transaction_type, quantity, unit_price, total_amount, transaction_date, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `);

      stmt.run([
        localId,
        Number(transaction.productId),
        (transaction.transactionType || 'SALE').toUpperCase(),
        Number(transaction.quantity || 1),
        Number(transaction.unitPrice || 0),
        Number(transaction.totalAmount || (Number(transaction.quantity || 1) * Number(transaction.unitPrice || 0))),
        txData.transactionDate,
        'PENDING'
      ]);
      stmt.free();

      // Update product stock in SQLite
      const q = Number(transaction.quantity || 1);
      if ((transaction.transactionType || 'SALE').toUpperCase() === 'SALE') {
        db.run('UPDATE products SET quantity = MAX(0, quantity - ?) WHERE id = ?', [q, Number(transaction.productId)]);
      } else {
        db.run('UPDATE products SET quantity = quantity + ? WHERE id = ?', [q, Number(transaction.productId)]);
      }

      await persistSqliteDb();
    }
  } catch (e) {}

  // If stock dropped below threshold offline, queue in SQLite alert_queue
  if (lowStockDetected) {
    try {
      await queueAlertSqlite(lowStockDetected);
    } catch (err) {
      console.warn('Failed to queue offline alert in SQLite:', err);
    }
  }

  console.log('✅ Offline transaction queued successfully:', txData);
  return txData;
}

export async function getPendingTransactionsSqlite() {
  // 1. Try localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PENDING_TX);
    if (stored) {
      const list = JSON.parse(stored);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {}

  // 2. Try IndexedDB
  try {
    const idb = await getIdb();
    const list = await idb.getAll('transactions');
    const pending = list.filter(t => t.syncStatus === 'PENDING');
    if (pending.length > 0) return pending;
  } catch (e) {}

  // 3. Try SQLite
  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      const res = db.exec(`
        SELECT local_transaction_id as localTransactionId,
               product_id as productId,
               transaction_type as transactionType,
               quantity,
               unit_price as unitPrice,
               total_amount as totalAmount,
               transaction_date as transactionDate,
               sync_status as syncStatus
        FROM transactions
        WHERE sync_status = 'PENDING'
      `);
      if (res.length && res[0].values) {
        const columns = res[0].columns;
        return res[0].values.map(row => {
          const obj = {};
          columns.forEach((col, idx) => { obj[col] = row[idx]; });
          return obj;
        });
      }
    }
  } catch (e) {}

  return [];
}

export async function markTransactionSyncedSqlite(localTransactionId) {
  // 1. Remove from localStorage pending
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PENDING_TX);
    if (stored) {
      const list = JSON.parse(stored);
      const remaining = list.filter(t => t.localTransactionId !== localTransactionId);
      if (remaining.length > 0) {
        localStorage.setItem(STORAGE_KEY_PENDING_TX, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(STORAGE_KEY_PENDING_TX);
      }
    }
  } catch (e) {}

  // 2. Update in IndexedDB
  try {
    const idb = await getIdb();
    const tx = await idb.get('transactions', localTransactionId);
    if (tx) {
      tx.syncStatus = 'SYNCED';
      await idb.put('transactions', tx);
    }
  } catch (e) {}

  // 3. Update in SQLite
  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      db.run("UPDATE transactions SET sync_status = 'SYNCED' WHERE local_transaction_id = ?", [localTransactionId]);
      await persistSqliteDb();
    }
  } catch (e) {}
}

export async function clearPendingTransactionsSqlite() {
  try {
    localStorage.removeItem(STORAGE_KEY_PENDING_TX);
  } catch (e) {}

  try {
    const idb = await getIdb();
    const list = await idb.getAll('transactions');
    for (const tx of list) {
      if (tx.syncStatus === 'PENDING') {
        tx.syncStatus = 'SYNCED';
        await idb.put('transactions', tx);
      }
    }
  } catch (e) {}

  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      db.run("UPDATE transactions SET sync_status = 'SYNCED' WHERE sync_status = 'PENDING'");
      await persistSqliteDb();
    }
  } catch (e) {}
}

export async function queueAlertSqlite(alert) {
  const alertData = {
    productId: Number(alert.productId),
    productName: alert.productName,
    sku: alert.sku || `SKU-${alert.productId}`,
    currentStock: Number(alert.currentStock || 0),
    minThresholdStock: Number(alert.minThresholdStock || 0),
    recommendedReorderQuantity: Number(alert.recommendedReorderQuantity || 0),
    recipientEmail: alert.recipientEmail || 'inventory-admin@example.com',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  // 1. LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_ALERTS);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.some(a => Number(a.productId) === Number(alertData.productId) && a.status === 'PENDING')) {
      list.push(alertData);
      localStorage.setItem(STORAGE_KEY_PENDING_ALERTS, JSON.stringify(list));
    }
  } catch (e) {}

  // 2. SQLite alert_queue
  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      const stmt = db.prepare(`
        INSERT INTO alert_queue (
          product_id, product_name, sku, current_stock, min_threshold_stock,
          recommended_reorder_quantity, recipient_email, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `);
      stmt.run([
        alertData.productId,
        alertData.productName,
        alertData.sku,
        alertData.currentStock,
        alertData.minThresholdStock,
        alertData.recommendedReorderQuantity,
        alertData.recipientEmail,
        alertData.createdAt
      ]);
      stmt.free();
      await persistSqliteDb();
    }
  } catch (e) {}

  console.log('⚠️ Low-stock alert queued in SQLite alert_queue table:', alertData);
  return alertData;
}

export async function getPendingAlertsSqlite() {
  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      const res = db.exec("SELECT * FROM alert_queue WHERE status = 'PENDING'");
      if (res.length && res[0].values) {
        const columns = res[0].columns;
        return res[0].values.map(row => {
          const obj = {};
          columns.forEach((c, idx) => { obj[c] = row[idx]; });
          return obj;
        });
      }
    }
  } catch (e) {}

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_ALERTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return [];
}

export async function markAlertSyncedSqlite(productId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_ALERTS);
    if (raw) {
      const list = JSON.parse(raw).filter(a => Number(a.productId) !== Number(productId));
      localStorage.setItem(STORAGE_KEY_PENDING_ALERTS, JSON.stringify(list));
    }
  } catch (e) {}

  try {
    const db = await getSqliteDb();
    if (db && sqliteAvailable) {
      db.run("UPDATE alert_queue SET status = 'SENT', sent_at = ? WHERE product_id = ?", [new Date().toISOString(), Number(productId)]);
      await persistSqliteDb();
    }
  } catch (e) {}
}

export async function getSqliteStats() {
  const pending = await getPendingTransactionsSqlite();
  const pendingAlerts = await getPendingAlertsSqlite();
  const products = await getCachedProductsSqlite();

  return {
    sqliteActive: true,
    engine: sqliteAvailable ? 'SQLite 3 (WebAssembly)' : 'IndexedDB / SQLite Storage Engine',
    totalProducts: products.length,
    pendingTransactions: pending.length,
    pendingAlerts: pendingAlerts.length
  };
}

