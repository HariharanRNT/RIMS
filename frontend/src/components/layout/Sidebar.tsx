import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import rntLogo from '../../assets/RNT-Logo.png';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Package,
  UserCheck,
  Link2,
  Clock,
  Settings,
  LogOut,
  CalendarDays,
  FileText,
  CreditCard,
  CheckCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calculator,
  UserCog,
  Shield
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role, user, logout, isAdmin, hasAnyPermission, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const profilePath = isAdmin ? '/admin/profile' : '/profile';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminNavGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/attendance-permissions', label: 'Attendance & Permissions', icon: ShieldCheck, permissions: ['Attendance.View', 'Permission.View', 'Report.View'] },
        { to: '/admin/approvals', label: 'Approval Queue', icon: CheckCircle, permissions: ['Leave.Approve', 'Permission.Approve', 'Attendance.Approve'] },
      ]
    },
    {
      title: 'WORKFORCE & ATTENDANCE',
      items: [
        { to: '/admin/attendance-calendar', label: 'Monthly Calendar', icon: CalendarDays, permissions: ['AttendanceCalendar.View', 'AttendanceCalendar.Manage'] },
        { to: '/admin/tasks', label: 'Task Allocation', icon: Briefcase, permissions: ['Task.View', 'Task.Assign'] },
        { to: '/admin/employees', label: 'Employees', icon: Users, permissions: ['Employee.View', 'Employee.Create'] },
        { to: '/admin/departments', label: 'Departments', icon: Building2, permissions: ['Department.View', 'Department.Manage'] },
        { to: '/admin/designations', label: 'Designations', icon: Briefcase, permissions: ['Designation.View', 'Designation.Manage'] },
      ]
    },
    {
      title: 'FINANCE & REPORTS',
      items: [
        { to: '/admin/payroll', label: 'Payroll & LOP', icon: CreditCard, permissions: ['Payroll.View', 'Payroll.Generate'] },
        { to: '/admin/salary-structure', label: 'Salary Structure', icon: Calculator, permissions: ['SalaryStructure.View', 'SalaryStructure.Manage'] },
        { to: '/admin/payroll/monthly-report', label: 'Monthly Employee Report', icon: FileSpreadsheet, permissions: ['Payroll.View', 'Report.View'] },
        { to: '/admin/reports', label: 'Production Reports', icon: FileText, permissions: ['Report.View'] },
      ]
    },
    {
      title: 'CATALOG & SYSTEM',
      items: [
        { to: '/admin/products', label: 'Products', icon: Package, permissions: ['MasterData.Manage', 'Employee.View'] },
        { to: '/admin/clients', label: 'Clients', icon: UserCheck, permissions: ['MasterData.Manage', 'Employee.View'] },
        { to: '/admin/mappings', label: 'Product-Client Maps', icon: Link2, permissions: ['MasterData.Manage', 'Employee.View'] },
        { to: '/admin/lookups', label: 'Master Lookups', icon: Clock, permissions: ['MasterData.Manage', 'Break.Manage', 'SupportActivity.Manage'] },
        { to: '/admin/settings', label: 'System Settings', icon: Settings, permissions: ['Settings.View', 'Settings.Edit'] },
      ]
    },
    {
      title: 'ADMINISTRATION & RBAC',
      items: [
        { to: '/admin/users', label: 'Admin Users', icon: UserCog, permissions: ['User.View', 'User.Create'] },
        { to: '/admin/roles', label: 'Roles', icon: Shield, permissions: ['Role.View', 'Role.Create'] },
        { to: '/admin/permissions', label: 'Permissions Matrix', icon: ShieldCheck, permissions: ['Role.Assign', 'SystemPermission.View', 'Role.View'] },
      ]
    }
  ];

  const employeeNavGroups = [
    {
      title: 'MY WORKSPACE',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/calendar', label: 'Attendance Calendar', icon: CalendarDays },
        { to: '/work-task', label: 'Work Task Engine', icon: Briefcase },
      ]
    },
    {
      title: 'REQUESTS & PAYROLL',
      items: [
        { to: '/leave', label: 'Leave Requests', icon: CalendarDays },
        { to: '/permission', label: 'Permissions', icon: FileText },
        { to: '/payslip', label: 'Payslips', icon: CreditCard },
      ]
    }
  ];

  // Filter groups according to permissions
  const filteredAdminGroups = adminNavGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (isSuperAdmin) return true;
        if (!item.permissions || item.permissions.length === 0) return true;
        return hasAnyPermission(item.permissions);
      })
    }))
    .filter(group => group.items.length > 0);

  const groups = isAdmin ? filteredAdminGroups : employeeNavGroups;

  const formatDisplayName = (name?: string) => {
    if (!name) return isAdmin ? 'Administrator' : 'Employee';
    if (name.includes('@')) {
      const localPart = name.split('@')[0];
      const cleanName = localPart.replace(/[0-9._-]/g, ' ').trim();
      if (!cleanName) return isAdmin ? 'Administrator' : 'Employee';
      return cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return name;
  };

  const getInitials = (name?: string) => {
    const displayName = formatDisplayName(name);
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.substring(0, 2).toUpperCase();
  };

  const portalLabel = isSuperAdmin
    ? 'SUPER ADMIN'
    : isAdmin
    ? (user?.roles?.find(r => r.toLowerCase().endsWith('admin') || r.toLowerCase() === 'admin')?.toUpperCase() || 'ADMIN')
    : 'EMPLOYEE';

  return (
    <aside style={{
      width: collapsed ? '72px' : '248px',
      minWidth: collapsed ? '72px' : '248px',
      transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'var(--bg-alt)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 101,
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '18px 10px' : '20px 18px 16px 18px',
        borderBottom: '1px solid var(--border-soft)',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '2px',
            flexShrink: 0
          }}>
            <img src={rntLogo} alt="RNT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          {!collapsed && (
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 700, fontSize: '14.5px', letterSpacing: '-0.01em', color: 'var(--text)' }}>
                RIMS
              </div>
              <div style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                marginTop: '3px'
              }}>
                {portalLabel} PORTAL
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-dim)',
            width: '24px',
            height: '24px',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Grouped Navigation */}
      <nav style={{ padding: collapsed ? '14px 8px' : '16px 12px', flex: 1, overflowY: 'auto' }}>
        {groups.map((group, groupIdx) => (
          <div key={groupIdx} style={{ marginBottom: '18px' }}>
            {!collapsed && (
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                padding: '0 10px 8px 10px'
              }}>
                {group.title}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    style={({ isActive }) => ({
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: collapsed ? '8px 0' : '8px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: '7px',
                      fontSize: '13.5px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--green)' : 'var(--text-dim)',
                      background: isActive ? 'var(--green-dim)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.12s ease',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !collapsed && (
                          <span style={{
                            position: 'absolute',
                            left: '-12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '3px',
                            height: '16px',
                            borderRadius: '2px',
                            background: 'var(--green)'
                          }} />
                        )}
                        <Icon size={15} style={{ color: isActive ? 'var(--green)' : 'var(--text-faint)', flexShrink: 0 }} />
                        {!collapsed && <span>{link.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div style={{
        borderTop: '1px solid var(--border-soft)',
        padding: collapsed ? '12px 8px' : '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        {!collapsed ? (
          <div
            onClick={() => navigate(profilePath)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              cursor: 'pointer'
            }}
            title="Click to view My Profile"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--amber)',
                flexShrink: 0
              }}>
                {getInitials(user?.employeeName)}
              </div>
              <div style={{ lineHeight: 1.2, overflow: 'hidden' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {formatDisplayName(user?.employeeName)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 500, marginTop: '2px' }}>
                  {user?.roles && user.roles.length > 0 ? user.roles.join(', ') : (role || 'Employee')}
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-faint)',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
            <button
              onClick={() => navigate(profilePath)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                color: 'var(--amber)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="View My Profile"
            >
              {getInitials(user?.employeeName)}
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-faint)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
