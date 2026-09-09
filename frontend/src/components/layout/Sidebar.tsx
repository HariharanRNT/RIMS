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
  Shield,
  type LucideIcon
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permissions?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { role, user, logout, isPureAdmin, hasAnyPermission, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const profilePath = isPureAdmin ? '/admin/profile' : '/profile';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminNavGroups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'ATTENDANCE & APPROVAL',
      items: [
        { to: '/admin/attendance-permissions', label: 'Attendance & Permissions', icon: ShieldCheck, permissions: ['Attendance.View', 'Permission.View', 'Report.View'] },
        { to: '/admin/approvals', label: 'Approval Queue', icon: CheckCircle, permissions: ['Leave.Approve', 'Permission.Approve', 'Attendance.Approve'] },
        { to: '/admin/attendance-calendar', label: 'Monthly Calendar', icon: CalendarDays, permissions: ['AttendanceCalendar.View', 'AttendanceCalendar.Manage'] },
      ]
    },
    {
      title: 'WORKFORCE & EMPLOYEES',
      items: [
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
        { to: '/admin/payroll/monthly-report', label: 'Monthly Employee Report', icon: FileSpreadsheet, permissions: ['Payroll.View', 'Report.View'] },
        { to: '/admin/salary-structure', label: 'Salary Structure', icon: Calculator, permissions: ['SalaryStructure.View', 'SalaryStructure.Manage'] },
        { to: '/admin/reports', label: 'Production Reports', icon: FileText, permissions: ['Report.View'] },
      ]
    },
    {
      title: 'CATALOG & SYSTEM',
      items: [
        { to: '/admin/deployments', label: 'Deployment History', icon: Package, permissions: ['ProductDeployment.View', 'MasterData.Manage', 'Employee.View'] },
        { to: '/admin/deployment-access', label: 'Employee Product Access', icon: Users, permissions: ['ProductDeployment.Manage', 'MasterData.Manage'] },
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

  const employeeNavGroups: NavGroup[] = [
    {
      title: 'MY WORKSPACE',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/calendar', label: 'Attendance Calendar', icon: CalendarDays },
        { to: '/work-task', label: 'Work Task Engine', icon: Briefcase },
        { to: '/deployments', label: 'Deployment History', icon: Package },
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

  // Specific additional administration tools permitted for hybrid employees (e.g. Employee Admin, HR Admin)
  const employeeAdminItems: NavItem[] = ([
    { to: '/admin/deployment-access', label: 'Employee Product Access', icon: Users, permissions: ['ProductDeployment.Manage', 'MasterData.Manage'] },
    { to: '/admin/employees', label: 'Employees', icon: Users, permissions: ['Employee.View', 'Employee.Create'] },
    { to: '/admin/approvals', label: 'Approval Queue', icon: CheckCircle, permissions: ['Leave.Approve', 'Permission.Approve', 'Attendance.Approve'] },
    { to: '/admin/attendance-permissions', label: 'Attendance & Permissions', icon: ShieldCheck, permissions: ['Attendance.View', 'Permission.View'] },
    { to: '/admin/attendance-calendar', label: 'Monthly Calendar', icon: CalendarDays, permissions: ['AttendanceCalendar.Manage'] },
    { to: '/admin/tasks', label: 'Task Allocation', icon: Briefcase, permissions: ['Task.Assign'] },
    { to: '/admin/payroll', label: 'Payroll & LOP', icon: CreditCard, permissions: ['Payroll.View', 'Payroll.Generate'] },
    { to: '/admin/salary-structure', label: 'Salary Structure', icon: Calculator, permissions: ['SalaryStructure.View', 'SalaryStructure.Manage'] },
    { to: '/admin/payroll/monthly-report', label: 'Monthly Employee Report', icon: FileSpreadsheet, permissions: ['Payroll.View', 'Report.View'] },
    { to: '/admin/reports', label: 'Production Reports', icon: FileText, permissions: ['Report.View'] },
    { to: '/admin/departments', label: 'Departments', icon: Building2, permissions: ['Department.View', 'Department.Manage'] },
    { to: '/admin/designations', label: 'Designations', icon: Briefcase, permissions: ['Designation.View', 'Designation.Manage'] },
  ] as NavItem[]).filter(item => !item.permissions || hasAnyPermission(item.permissions));

  const hybridEmployeeGroups = [
    ...employeeNavGroups,
    ...(employeeAdminItems.length > 0
      ? [{
        title: 'ADMINISTRATION & MANAGEMENT',
        items: employeeAdminItems
      }]
      : [])
  ];

  // Filter groups according to permissions for pure admins
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

  const groups = isPureAdmin ? filteredAdminGroups : hybridEmployeeGroups;

  const formatDisplayName = (name?: string) => {
    if (!name) return isPureAdmin ? 'Administrator' : 'Employee';
    if (name.includes('@')) {
      const localPart = name.split('@')[0];
      const cleanName = localPart.replace(/[0-9._-]/g, ' ').trim();
      if (!cleanName) return isPureAdmin ? 'Administrator' : 'Employee';
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
    : isPureAdmin
      ? 'ADMIN'
      : 'EMPLOYEE';

  return (
    <aside style={{
      width: collapsed ? '72px' : '248px',
      minWidth: collapsed ? '72px' : '248px',
      transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 101,
    }}>
      <style>{`
        .rims-sidebar-collapse-btn {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-secondary);
          width: 24px;
          height: 24px;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .rims-sidebar-collapse-btn:hover {
          color: var(--primary);
          border-color: var(--border-hover);
          background: var(--bg-hover);
        }
        .rims-sidebar-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 8px;
          font-size: 13.5px;
          text-decoration: none;
          transition: all 0.15s ease;
          overflow: hidden;
        }
        .rims-sidebar-nav-link.inactive {
          color: var(--text-secondary);
          font-weight: 500;
          background: transparent;
        }
        .rims-sidebar-nav-link.inactive:hover {
          background: var(--bg-hover);
          color: var(--text-main);
        }
        .rims-sidebar-nav-link.inactive:hover .rims-nav-icon {
          color: var(--text-main) !important;
        }
        .rims-sidebar-nav-link.active {
          background: var(--primary-tint);
          color: var(--primary);
          font-weight: 600;
        }
        .rims-sidebar-nav-link.active .rims-nav-icon {
          color: var(--primary) !important;
        }
        .rims-profile-card:hover {
          background: var(--bg-hover);
          border-radius: 8px;
        }
        .rims-logout-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.15s ease;
        }
        .rims-logout-btn:hover {
          color: var(--danger);
          background: var(--danger-bg);
        }
      `}</style>

      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '18px 10px' : '20px 18px 16px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-sidebar)',
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
              <div style={{ fontWeight: 700, fontSize: '14.5px', letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
                RIMS
              </div>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
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
          className="rims-sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Grouped Navigation */}
      <nav style={{ padding: collapsed ? '14px 8px' : '16px 12px', flex: 1, overflowY: 'auto' }}>
        {groups.map((group, groupIdx) => (
          <div
            key={groupIdx}
            style={{
              marginBottom: '16px',
              marginTop: groupIdx > 0 ? '18px' : 0,
              borderTop: groupIdx > 0 ? '1px solid var(--border)' : 'none',
              paddingTop: groupIdx > 0 ? '14px' : 0
            }}
          >
            {!collapsed && (
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: 'var(--text-faint)',
                textTransform: 'uppercase',
                padding: '0 10px 8px 10px'
              }}>
                {group.title}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {group.items.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `rims-sidebar-nav-link ${isActive ? 'active' : 'inactive'}`
                    }
                    style={{
                      padding: collapsed ? '10px 0' : '10px 14px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '3.5px',
                            borderRadius: '0 4px 4px 0',
                            background: 'var(--primary)'
                          }} />
                        )}
                        <Icon
                          className="rims-nav-icon"
                          size={16}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          style={{
                            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            flexShrink: 0,
                            transition: 'color 0.15s ease'
                          }}
                        />
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

      {/* User Profile & Logout (Docked Bottom) */}
      <div style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-sidebar)',
        padding: collapsed ? '12px 8px' : '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div
              className="rims-profile-card"
              onClick={() => navigate(profilePath)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                overflow: 'hidden',
                padding: '4px 6px',
                margin: '-4px -6px',
                cursor: 'pointer',
                flex: 1,
                transition: 'background 0.15s ease'
              }}
              title="Click to view My Profile"
            >
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--primary-tint)',
                border: '1.5px solid rgba(232, 135, 60, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--primary)',
                flexShrink: 0,
                boxShadow: 'var(--shadow-xs)'
              }}>
                {getInitials(user?.employeeName)}
              </div>
              <div style={{ lineHeight: 1.25, overflow: 'hidden' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {formatDisplayName(user?.employeeName)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.roles && user.roles.length > 0 ? user.roles.join(', ') : (role || 'Employee')}
                </div>
              </div>
            </div>

            <button
              className="rims-logout-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
            <button
              onClick={() => navigate(profilePath)}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--primary-tint)',
                border: '1.5px solid rgba(232, 135, 60, 0.4)',
                color: 'var(--primary)',
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
              className="rims-logout-btn"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
