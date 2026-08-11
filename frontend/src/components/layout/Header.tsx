import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';
import { Bell, LogOut, ChevronDown, Calendar, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [pendingRemindersCount, setPendingRemindersCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  // Page title mapping based on current pathname
  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/dashboard':
      case '/admin/dashboard':
        return { title: 'Dashboard', category: 'Overview' };
      case '/work-task':
        return { title: 'Work Task Engine', category: 'Time & Work Log' };
      case '/leave':
        return { title: 'Leave Requests', category: 'Time Off' };
      case '/permission':
        return { title: 'Permissions', category: 'Time Off' };
      case '/payslip':
        return { title: 'Payslips', category: 'Payroll' };
      case '/admin/approvals':
        return { title: 'Approval Queue', category: 'Administration' };
      case '/admin/payroll':
        return { title: 'Payroll & LOP', category: 'Administration' };
      case '/admin/reports':
        return { title: 'Production Reports', category: 'Reports' };
      case '/admin/employees':
        return { title: 'Employees', category: 'Organization' };
      case '/admin/departments':
        return { title: 'Departments', category: 'Organization' };
      case '/admin/designations':
        return { title: 'Designations', category: 'Organization' };
      case '/admin/products':
        return { title: 'Products', category: 'Master Data' };
      case '/admin/clients':
        return { title: 'Clients', category: 'Master Data' };
      case '/admin/mappings':
        return { title: 'Product-Client Maps', category: 'Master Data' };
      case '/admin/lookups':
        return { title: 'Master Lookups', category: 'System' };
      case '/admin/settings':
        return { title: 'System Settings', category: 'System' };
      default:
        return { title: 'Employee Portal', category: 'RIMS' };
    }
  };

  const pageMeta = getPageMeta(location.pathname);

  // Fetch demo follow-up reminders count
  const fetchNotifications = async () => {
    if (!user || user.role !== 'Employee') return;
    try {
      const res = await apiClient.get('/support/demo-followups/my-pending');
      if (res.data.success) {
        setNotificationsList(res.data.data);
        setPendingRemindersCount(res.data.data.length);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
    const displayName = formatDisplayName(name, user?.role);
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.substring(0, 2).toUpperCase();
  };

  return (
    <header style={{
      height: '60px',
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 90,
    }}>
      {/* Breadcrumb / Page Title */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {pageMeta.category}
        </div>
        <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {pageMeta.title}
        </h1>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.12s ease'
            }}
            title="Notifications & Reminders"
          >
            <Bell size={16} />
            {pendingRemindersCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                backgroundColor: 'var(--danger)',
                color: '#FFFFFF',
                fontSize: '0.6rem',
                fontWeight: 700,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px #FFFFFF',
              }}>
                {pendingRemindersCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '300px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.85rem',
              zIndex: 100,
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.65rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.45rem',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)' }}>Follow-Up Reminders</span>
                <span className="badge badge-warning">{pendingRemindersCount} Pending</span>
              </div>

              {notificationsList.length === 0 ? (
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.75rem 0' }}>
                  No pending follow-up reminders.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {notificationsList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate('/work-task');
                      }}
                      style={{
                        padding: '0.5rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-hover)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', fontWeight: 600 }}>
                        <span>{item.productName}</span>
                        <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}>
                          <Calendar size={11} /> {new Date(item.followUpDate).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Client: {item.clientCompanyName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem 0.25rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.12s ease',
              fontFamily: 'inherit'
            }}
          >
            {/* Avatar */}
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

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {formatDisplayName(user?.employeeName, user?.role)}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>
                {user?.role}
              </span>
            </div>

            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '200px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.35rem',
              zIndex: 100,
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.3rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)' }}>{formatDisplayName(user?.employeeName, user?.role)}</div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>{user?.role} Portal</div>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/change-password');
                }}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.775rem', padding: '0.4rem 0.65rem' }}
              >
                <ShieldCheck size={15} />
                <span>Change Password</span>
              </button>

              <button
                onClick={handleLogout}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.775rem', padding: '0.4rem 0.65rem', color: 'var(--danger)' }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
