import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Designation {
  id: number;
  name: string;
  isActive: boolean;
}

export const DesignationListPage: React.FC = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const fetchDesignations = async () => {
    try {
      const res = await apiClient.get('/designations');
      if (res.data.success) {
        setDesignations(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load designations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: Designation) => {
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
        await apiClient.put(`/designations/${editingId}`, { name });
      } else {
        await apiClient.post('/designations', { name });
      }
      setShowModal(false);
      fetchDesignations();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save designation');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to deactivate this designation?')) {
      try {
        await apiClient.delete(`/designations/${id}`);
        fetchDesignations();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete designation');
      }
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2>Designations</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage employee job designations</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>New Designation</span>
        </button>
      </div>

      <div className="glass-card table-container" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Designation Title</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
            ) : designations.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No designations found.</td></tr>
            ) : (
              designations.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Designation' : 'New Designation'}</h3>

            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Designation Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
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
