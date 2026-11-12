import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";

import { api } from "../services/api";
import {
  queueTransactionSqlite,
  getPendingTransactionsSqlite,
  markTransactionSyncedSqlite,
  clearPendingTransactionsSqlite,
  getSqliteStats,
  cacheProductsSqlite
} from "../utils/sqliteStorage";

const ConnectivityContext = createContext(null);

export function ConnectivityProvider({ children }) {
  const [online, setOnline] = useState(false);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [checking, setChecking] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sqliteStats, setSqliteStats] = useState(null);

  // ==========================================
  // UPDATE PENDING COUNT FROM SQLITE
  // ==========================================
  const updatePendingCount = useCallback(async () => {
    try {
      const pendingTxs = await getPendingTransactionsSqlite();
      setPending(pendingTxs.length);

      const stats = await getSqliteStats();
      setSqliteStats(stats);
      return pendingTxs.length;
    } catch (error) {
      console.warn("Could not read pending count from SQLite:", error);
      return 0;
    }
  }, []);

  // ==========================================
  // CHECK BACKEND CONNECTION
  // ==========================================
  const checkConnection = useCallback(async () => {
    if (simulatedOffline || !navigator.onLine) {
      setOnline(false);
      setChecking(false);
      return false;
    }

    try {
      const response = await api.get("/products", { timeout: 3500 });
      setOnline(true);
      setChecking(false);

      // Auto-cache essential products to local SQLite storage
      if (Array.isArray(response.data) && response.data.length > 0) {
        cacheProductsSqlite(response.data).catch(() => {});
      }

      return true;
    } catch (error) {
      setOnline(false);
      setChecking(false);
      return false;
    }
  }, [simulatedOffline]);

  // ==========================================
  // TOGGLE OFFLINE SIMULATION MODE
  // ==========================================
  const toggleOfflineMode = useCallback(async () => {
    setSimulatedOffline((prev) => {
      const next = !prev;
      if (next) {
        console.log("Simulated Offline Mode ACTIVATED (SQLite local storage active)");
        setOnline(false);
      } else {
        console.log("Simulated Offline Mode DEACTIVATED (Checking Spring Boot & syncing to MySQL...)");
        setTimeout(async () => {
          const connected = await checkConnection();
          if (connected) {
            await sync();
          }
        }, 100);
      }
      return next;
    });
  }, [checkConnection]);

  // ==========================================
  // ADD OFFLINE TRANSACTION TO SQLITE
  // ==========================================
  const addPendingTransaction = useCallback(
    async (transaction) => {
      try {
        const queued = await queueTransactionSqlite(transaction);
        await updatePendingCount();
        console.log("Offline transaction stored in SQLite with status 'PENDING':", queued);
        return true;
      } catch (error) {
        console.error("Failed to store transaction in SQLite:", error);
        return false;
      }
    },
    [updatePendingCount]
  );

  // ==========================================
  // SYNC PENDING TRANSACTIONS TO CENTRAL MYSQL
  // ==========================================
  const sync = useCallback(async () => {
    if (syncing) return;
    if (simulatedOffline || !navigator.onLine) {
      setOnline(false);
      return;
    }

    let pendingTransactions = [];
    try {
      pendingTransactions = await getPendingTransactionsSqlite();
    } catch (e) {
      return;
    }

    if (pendingTransactions.length === 0) {
      setPending(0);
      return;
    }

    setSyncing(true);
    console.log(`Starting synchronization: transferring ${pendingTransactions.length} pending transaction(s) to central MySQL database...`);

    try {
      // 1. Verify backend availability & load catalog
      const prodsRes = await api.get("/products", { timeout: 3500 });
      setOnline(true);
      const availableProds = Array.isArray(prodsRes.data) ? prodsRes.data : [];

      // 2. Transfer each pending transaction to central database
      for (const tx of pendingTransactions) {
        try {
          // Resolve product ID: if offline ID doesn't exist in MySQL, find match or map to valid product
          let targetProductId = Number(tx.productId);
          if (availableProds.length > 0) {
            const exists = availableProds.some(p => Number(p.id) === targetProductId);
            if (!exists) {
              const match = availableProds.find(p =>
                (tx.barcode && p.barcode === tx.barcode) ||
                (tx.productName && p.productName && p.productName.toLowerCase() === tx.productName.toLowerCase())
              );
              targetProductId = match ? match.id : availableProds[0].id;
              console.log(`Mapped offline transaction #${tx.localTransactionId}: product ID ${tx.productId} -> ${targetProductId}`);
            }
          }

          const payload = {
            localTransactionId: tx.localTransactionId,
            productId: targetProductId,
            transactionType: tx.transactionType,
            quantity: Number(tx.quantity),
            unitPrice: Number(tx.unitPrice)
          };

          await api.post("/transactions", payload);
          // Mark as SYNCED in local SQLite
          await markTransactionSyncedSqlite(tx.localTransactionId);
          console.log(`Transaction ${tx.localTransactionId} transferred & marked 'SYNCED' in SQLite.`);
        } catch (err) {
          console.error(`Failed to transfer transaction ${tx.localTransactionId}:`, err);
          // If server rejects with client error (4xx: already processed, not found, or unresolvable), mark synced to prevent infinite loop
          if (err.response && (err.response.status === 400 || err.response.status === 404 || err.response.status === 409)) {
            console.warn(`Unresolvable or duplicate offline transaction #${tx.localTransactionId} marked as synced.`);
            await markTransactionSyncedSqlite(tx.localTransactionId);
          }
        }
      }

      // 3. Process any pending low-stock email alerts on backend
      try {
        await api.post("/alerts/process-pending");
      } catch (alertErr) {
        // Ignored if SMTP is not yet configured
      }

      await updatePendingCount();
    } catch (error) {
      console.error("Synchronization network error:", error);
      setOnline(false);
    } finally {
      setSyncing(false);
    }
  }, [syncing, updatePendingCount]);

  // ==========================================
  // INITIAL CHECK & RESTORE
  // ==========================================
  useEffect(() => {
    const initialize = async () => {
      await updatePendingCount();
      const connected = await checkConnection();
      if (connected) {
        await sync();
      }
    };
    initialize();
  }, [checkConnection, sync, updatePendingCount]);

  // ==========================================
  // BROWSER ONLINE / OFFLINE EVENT LISTENERS
  // ==========================================
  useEffect(() => {
    const handleOffline = () => {
      console.log("Network disconnected: System switched to Offline Mode (SQLite Local Storage active).");
      setOnline(false);
    };

    const handleOnline = async () => {
      console.log("Network connectivity restored: Checking central server & transferring SQLite pending transactions...");
      setTimeout(async () => {
        const connected = await checkConnection();
        if (connected) {
          await sync();
        }
      }, 1000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkConnection, sync]);

  // ==========================================
  // PERIODIC SYNC & HEARTBEAT CHECK
  // ==========================================
  useEffect(() => {
    const interval = setInterval(async () => {
      const connected = await checkConnection();
      if (connected) {
        const count = await updatePendingCount();
        if (count > 0) {
          await sync();
        }
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [checkConnection, sync, updatePendingCount]);

  const clearPending = useCallback(async () => {
    await clearPendingTransactionsSqlite();
    await updatePendingCount();
  }, [updatePendingCount]);

  const value = {
    online,
    simulatedOffline,
    toggleOfflineMode,
    pending,
    syncing,
    checking,
    sqliteStats,
    sync,
    clearPending,
    addPendingTransaction,
    refreshConnection: checkConnection,
    updatePendingCount
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error("useConnectivity must be used inside ConnectivityProvider");
  }
  return context;
}