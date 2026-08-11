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
      title: 'WORKFORCE',
      items: [
        { to: '/admin/employees', label: 'Employees', icon: Users },
        { to: '/admin/departments', label: 'Departments', icon: Building2 },
        { to: '/admin/designations', label: 'Designations', icon: Briefcase },
      ]
    },
    {
      title: 'FINANCE & REPORTS',
      items: [
        { to: '/admin/payroll', label: 'Payroll & LOP', icon: CreditCard },
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
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid var(--border-color)',
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
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '2px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)',
            flexShrink: 0
          }}>
            <img src={rntLogo} alt="RNT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          {!collapsed && (
            <div>
              <h2 style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                RIMS V2
              </h2>
              <span style={{
                fontSize: '0.625rem',
                color: 'var(--primary)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}>
                {role?.toUpperCase()} PORTAL
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--text-muted)',
            padding: '0.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Grouped Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingBottom: '0.5rem' }}>
        {groups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {!collapsed && (
              <div style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                padding: '0 0.5rem 0.4rem',
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
                      fontSize: '0.825rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--primary-light)' : 'transparent',
                      borderLeft: isActive && !collapsed ? '3px solid var(--primary)' : '3px solid transparent',
                      transition: 'all 0.12s ease',
                      textDecoration: 'none',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={17} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
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
        borderTop: '1px solid var(--border-color)'
      }}>
        {!collapsed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.55rem 0.7rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', overflow: 'hidden' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getInitials(user?.employeeName)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {formatDisplayName(user?.employeeName, user?.role)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  EMP #{user?.employeeId || '001'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--danger)',
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
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
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
