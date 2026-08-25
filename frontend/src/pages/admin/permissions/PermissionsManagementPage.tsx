import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import { ShieldCheck, Save, ArrowLeft, CheckSquare, Square } from 'lucide-react';

interface ModulePermissions {
  module: string;
  permissions: {
    id: number;
    name: string;
    code: string;
    description?: string;
    module: string;
  }[];
}

interface RoleOption {
  id: number;
  name: string;
  isSystemRole: boolean;
  isProtected: boolean;
}

export const PermissionsManagementPage: React.FC = () => {
  const { hasPermission, isSuperAdmin, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [modules, setModules] = useState<ModulePermissions[]>([]);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canAssign = hasPermission('Role.Assign') || isSuperAdmin;

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Load roles & permission catalog in parallel
        const [rolesRes, permsRes] = await Promise.all([
          apiClient.get('/roles'),
          apiClient.get('/app-permissions'),
        ]);

        if (rolesRes.data.success) {
          setRoles(rolesRes.data.data);
          const paramRoleId = searchParams.get('roleId');
          if (paramRoleId) {
            setSelectedRoleId(Number(paramRoleId));
          } else if (rolesRes.data.data.length > 0) {
            // Default to first non-super admin role if possible
            const defaultRole = rolesRes.data.data.find((r: RoleOption) => r.name !== 'Super Admin') || rolesRes.data.data[0];
            setSelectedRoleId(defaultRole.id);
          }
        }

        if (permsRes.data.success) {
          setModules(permsRes.data.data);
        }
      } catch (err: any) {
        console.error('Failed to initialize permissions page:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Fetch assigned permissions whenever selectedRoleId changes
  useEffect(() => {
    if (!selectedRoleId) return;

    apiClient.get(`/roles/${selectedRoleId}/permissions`).then((res) => {
      if (res.data.success) {
        setAssignedPermissionIds(res.data.data.permissionIds || []);
      }
    });
  }, [selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isSuperAdminRole = selectedRole?.name === 'Super Admin';

  const handleTogglePermission = (id: number) => {
    if (isSuperAdminRole || !canAssign) return;
    if (assignedPermissionIds.includes(id)) {
      setAssignedPermissionIds(assignedPermissionIds.filter((pId) => pId !== id));
    } else {
      setAssignedPermissionIds([...assignedPermissionIds, id]);
    }
  };

  const handleToggleModule = (module: ModulePermissions) => {
    if (isSuperAdminRole || !canAssign) return;
    const moduleIds = module.permissions.map((p) => p.id);
    const allSelected = moduleIds.every((id) => assignedPermissionIds.includes(id));

    if (allSelected) {
      setAssignedPermissionIds(assignedPermissionIds.filter((id) => !moduleIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...assignedPermissionIds, ...moduleIds]));
      setAssignedPermissionIds(merged);
    }
  };

  const handleSelectAll = () => {
    if (isSuperAdminRole || !canAssign) return;
    const allIds = modules.flatMap((m) => m.permissions.map((p) => p.id));
    setAssignedPermissionIds(allIds);
  };

  const handleDeselectAll = () => {
    if (isSuperAdminRole || !canAssign) return;
    setAssignedPermissionIds([]);
  };

  const handleSave = async () => {
    if (!selectedRoleId || isSuperAdminRole || !canAssign) return;
    setSaving(true);
    setMessage(null);

    try {
      await apiClient.put(`/roles/${selectedRoleId}/permissions`, {
        permissionIds: assignedPermissionIds,
      });
      setMessage({ type: 'success', text: `Permissions for '${selectedRole?.name}' updated successfully.` });
      await refreshUser();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save permissions.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/admin/roles')}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Back to Roles"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>Permissions Matrix</h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Assign fine-grained, module-level, and action-level capabilities to roles.
            </p>
          </div>
        </div>

        {canAssign && !isSuperAdminRole && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--green)',
              color: '#000',
              fontWeight: 600,
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
            }}
          >
            <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Permissions'}
          </button>
        )}
      </div>

      {message && (
        <div
          style={{
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'var(--green)' : 'var(--danger)'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13.5px',
            fontWeight: 500,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Role Selector & Quick Actions */}
      <div
        style={{
          background: 'var(--panel)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          padding: '18px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <label style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Select Target Role:
          </label>
          <select
            value={selectedRoleId || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedRoleId(id);
              setSearchParams({ roleId: id.toString() });
            }}
            style={{
              background: 'var(--bg-alt)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '8px 14px',
              borderRadius: '7px',
              fontSize: '14px',
              fontWeight: 600,
              minWidth: '220px',
            }}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.name === 'Super Admin' ? '⭐' : ''}
              </option>
            ))}
          </select>
        </div>

        {!isSuperAdminRole && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSelectAll}
              style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 500,
              }}
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12.5px',
                fontWeight: 500,
              }}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Super Admin Notice */}
      {isSuperAdminRole && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#f59e0b',
          }}
        >
          <ShieldCheck size={24} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13.5px', lineHeight: 1.4 }}>
            <strong>Super Admin Role:</strong> Users with the Super Admin role automatically possess unrestricted, wildcard access across every module, action, and system setting. Permissions cannot be modified.
          </div>
        </div>
      )}

      {/* Modules & Permissions Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-faint)' }}>
            Loading permissions matrix...
          </div>
        ) : (
          modules.map((mod) => {
            const moduleIds = mod.permissions.map((p) => p.id);
            const allSelected = isSuperAdminRole || moduleIds.every((id) => assignedPermissionIds.includes(id));

            return (
              <div
                key={mod.module}
                style={{
                  background: 'var(--panel)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                {/* Module Header */}
                <div
                  style={{
                    padding: '14px 20px',
                    background: 'var(--bg-alt)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                      {mod.module} Module
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'var(--panel-raised)',
                        color: 'var(--text-faint)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 600,
                      }}
                    >
                      {mod.permissions.length} actions
                    </span>
                  </div>

                  {!isSuperAdminRole && canAssign && (
                    <button
                      onClick={() => handleToggleModule(mod)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: allSelected ? 'var(--green)' : 'var(--text-secondary)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                      {allSelected ? 'Deselect Module' : 'Select All in Module'}
                    </button>
                  )}
                </div>

                {/* Permissions Checkbox Grid */}
                <div
                  style={{
                    padding: '18px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {mod.permissions.map((perm) => {
                    const isChecked = isSuperAdminRole || assignedPermissionIds.includes(perm.id);

                    return (
                      <label
                        key={perm.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: isChecked ? 'var(--panel-raised)' : 'transparent',
                          border: `1px solid ${isChecked ? 'var(--border)' : 'transparent'}`,
                          cursor: isSuperAdminRole || !canAssign ? 'default' : 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSuperAdminRole || !canAssign}
                          onChange={() => handleTogglePermission(perm.id)}
                          style={{
                            marginTop: '2px',
                            accentColor: 'var(--green)',
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: isChecked ? 600 : 500, color: 'var(--text)' }}>
                            {perm.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', marginTop: '2px' }}>
                            <code>{perm.code}</code>
                          </div>
                          {perm.description && (
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                              {perm.description}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
