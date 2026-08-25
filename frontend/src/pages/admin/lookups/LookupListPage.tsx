import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

interface LookupItem {
  id: number;
  name: string;
  isActive: boolean;
  allowedMinutes?: number;
}

type LookupType = 'break-types' | 'support-activity-types' | 'leave-types';

export const LookupListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LookupType>('break-types');
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [allowedMinutes, setAllowedMinutes] = useState<number | string>(15);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/${activeTab}`);
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err: any) {
      setError('Failed to load lookup items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchQuery('');
    fetchItems();
  }, [activeTab]);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [items, searchQuery]);

  const activeCount = React.useMemo(() => {
    return items.filter((item) => item.isActive !== false).length;
  }, [items]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setAllowedMinutes(15);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: LookupItem) => {
    setEditingId(item.id);
    setName(item.name);
    setAllowedMinutes(item.allowedMinutes ?? 15);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'break-types') {
      const mins = Number(allowedMinutes);
      if (!mins || mins <= 0) {
        setError('Allowed break time must be greater than 0 minutes.');
        return;
      }
    }

    const payload: any = { name: name.trim() };
    if (activeTab === 'break-types') {
      payload.allowedMinutes = Number(allowedMinutes);
    }

    try {
      if (editingId) {
        await apiClient.put(`/${activeTab}/${editingId}`, payload);
      } else {
        await apiClient.post(`/${activeTab}`, payload);
      }
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save lookup item.');
    }
  };

  const { confirm, showAlert } = useConfirm();

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Deactivate Master Item',
      message: 'Are you sure you want to deactivate this item? It will be archived and hidden from dropdown selections.',
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await apiClient.delete(`/${activeTab}/${id}`);
        fetchItems();
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to delete lookup item.';
        await showAlert({
          title: 'Cannot Deactivate Item',
          message: errorMsg,
          type: 'danger',
          confirmText: 'Understood'
        });
      }
    }
  };

  const getTabLabel = (tab: LookupType) => {
    switch (tab) {
      case 'break-types': return 'Break Types';
      case 'support-activity-types': return 'Support Activity Types';
      case 'leave-types': return 'Leave Types';
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2>Master Lookups</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Admin-managed lookup types for breaks, support activities, and leaves
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>New {getTabLabel(activeTab).slice(0, -1)}</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {(['break-types', 'support-activity-types', 'leave-types'] as LookupType[]).map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab)}
          >
            {getTabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Toolbar: Search input & Active count badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder={`Search ${getTabLabel(activeTab)}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <span className="badge badge-info" style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}>
          Active Records: <strong>{activeCount}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              {activeTab === 'break-types' && <th>Allowed Break Time</th>}
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={activeTab === 'break-types' ? 5 : 4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading items...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={activeTab === 'break-types' ? 5 : 4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No items found.</td></tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>#{item.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</td>
                  {activeTab === 'break-types' && (
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem', fontWeight: 600 }}>
                        {item.allowedMinutes ?? 15} {item.allowedMinutes === 1 ? 'minute' : 'minutes'}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(item)} style={{ marginRight: '0.5rem' }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>
              {editingId ? `Edit ${getTabLabel(activeTab).slice(0, -1)}` : `New ${getTabLabel(activeTab).slice(0, -1)}`}
            </h3>

            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>

              {activeTab === 'break-types' && (
                <div className="form-group">
                  <label className="form-label">Allowed Break Time (Minutes) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    step={1}
                    value={allowedMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAllowedMinutes(val === '' ? '' : Math.max(1, parseInt(val, 10) || 1));
                    }}
                    placeholder="Enter allowed minutes (e.g. 5, 10, 60)"
                    required
                  />
                  <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    Maximum allowed duration before an over-break alert is triggered.
                  </small>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
