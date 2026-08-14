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
  User
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminNavGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/profile', label: 'My Profile', icon: User },
        { to: '/admin/approvals', label: 'Approval Queue', icon: CheckCircle },
      ]
    },
    {
      title: 'WORKFORCE & ATTENDANCE',
      items: [
        { to: '/admin/attendance-calendar', label: 'Monthly Calendar', icon: CalendarDays },
        { to: '/admin/tasks', label: 'Task Allocation', icon: Briefcase },
        { to: '/admin/employees', label: 'Employees', icon: Users },
        { to: '/admin/departments', label: 'Departments', icon: Building2 },
        { to: '/admin/designations', label: 'Designations', icon: Briefcase },
      ]
    },
    {
      title: 'FINANCE & REPORTS',
      items: [
        { to: '/admin/payroll', label: 'Payroll & LOP', icon: CreditCard },
        { to: '/admin/payroll/monthly-report', label: 'Monthly Employee Report', icon: FileSpreadsheet },
        { to: '/admin/reports', label: 'Production Reports', icon: FileText },
      ]
    },
    {
      title: 'CATALOG & SYSTEM',
      items: [
        { to: '/admin/products', label: 'Products', icon: Package },
        { to: '/admin/clients', label: 'Clients', icon: UserCheck },
        { to: '/admin/mappings', label: 'Product-Client Maps', icon: Link2 },
        { to: '/admin/lookups', label: 'Master Lookups', icon: Clock },
        { to: '/admin/settings', label: 'System Settings', icon: Settings },
      ]
    }
  ];

  const employeeNavGroups = [
    {
      title: 'MY WORKSPACE',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/profile', label: 'My Profile', icon: User },
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

  const groups = role === 'Admin' ? adminNavGroups : employeeNavGroups;

  const formatDisplayName = (name?: string, userRole?: string) => {
    if (!name) return userRole === 'Admin' ? 'System Administrator' : 'Employee';
    if (name.includes('@')) {
      const localPart = name.split('@')[0];
      const cleanName = localPart.replace(/[0-9._-]/g, ' ').trim();
      if (!cleanName) return userRole === 'Admin' ? 'System Administrator' : 'Employee';
      return cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return name;
  };

  const getInitials = (name?: string) => {
    const displayName = formatDisplayName(name, role ?? undefined);
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.substring(0, 2).toUpperCase();
  };

  return (
    <aside style={{
      width: collapsed ? '72px' : '256px',
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      borderRight: '1px solid rgba(255,255,255,0.12)',
      display: 'flex',
      flexDirection: 'column',
      padding: collapsed ? '1rem 0.5rem' : '1rem 0.75rem',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 101,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: collapsed ? '0.5rem 0 1rem' : '0.5rem 0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '2px',
            border: '1px solid rgba(255,255,255,0.12)',
            flexShrink: 0
          }}>
            <img src={rntLogo} alt="RNT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          {!collapsed && (
            <div>
              <h2 style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#F5F5F5',
                letterSpacing: '-0.01em',
                lineHeight: 1.15
              }}>
                RIMS V2
              </h2>
              <span style={{
                fontSize: '0.625rem',
                color: '#E8873C',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                {role ? `${role.charAt(0).toUpperCase()}${role.slice(1).toLowerCase()} portal` : 'Portal'}
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle — glass circle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%',
            color: 'rgba(255,255,255,0.5)',
            width: '26px',
            height: '26px',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Grouped Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto', paddingBottom: '0.5rem' }}>
        {groups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {!collapsed && (
              <div style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
                padding: '0 0.5rem 0.35rem',
                textTransform: 'uppercase'
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
                      gap: '0.7rem',
                      padding: collapsed ? '0.6rem 0' : '0.55rem 0.75rem',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#E8873C' : 'rgba(255,255,255,0.6)',
                      background: isActive ? 'rgba(232,135,60,0.12)' : 'transparent',
                      borderLeft: isActive && !collapsed ? '3px solid #E8873C' : '3px solid transparent',
                      boxShadow: isActive ? '0 0 12px rgba(232,135,60,0.15)' : 'none',
                      transition: 'all 0.12s ease',
                      textDecoration: 'none',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={17} style={{ color: isActive ? '#E8873C' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
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
        marginTop: 'auto',
        paddingTop: '0.75rem',
        borderTop: '1px solid rgba(255,255,255,0.10)'
      }}>
        {!collapsed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.55rem 0.7rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', overflow: 'hidden' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getInitials(user?.employeeName)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#F5F5F5', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {formatDisplayName(user?.employeeName, user?.role)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                  EMP #{user?.employeeId || '001'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF7B7B',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'rgba(240, 96, 96, 0.10)',
              border: '1px solid rgba(240, 96, 96, 0.20)',
              color: '#FF7B7B',
              borderRadius: 'var(--radius-sm)',
              padding: '0.55rem 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Logout"
          >
            <LogOut size={17} />
          </button>
        )}
      </div>
    </aside>
  );
};
