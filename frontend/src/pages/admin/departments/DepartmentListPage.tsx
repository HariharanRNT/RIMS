import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  isActive: boolean;
}

export const DepartmentListPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/departments');
      if (res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingId(dept.id);
    setName(dept.name);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await apiClient.put(`/departments/${editingId}`, { name });
      } else {
        await apiClient.post('/departments', { name });
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save department');
    }
  };

  const { confirm, showAlert } = useConfirm();

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Deactivate Department',
      message: 'Are you sure you want to deactivate this department? If any employees are assigned to it, deletion will be blocked.',
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (isConfirmed) {
      try {
        await apiClient.delete(`/departments/${id}`);
        fetchDepartments();
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to delete department';
        await showAlert({
          title: 'Cannot Delete Department',
          message: errorMsg,
          type: 'danger',
          confirmText: 'Understood'
        });
      }
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2>Departments</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage company departments</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>New Department</span>
        </button>
      </div>

      <div className="glass-card table-container" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Department Name</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No departments found.</td></tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id}>
                  <td>#{dept.id}</td>
                  <td style={{ fontWeight: 600 }}>{dept.name}</td>
                  <td>
                    <span className={`badge ${dept.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(dept)} style={{ marginRight: '0.5rem' }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(dept.id)}>
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
            <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Department' : 'New Department'}</h3>

            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Department Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Engineering"
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
