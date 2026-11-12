import React from 'react';
import {
  Routes,
  Route,
  Navigate,
  Outlet
} from 'react-router-dom';

import Layout from './components/Layout.jsx';
import { ConnectivityProvider } from './context/Connectivity.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Barcode from './pages/Barcode.jsx';
import Transaction from './pages/Transaction.jsx';
import Transactions from './pages/Transactions.jsx';
import Forecast from './pages/Forecast.jsx';
import Reports from './pages/Reports.jsx';
import Alerts from './pages/Alerts.jsx';
import Users from './pages/Users.jsx';
import Placeholder from './pages/Placeholder.jsx';


// ===============================
// CHECK LOGIN
// ===============================

function isLoggedIn() {
  return !!localStorage.getItem('hybridInventoryUser');
}


// ===============================
// PROTECTED ROUTE
// ===============================

function ProtectedRoute() {

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}


// ===============================
// APP
// ===============================

export default function App() {

  return (
    <ConnectivityProvider>

      <Routes>

        {/* LOGIN */}
        <Route
          path="/login"
          element={
            isLoggedIn()
              ? <Navigate to="/dashboard" replace />
              : <Login />
          }
        />


        {/* PROTECTED APPLICATION */}
        <Route element={<ProtectedRoute />}>

          <Route element={<Layout />}>

            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/products"
              element={<Products />}
            />

            <Route
              path="/barcode"
              element={<Barcode />}
            />

            <Route
              path="/sales"
              element={<Transaction type="SALE" />}
            />

            <Route
              path="/purchases"
              element={<Transaction type="PURCHASE" />}
            />

            <Route
              path="/transactions"
              element={<Transactions />}
            />

            <Route
              path="/forecast"
              element={<Forecast />}
            />

            <Route
              path="/reports"
              element={<Reports />}
            />

            <Route
              path="/alerts"
              element={<Alerts />}
            />

            <Route
              path="/users"
              element={<Users />}
            />

          </Route>

        </Route>


        {/* UNKNOWN URL */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>

    </ConnectivityProvider>
  );
}