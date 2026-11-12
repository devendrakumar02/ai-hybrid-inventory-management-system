import {
  cacheProductsSqlite,
  getCachedProductsSqlite,
  queueTransactionSqlite,
  getPendingTransactionsSqlite,
  markTransactionSyncedSqlite,
  getSqliteStats,
  getProductByBarcodeSqlite
} from './sqliteStorage';

export async function cacheProducts(products) {
  return cacheProductsSqlite(products);
}

export async function getCachedProducts() {
  return getCachedProductsSqlite();
}

export async function queueTransaction(t) {
  return queueTransactionSqlite(t);
}

export async function getQueue() {
  return getPendingTransactionsSqlite();
}

export async function removeQueued(id) {
  return markTransactionSyncedSqlite(id);
}

export async function getOfflineStats() {
  return getSqliteStats();
}

export async function getProductByBarcodeOffline(code) {
  return getProductByBarcodeSqlite(code);
}
