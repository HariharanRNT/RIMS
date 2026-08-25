import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import { RoleFormModal } from './RoleFormModal';
import { Plus, Search, Shield, Edit2, Trash2, Key, Users } from 'lucide-react';

export interface RoleItem {
  id: number;
  name: string;
  description?: string;
  isSystemRole: boolean;
  isProtected: boolean;
  isActive: boolean;
  createdAt: string;
  permissionCount: number;
  userCount: number;
}

export const RolesListPage: React.FC = () => {
  const { isSuperAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const canCreate = hasPermission('Role.Create');
  const canEdit = hasPermission('Role.Edit');
  const canAssign = hasPermission('Role.Assign') || hasPermission('Role.View');

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/roles');
      if (res.data.success) {
        setRoles(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDeleteRole = async (role: RoleItem) => {
    if (role.isProtected || role.isSystemRole) {
      alert('System-protected roles cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete role '${role.name}'?`)) return;

    try {
      await apiClient.delete(`/roles/${role.id}`);
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  const filteredRoles = roles.filter((r) => {
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q));
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>Role Management</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Define custom administrative roles and manage permission matrices across the system.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {canAssign && (
            <button
              onClick={() => navigate('/admin/permissions')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--panel-raised)',
                color: 'var(--text)',
                fontWeight: 600,
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <Key size={16} /> Permissions Matrix
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => {
                setSelectedRole(null);
                setIsFormModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--green)',
                color: '#000',
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Plus size={16} /> Create New Role
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--panel)',
          padding: '14px 18px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <Search size={18} style={{ color: 'var(--text-faint)' }} />
        <input
          type="text"
          placeholder="Search by role name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: '14px',
            width: '100%',
          }}
        />
      </div>

      {/* Roles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '18px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-faint)' }}>
            Loading roles...
          </div>
        ) : filteredRoles.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-faint)' }}>
            No roles found matching your search.
          </div>
        ) : (
          filteredRoles.map((role) => (
            <div
              key={role.id}
              style={{
                background: 'var(--panel)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: role.name === 'Super Admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: role.name === 'Super Admin' ? '#f59e0b' : '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Shield size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{role.name}</h3>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '1px' }}>
                        {role.isSystemRole ? 'System Built-In Role' : 'Custom Defined Role'}
                      </div>
                    </div>
                  </div>

                  {role.isProtected && (
                    <span
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      PROTECTED
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
                  {role.description || 'No description provided.'}
                </p>
              </div>

              <div>
                {/* Stats */}
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '10px 14px',
                    background: 'var(--bg-alt)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-soft)',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <Key size={14} style={{ color: 'var(--green)' }} />
                    <strong>{role.name === 'Super Admin' ? 'All (Wildcard)' : `${role.permissionCount} Permissions`}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                    <Users size={14} style={{ color: 'var(--accent)' }} />
                    <span>{role.userCount} Users</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {canAssign && (
                    <button
                      onClick={() => navigate(`/admin/permissions?roleId=${role.id}`)}
                      style={{
                        background: 'var(--panel-raised)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Key size={13} /> Permissions
                    </button>
                  )}

                  {canEdit && (!role.isProtected || isSuperAdmin) && (
                    <button
                      onClick={() => {
                        setSelectedRole(role);
                        setIsFormModalOpen(true);
                      }}
                      style={{
                        background: 'var(--panel-raised)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  )}

                  {!role.isProtected && canEdit && (
                    <button
                      onClick={() => handleDeleteRole(role)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid transparent',
                        color: '#ef4444',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Role Form Modal */}
      {isFormModalOpen && (
        <RoleFormModal
          role={selectedRole}
          onClose={() => setIsFormModalOpen(false)}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchRoles();
          }}
        />
      )}
    </div>
  );
};
