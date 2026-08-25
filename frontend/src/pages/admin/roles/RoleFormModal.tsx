import React, { useState } from 'react';
import apiClient from '../../../api/client';
import type { RoleItem } from './RolesListPage';
import { X } from 'lucide-react';

interface RoleFormModalProps {
  role: RoleItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ role, onClose, onSuccess }) => {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        await apiClient.put(`/roles/${role.id}`, {
          name,
          description,
        });
      } else {
        await apiClient.post('/roles', {
          name,
          description,
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'var(--panel)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
            {isEdit ? `Edit Role — ${role.name}` : 'Create New Role'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--danger)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Role Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEdit && role.isProtected}
              placeholder="e.g. Finance Admin"
              style={{
                width: '100%',
                background: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '9px 12px',
                borderRadius: '7px',
                fontSize: '13.5px',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope and purpose of this role..."
              style={{
                width: '100%',
                background: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '9px 12px',
                borderRadius: '7px',
                fontSize: '13.5px',
                resize: 'none',
              }}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '9px 16px',
                borderRadius: '7px',
                cursor: 'pointer',
                fontSize: '13.5px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--green)',
                color: '#000',
                fontWeight: 600,
                border: 'none',
                padding: '9px 20px',
                borderRadius: '7px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13.5px',
              }}
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
