import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import Icon from '../components/Icon';

const defaultUsers = [
  { id: 1, username: 'admin', name: 'System Administrator', email: 'admin@hybrid-inventory.com', role: 'ADMIN', createdAt: '2026-01-10T09:00:00' },
  { id: 2, username: 'manager1', name: 'Store Operations Manager', email: 'store-manager@example.com', role: 'MANAGER', createdAt: '2026-02-15T11:30:00' },
  { id: 3, username: 'cashier1', name: 'Rahul Sharma', email: 'rahul.pos@example.com', role: 'CASHIER', createdAt: '2026-03-01T14:20:00' }
];

const emptyUser = {
  username: '',
  name: '',
  email: '',
  password: '',
  role: 'CASHIER'
};

const roleColors = {
  ADMIN: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe', label: 'Administrator' },
  MANAGER: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'Store Manager' },
  CASHIER: { bg: '#d1fae5', text: '#047857', border: '#a7f3d0', label: 'Cashier / POS' },
  AUDITOR: { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: 'Inventory Auditor' }
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/users');
      if (res.data && res.data.length > 0) {
        setUsers(res.data);
      } else {
        setUsers(defaultUsers);
      }
    } catch (err) {
      console.warn('Could not load users from backend, using default users:', err.message);
      setUsers(defaultUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchText = `${u.username || ''} ${u.name || ''} ${u.email || ''}`.toLowerCase();
      const matchesSearch = matchText.includes(q);
      const matchesRole = roleFilter === 'ALL' || (u.role || '').toUpperCase() === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const stats = useMemo(() => {
    return [
      { label: 'Total Users', value: users.length, icon: 'users', color: 'purple', sub: 'Registered system accounts' },
      { label: 'Administrators', value: users.filter((u) => u.role === 'ADMIN').length, icon: 'shield', color: 'blue', sub: 'Full access privilege' },
      { label: 'Store Managers', value: users.filter((u) => u.role === 'MANAGER').length, icon: 'dashboard', color: 'green', sub: 'Catalog & alerts control' },
      { label: 'Cashiers & Staff', value: users.filter((u) => u.role === 'CASHIER' || u.role === 'AUDITOR').length, icon: 'sales', color: 'orange', sub: 'POS & register operators' }
    ];
  }, [users]);

  const openAddModal = () => {
    setEditingUser(null);
    setForm(emptyUser);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setForm({
      username: u.username || '',
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'CASHIER'
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      setError('Password is required for new accounts.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, form);
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, ...form, role: form.role.toUpperCase() } : u))
        );
        showToast(`User '${form.username}' updated successfully!`);
      } else {
        const res = await api.post('/users', form);
        const newUser = res.data?.id
          ? res.data
          : { ...form, id: Date.now(), createdAt: new Date().toISOString() };
        setUsers((prev) => [newUser, ...prev]);
        showToast(`User '${form.username}' created successfully!`);
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to save user account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (u.username === 'admin') {
      alert("The primary 'admin' account cannot be deleted.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user account '${u.username}'?`)) {
      return;
    }

    try {
      await api.delete(`/users/${u.id}`);
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
      showToast(`User '${u.username}' deleted.`);
    } catch (err) {
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
      showToast(`User '${u.username}' removed.`);
    }
  };

  return (
    <section className="products-page">
      {/* HEADER */}
      <div className="page-heading">
        <div>
          <div className="breadcrumb">
            System <Icon name="chevronRight" size={13} /> Users & Roles
          </div>
          <h1>Users & Roles Management</h1>
          <p>Configure staff user accounts, role-based access control (RBAC), and operational permissions.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary-button" onClick={loadUsers} disabled={loading}>
            <Icon name="sync" size={15} /> Refresh
          </button>
          <button className="primary-button" onClick={openAddModal}>
            <Icon name="plus" size={16} /> New User Account
          </button>
        </div>
      </div>

      {/* TOAST / ERROR */}
      {toast && (
        <div className="product-toast" style={{ top: 20 }}>
          <span>✓</span> {toast}
        </div>
      )}

      {/* STATS */}
      <div className="stats-grid product-stats">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.color}`}>
              <Icon name={s.icon} size={20} />
            </div>
            <div className="stat-main">
              <span>{s.label}</span>
              <strong>{s.value}</strong>
              <small>{s.sub}</small>
            </div>
          </div>
        ))}
      </div>

      {/* PANEL & TOOLBAR */}
      <div className="panel product-panel">
        <div className="product-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="product-search" style={{ flex: '1 1 300px' }}>
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, or email..."
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem'
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Administrators</option>
              <option value="MANAGER">Store Managers</option>
              <option value="CASHIER">Cashiers</option>
              <option value="AUDITOR">Auditors</option>
            </select>
          </div>

          {(search || roleFilter !== 'ALL') && (
            <button
              className="clear-filter"
              onClick={() => {
                setSearch('');
                setRoleFilter('ALL');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* USERS TABLE */}
        <div className="table-scroll">
          <table className="product-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>STAFF USER</th>
                <th>CONTACT EMAIL</th>
                <th>ROLE & PERMISSIONS</th>
                <th>ACCOUNT CREATED</th>
                <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const roleInfo = roleColors[u.role] || roleColors.CASHIER;
                const initials = (u.name || u.username || 'U')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={u.id}>
                    <td>
                      <code>#{u.id}</code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: roleInfo.bg,
                            color: roleInfo.text,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            border: `1px solid ${roleInfo.border}`
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <b style={{ color: '#0f172a', fontSize: '0.95rem' }}>{u.name || u.username}</b>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Username: <code style={{ color: '#7044e8' }}>@{u.username}</code>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.88rem', color: '#334155' }}>
                        {u.email || <span style={{ color: '#94a3b8' }}>— None —</span>}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: roleInfo.bg,
                          color: roleInfo.text,
                          border: `1px solid ${roleInfo.border}`,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: roleInfo.text
                          }}
                        />
                        {u.role} &bull; {roleInfo.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => openEditModal(u)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            color: '#e11d48',
                            borderColor: '#fecdd3'
                          }}
                          disabled={u.username === 'admin'}
                          onClick={() => handleDelete(u)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div className="empty-products">
                      <Icon name="users" size={32} />
                      <b>No user accounts found</b>
                      <span>Try changing your search keyword or selected role filter.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER MODAL */}
      {modalOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1000 }}
          onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="product-modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h2>{editingUser ? `Edit User: @${editingUser.username}` : 'Create New User Account'}</h2>
                <p>Assign role credentials and configure access permissions.</p>
              </div>
              <button type="button" className="modal-x" onClick={() => setModalOpen(false)}>
                <Icon name="close" size={17} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '20px 24px' }}>
              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    marginBottom: 16,
                    background: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    fontSize: '0.88rem'
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <label style={{ gridColumn: 'span 2' }}>
                  <span>Full Name</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                  />
                </label>

                <label>
                  <span>Username *</span>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. psharma"
                  />
                  {editingUser && (
                    <small style={{ color: '#94a3b8', fontSize: '11px' }}>Username cannot be modified.</small>
                  )}
                </label>

                <label>
                  <span>Role *</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="ADMIN">ADMIN - Full System Access</option>
                    <option value="MANAGER">MANAGER - Inventory & Store Operations</option>
                    <option value="CASHIER">CASHIER - POS Sales & Checkout</option>
                    <option value="AUDITOR">AUDITOR - View-only Reports & Logs</option>
                  </select>
                </label>

                <label style={{ gridColumn: 'span 2' }}>
                  <span>Email Address</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="priya.sharma@example.com"
                  />
                  <small style={{ color: '#64748b', fontSize: '11px' }}>
                    Used for notifications and low-stock email alerts.
                  </small>
                </label>

                <label style={{ gridColumn: 'span 2' }}>
                  <span>{editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}</span>
                  <input
                    type="password"
                    required={!editingUser}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? '••••••••••••' : 'Enter secure password'}
                  />
                </label>
              </div>

              <div className="modal-footer" style={{ marginTop: 24, padding: 0, border: 'none' }}>
                <button type="button" className="cancel-button" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
