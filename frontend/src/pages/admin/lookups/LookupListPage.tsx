import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

interface LookupItem {
  id: number;
  name: string;
  isActive: boolean;
}

type LookupType = 'break-types' | 'support-activity-types' | 'leave-types';

export const LookupListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LookupType>('break-types');
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
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
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: LookupItem) => {
    setEditingId(item.id);
    setName(item.name);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await apiClient.put(`/${activeTab}/${editingId}`, { name });
      } else {
        await apiClient.post(`/${activeTab}`, { name });
      }
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save lookup item.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to deactivate this item?')) {
      try {
        await apiClient.delete(`/${activeTab}/${id}`);
        fetchItems();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete lookup item.');
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
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading items...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No items found.</td></tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>#{item.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</td>
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
