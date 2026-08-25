import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import { UserFormModal } from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { Plus, Search, ShieldCheck, Key, UserCheck, UserX, Edit2 } from 'lucide-react';

export interface UserItem {
  id: number;
  email: string;
  username: string;
  employeeId?: number;
  employeeCode?: string;
  employeeName?: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  lastLoginAt?: string;
  roles: string[];
}

export const UsersListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [actionUserId, setActionUserId] = useState<number | null>(null);

  // Status toggle confirmation modal
  const [statusUser, setStatusUser] = useState<UserItem | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const canCreate = hasPermission('User.Create');
  const canEdit = hasPermission('User.Edit');
  const canDeactivate = hasPermission('User.Deactivate');
  const canResetPassword = hasPermission('User.ResetPassword');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/users');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleConfirmToggleStatus = async () => {
    if (!statusUser) return;
    const action = statusUser.isActive ? 'deactivate' : 'activate';
    setStatusLoading(true);

    try {
      await apiClient.post(`/users/${statusUser.id}/${action}`);
      setStatusUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action} user.`);
    } finally {
      setStatusLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.employeeName && u.employeeName.toLowerCase().includes(q)) ||
      u.roles.some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>Admin Users Management</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage administrative personnel, assign multi-roles, and configure security credentials.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setSelectedUser(null);
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
            <Plus size={16} /> Create Admin User
          </button>
        )}
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
          placeholder="Search by username, email, linked employee, or role..."
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

      {/* Users Table */}
      <div
        style={{
          background: 'var(--panel)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>User Details</th>
              <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Linked Employee</th>
              <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned Roles</th>
              <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Current Status</th>
              <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-faint)' }}>
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-faint)' }}>
                  No users found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {u.username}
                      {u.isSuperAdmin && (
                        <span
                          title="Super Admin"
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <ShieldCheck size={12} /> Super Admin
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '2px' }}>{u.email}</div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    {u.employeeName ? (
                      <div style={{ color: 'var(--text)' }}>
                        <div>{u.employeeName}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>EMP #{u.employeeId}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Unlinked Account</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          style={{
                            background: r === 'Super Admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: r === 'Super Admin' ? '#f59e0b' : '#3b82f6',
                            fontSize: '11.5px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontWeight: 600,
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: u.isActive ? '#10b981' : '#ef4444',
                        }}
                      />
                      <span
                        style={{
                          background: u.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: u.isActive ? '#10b981' : '#ef4444',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsFormModalOpen(true);
                          }}
                          style={{
                            background: 'var(--panel-raised)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                          }}
                          title="Edit User & Roles"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                      )}

                      {canResetPassword && (
                        <button
                          onClick={() => {
                            setActionUserId(u.id);
                            setIsResetModalOpen(true);
                          }}
                          style={{
                            background: 'var(--panel-raised)',
                            border: '1px solid var(--border)',
                            color: 'var(--amber)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                          }}
                          title="Reset Password"
                        >
                          <Key size={13} /> Reset Pass
                        </button>
                      )}

                      {u.email === 'hariharanrntgemini@gmail.com' || u.email === 'admin@riims.local' || u.email === 'harideepa0611@gmail.com' || u.employeeCode === 'EMP-001' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            color: '#f59e0b',
                            background: 'rgba(245, 158, 11, 0.12)',
                            padding: '5px 9px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                          }}
                          title="Original System Administrator account is permanently protected and cannot be deactivated."
                        >
                          <ShieldCheck size={12} /> Protected
                        </span>
                      ) : canDeactivate && (
                        <button
                          onClick={() => setStatusUser(u)}
                          style={{
                            background: u.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            border: `1px solid ${u.isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                            color: u.isActive ? '#ef4444' : '#10b981',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                          title={u.isActive ? 'Deactivate User Account' : 'Activate User Account'}
                        >
                          {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Create/Edit Modal */}
      {isFormModalOpen && (
        <UserFormModal
          user={selectedUser}
          onClose={() => setIsFormModalOpen(false)}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchUsers();
          }}
        />
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && actionUserId && (
        <ResetPasswordModal
          userId={actionUserId}
          onClose={() => {
            setIsResetModalOpen(false);
            setActionUserId(null);
          }}
          onSuccess={() => {
            setIsResetModalOpen(false);
            setActionUserId(null);
          }}
        />
      )}

      {/* Clear In-App Confirmation Modal for Status Toggle */}
      {statusUser && (
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
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: statusUser.isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: statusUser.isActive ? '#ef4444' : '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {statusUser.isActive ? <UserX size={20} /> : <UserCheck size={20} />}
              </div>

              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
                  {statusUser.isActive ? 'Deactivate User Account' : 'Activate User Account'}
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {statusUser.isActive ? (
                    <>
                      Are you sure you want to deactivate <strong>{statusUser.username}</strong> ({statusUser.email})? This will suspend their login access and terminate any active sessions.
                    </>
                  ) : (
                    <>
                      Are you sure you want to activate <strong>{statusUser.username}</strong> ({statusUser.email})? This will restore their login access and role permissions.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setStatusUser(null)}
                style={{
                  background: 'var(--panel-raised)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '9px 16px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={statusLoading}
                style={{
                  background: statusUser.isActive ? 'var(--danger)' : 'var(--green)',
                  color: statusUser.isActive ? '#fff' : '#000',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '7px',
                  cursor: statusLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13.5px',
                  fontWeight: 600,
                }}
              >
                {statusLoading
                  ? 'Processing...'
                  : statusUser.isActive
                  ? 'Confirm Deactivate'
                  : 'Confirm Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
