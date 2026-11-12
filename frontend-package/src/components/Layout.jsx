import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useConnectivity } from '../context/Connectivity';
import { api } from '../services/api';
import Icon from './Icon';

const navGroups = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }]
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', label: 'Products', icon: 'products' },
      { to: '/barcode', label: 'Barcode Scanner', icon: 'barcode' },
      { to: '/sales', label: 'Sales', icon: 'sales' },
      { to: '/purchases', label: 'Purchases', icon: 'purchases' },
      { to: '/transactions', label: 'Transactions', icon: 'transactions' }
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/forecast', label: 'AI Forecast', icon: 'forecast' },
      { to: '/reports', label: 'Reports', icon: 'reports' },
      { to: '/alerts', label: 'Alerts', icon: 'alerts' }
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/users', label: 'Users & Roles', icon: 'users' }
    ]
  }
];

export default function Layout() {
  const { online, simulatedOffline, toggleOfflineMode, pending, sync, sqliteStats } = useConnectivity();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const navigate = useNavigate();

  const [currentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('hybridInventoryUser');
      if (raw) {
        const u = JSON.parse(raw);
        const uname = u.username || 'admin';
        return {
          username: uname,
          name: u.name || (uname.charAt(0).toUpperCase() + uname.slice(1)),
          role: u.role || (uname.toLowerCase() === 'admin' ? 'Administrator' : 'Store Staff')
        };
      }
    } catch (e) {}
    return { username: 'admin', name: 'Admin', role: 'Administrator' };
  });

  const userInitials = useMemo(() => {
    const n = currentUser.name || currentUser.username || 'AD';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }, [currentUser]);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!online) return;
      try {
        const res = await api.get('/alerts/stats');
        setAlertCount(res.data?.pendingAlerts || 0);
      } catch (e) {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [online]);

  const handleLogout = () => {
    localStorage.removeItem('hybridInventoryUser');
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>

        <div className="brand">
          <div className="brand-mark">
            <span>H</span>
          </div>

          <div>
            <div className="brand-name">Hybrid Inventory</div>
            <div className="brand-subtitle">
              AI-Powered Management
            </div>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="nav">

          {navGroups.map(group => (
            <div className="nav-group" key={group.label}>

              <div className="nav-label">
                {group.label}
              </div>

              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon name={item.icon} size={18} />

                  <span>{item.label}</span>
                </NavLink>
              ))}

            </div>
          ))}

        </nav>

        <div className="sidebar-bottom">

          <div className="sync-card">

            <div className="sync-card-head">

              <span className="eyebrow">
                PENDING SYNC
              </span>

              <button
                onClick={sync}
                className="sync-icon"
                title="Sync now"
              >
                <Icon name="sync" size={17} />
              </button>

            </div>

            <div className="sync-number">
              {pending}
            </div>

            <span className="sync-copy">
              {pending
                ? 'transactions waiting'
                : 'Everything is synced'}
            </span>

          </div>

        </div>

      </aside>

      <div className="main-shell">

        <header className="topbar">

          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={22} />
          </button>

          <div className="global-search">
            <Icon name="search" size={19} />

            <input
              placeholder="Search products, transactions, and more..."
            />

            <kbd>Ctrl K</kbd>
          </div>

          <div className="top-actions">

            <button
              type="button"
              className={`connection-pill ${
                online ? 'online-pill' : 'offline-pill'
              }`}
              onClick={toggleOfflineMode}
              style={{ cursor: 'pointer', border: '1px solid', outline: 'none' }}
              title={online ? 'Click to switch to Offline Mode' : 'Click to reconnect and sync to MySQL'}
            >
              <Icon
                name={online ? 'online' : 'offline'}
                size={15}
              />

              <span>
                {online ? 'Online' : (simulatedOffline ? 'Offline (Sim)' : 'Offline')}
              </span>
            </button>

            <button
              className="pending-pill"
              onClick={sync}
            >
              <Icon name="sync" size={16} />

              <span>Pending Sync</span>

              <b>{pending}</b>
            </button>

            <button
              className="icon-button notification-button"
              title="Low-Stock Email Alerts"
              onClick={() => navigate('/alerts')}
            >
              <Icon name="alerts" size={20} />
            </button>

            {/* PROFILE + LOGOUT */}

            <div className="profile">

              <div className="avatar">
                {userInitials}
              </div>

              <div className="profile-copy">

                <strong>
                  {currentUser.name}
                </strong>

                <span>
                  {currentUser.role}
                </span>

              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'inherit'
                }}
              >
                <Icon
                  name="logout"
                  size={18}
                />
              </button>

            </div>

          </div>

        </header>

        <main className="content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}