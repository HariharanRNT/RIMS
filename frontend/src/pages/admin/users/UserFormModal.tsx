import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import type { UserItem } from './UsersListPage';
import { X, ShieldCheck } from 'lucide-react';

interface UserFormModalProps {
  user: UserItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface RoleOption {
  id: number;
  name: string;
  description?: string;
  isSystemRole: boolean;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({ user, onClose, onSuccess }) => {
  const { isSuperAdmin } = useAuth();
  const isProtectedAdmin = Boolean(
    user?.email === 'hariharanrntgemini@gmail.com' ||
    user?.email === 'admin@riims.local' ||
    user?.email === 'harideepa0611@gmail.com'
  );

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState<number | undefined>(user?.employeeId);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles || []);
  const [isActive, setIsActive] = useState<boolean>(isProtectedAdmin ? true : (user?.isActive ?? true));
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!user;

  useEffect(() => {
    // Fetch roles
    apiClient.get('/roles').then((res) => {
      if (res.data.success) {
        // Only Super Admin can see and assign 'Super Admin' role
        const roles = res.data.data.filter((r: RoleOption) => {
          if (r.name === 'Super Admin' && !isSuperAdmin) return false;
          return true;
        });
        setAvailableRoles(roles);
      }
    });

    // Fetch employees for linking
    apiClient.get('/employees?pageSize=200').then((res) => {
      if (res.data.success) {
        setEmployees(res.data.data.items || res.data.data || []);
      }
    });
  }, [isSuperAdmin]);

  const handleRoleToggle = (roleName: string) => {
    if (selectedRoles.includes(roleName)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== roleName));
    } else {
      setSelectedRoles([...selectedRoles, roleName]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        await apiClient.put(`/users/${user.id}`, {
          email,
          username,
          employeeId: employeeId ? Number(employeeId) : null,
          roles: selectedRoles,
          isActive,
        });
      } else {
        if (!password) {
          setError('Password is required for new users.');
          setLoading(false);
          return;
        }
        await apiClient.post('/users', {
          email,
          username,
          password,
          employeeId: employeeId ? Number(employeeId) : null,
          roles: selectedRoles,
          isActive: true,
          mustChangePassword,
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
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
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
            {isEdit ? `Edit User — ${user.username}` : 'Create New Admin User'}
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
                fontSize: '13.5px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jdoe_admin"
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

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@riims.local"
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
          </div>

          {!isEdit && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Initial Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
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
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Link to Employee Profile (Optional)
            </label>
            <select
              value={employeeId || ''}
              onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : undefined)}
              style={{
                width: '100%',
                background: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '9px 12px',
                borderRadius: '7px',
                fontSize: '13.5px',
              }}
            >
              <option value="">-- No Linked Employee (Standalone Admin) --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `EMP #${emp.id}`} (EMP #{emp.id} - {emp.departmentName || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* Role Assignments Matrix */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Assigned Roles (Multiple roles combine permissions)
            </label>
            <div
              style={{
                background: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              {availableRoles.map((role) => {
                const isSelected = selectedRoles.includes(role.name);
                return (
                  <label
                    key={role.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--panel-raised)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      color: isSelected ? 'var(--text)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleRoleToggle(role.name)}
                      style={{ accentColor: 'var(--green)' }}
                    />
                    <span>{role.name}</span>
                    {role.name === 'Super Admin' && (
                      <ShieldCheck size={12} style={{ color: '#f59e0b', marginLeft: 'auto' }} />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: isProtectedAdmin ? '#f59e0b' : 'var(--text-secondary)',
                cursor: isProtectedAdmin ? 'not-allowed' : 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isProtectedAdmin ? true : isActive}
                disabled={isProtectedAdmin}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ accentColor: 'var(--green)' }}
              />
              Account Active {isProtectedAdmin ? '(Permanently Protected System Admin)' : '(User can log in and access system)'}
            </label>

            {!isEdit && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  style={{ accentColor: 'var(--green)' }}
                />
                Require password reset upon initial login
              </label>
            )}
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
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
