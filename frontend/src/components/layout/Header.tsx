import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import apiClient from '../../api/client';
import { Bell, LogOut, ChevronDown, Calendar, ShieldCheck, Clock, AlertTriangle, Settings, ExternalLink, CheckCircle2, PartyPopper, X, Sun, Moon, Check } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Category Preference Toggles
  const [prefLeave, setPrefLeave] = useState(true);
  const [prefPermission, setPrefPermission] = useState(true);
  const [prefLateLogin, setPrefLateLogin] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);

  // Page title mapping based on current pathname
  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/dashboard':
      case '/admin/dashboard':
        return { title: 'Dashboard', category: 'Overview' };
      case '/admin/attendance-permissions':
        return { title: 'Attendance & Permissions', category: 'Overview' };
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
      case '/calendar':
      case '/admin/attendance-calendar':
        return { title: 'Attendance Calendar', category: 'Overview' };
      case '/deployments':
      case '/admin/deployments':
        return { title: 'Product Deployment History', category: 'Deployments' };
      case '/admin/deployment-access':
        return { title: 'Employee Product Access', category: 'Deployments' };
      case '/profile':
      case '/admin/profile':
        return { title: 'My Profile', category: 'Account' };
      case '/admin/notifications':
        return { title: 'Notification Center', category: 'System' };
      default:
        return { title: 'Employee Portal', category: 'RIMS' };
    }
  };

  const pageMeta = getPageMeta(location.pathname);

  // Fetch notifications based on role
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      if (user.role === 'Admin') {
        const res = await apiClient.get('/reports/admin-notifications');
        if (res.data.success) {
          const data = res.data.data;
          setNotificationsList(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } else {
        const res = await apiClient.get('/support/demo-followups/my-pending');
        if (res.data.success) {
          setNotificationsList(res.data.data || []);
          setUnreadCount(res.data.data.length || 0);
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close notification dropdown on outside click or Escape key
  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        notificationContainerRef.current &&
        !notificationContainerRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        bellButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  // Close profile menu on outside click or Escape key
  useEffect(() => {
    if (!showProfileMenu) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfileMenu]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleClearAll = async () => {
    setActionError(null);
    const backupList = [...notificationsList];
    const backupUnread = unreadCount;

    if (user?.role === 'Admin') {
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      try {
        await apiClient.post('/reports/admin-notifications/read-all');
      } catch (err) {
        console.error('Clear All failed:', err);
        setNotificationsList(backupList);
        setActionError("Couldn't clear notifications — please try again.");
        setTimeout(() => setActionError(null), 4000);
      }
    } else {
      setNotificationsList([]);
      setUnreadCount(0);
      try {
        await apiClient.post('/support/demo-followups/complete-all');
      } catch (err) {
        console.error('Clear All follow-ups failed:', err);
        setNotificationsList(backupList);
        setUnreadCount(backupUnread);
        setActionError("Couldn't clear reminders — please try again.");
        setTimeout(() => setActionError(null), 4000);
      }
    }
  };

  const handleDismissSingle = async (e: React.MouseEvent, key: string | number) => {
    e.stopPropagation();
    setActionError(null);
    const backupList = [...notificationsList];
    const backupUnread = unreadCount;

    if (user?.role === 'Admin') {
      setNotificationsList((prev) =>
        prev.map((n) => (n.key === key ? { ...n, isRead: true } : n))
      );
      try {
        await apiClient.post('/reports/admin-notifications/read', { key });
      } catch (err) {
        console.error('Dismiss notification failed:', err);
        setNotificationsList(backupList);
        setActionError("Couldn't dismiss notification — please try again.");
        setTimeout(() => setActionError(null), 4000);
      }
    } else {
      setNotificationsList((prev) => prev.filter((n) => n.id !== key));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await apiClient.post(`/support/demo-followups/${key}/complete`);
      } catch (err) {
        console.error('Dismiss follow-up failed:', err);
        setNotificationsList(backupList);
        setUnreadCount(backupUnread);
        setActionError("Couldn't dismiss reminder — please try again.");
        setTimeout(() => setActionError(null), 4000);
      }
    }
  };

  const handleNotificationClick = async (item: any) => {
    setShowNotifications(false);
    if (user?.role === 'Admin') {
      if (!item.isRead) {
        setNotificationsList((prev) =>
          prev.map((n) => (n.key === item.key ? { ...n, isRead: true } : n))
        );
        try {
          await apiClient.post('/reports/admin-notifications/read', { key: item.key });
        } catch {
          // Ignore
        }
      }
      navigate(item.targetUrl || '/admin/dashboard');
    } else {
      navigate('/work-task');
    }
  };

  const filteredList = notificationsList.filter((item) => {
    if (user?.role !== 'Admin') return true;
    if (item.category === 'LeaveRequest' && !prefLeave) return false;
    if (item.category === 'PermissionRequest' && !prefPermission) return false;
    if (item.category === 'LateLogin' && !prefLateLogin) return false;
    return true;
  });

  const unreadItems = filteredList.filter((item) => !item.isRead);
  const calculatedUnreadCount = user?.role === 'Admin' ? unreadItems.length : unreadCount;

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
      background: 'var(--panel)',
      borderBottom: '1px solid var(--border)',
      padding: '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
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
        <div ref={notificationContainerRef} style={{ position: 'relative' }}>
          <button
            ref={bellButtonRef}
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            style={{
              background: showNotifications ? 'var(--primary-tint)' : 'var(--panel-raised)',
              border: showNotifications ? '1px solid rgba(232, 135, 60, 0.3)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: showNotifications ? 'var(--primary)' : (calculatedUnreadCount > 0 ? 'var(--primary)' : 'var(--text-dim)'),
              cursor: 'pointer',
              position: 'relative',
              boxShadow: showNotifications ? '0 0 0 2px rgba(232, 135, 60, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title={showNotifications ? "Close notifications" : "Notifications & Alerts"}
            aria-expanded={showNotifications}
            aria-label="Notifications & Alerts"
          >
            <Bell size={16} fill={showNotifications ? 'currentColor' : 'none'} />
            {calculatedUnreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'linear-gradient(135deg, #ef4444, #f87171)',
                color: '#FFFFFF',
                fontSize: '0.6rem',
                fontWeight: 700,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px var(--panel)',
              }}>
                {calculatedUnreadCount > 99 ? '99+' : calculatedUnreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '360px',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.9rem',
              zIndex: 100,
              animation: 'fadeIn 0.15s ease-out'
            }}>
              {/* Header Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.65rem',
                borderBottom: '1px solid var(--border-soft)',
                paddingBottom: '0.55rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    {user?.role === 'Admin' ? 'Admin Alerts & Requests' : 'Follow-Up Reminders'}
                  </span>
                  {user?.role === 'Admin' && (
                    <button
                      type="button"
                      onClick={() => setShowPrefs(!showPrefs)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: showPrefs ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Notification Preferences"
                    >
                      <Settings size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {calculatedUnreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{
                        background: 'var(--primary-tint)',
                        border: '1px solid rgba(232, 135, 60, 0.3)',
                        borderRadius: '6px',
                        color: 'var(--primary)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0.2rem 0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                      title="Clear all notifications"
                    >
                      Clear All
                    </button>
                  )}
                  <span className={`badge ${calculatedUnreadCount > 0 ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.675rem' }}>
                    {calculatedUnreadCount} New
                  </span>

                  {/* Panel-Level Close Button */}
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      marginLeft: '2px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'none';
                    }}
                    title="Close notifications panel"
                    aria-label="Close notifications panel"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Preferences Filter Panel */}
              {showPrefs && user?.role === 'Admin' && (
                <div style={{
                  background: 'var(--panel-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.65rem',
                  marginBottom: '0.65rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-dim)', fontSize: '0.7rem' }}>Filter Alerts:</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={prefLeave} onChange={(e) => setPrefLeave(e.target.checked)} style={{ accentColor: '#E8873C' }} />
                    <span>Leave Requests</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={prefPermission} onChange={(e) => setPrefPermission(e.target.checked)} style={{ accentColor: '#E8873C' }} />
                    <span>Permission Requests</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={prefLateLogin} onChange={(e) => setPrefLateLogin(e.target.checked)} style={{ accentColor: '#EF4444' }} />
                    <span>Late Login Alerts</span>
                  </label>
                </div>
              )}

              {/* Action Error Banner */}
              {actionError && (
                <div style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(216, 64, 74, 0.3)',
                  color: 'var(--danger-text)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.725rem',
                  marginBottom: '0.5rem',
                  textAlign: 'center',
                }}>
                  {actionError}
                </div>
              )}

              {/* Notification List Body */}
              {(user?.role === 'Admin' ? filteredList.filter(n => !n.isRead).length : filteredList.length) === 0 ? (
                <div style={{ padding: '1.25rem 0.5rem', textAlign: 'center' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'var(--success-bg)',
                    border: '1px solid rgba(21, 154, 99, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem auto',
                    color: 'var(--success)'
                  }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    You're all caught up!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                    {user?.role === 'Admin' ? 'No new notifications — all requests & alerts cleared.' : 'No pending follow-up reminders.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
                  {user?.role === 'Admin' ? (
                    filteredList.filter(n => !n.isRead).map((item) => (
                      <div
                        key={item.key}
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          background: 'var(--primary-tint)',
                          border: '1px solid rgba(232, 135, 60, 0.25)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          position: 'relative',
                        }}
                      >
                        {/* Icon */}
                        <div style={{ marginTop: '2px', flexShrink: 0 }}>
                          {item.category === 'LeaveRequest' && <Calendar size={15} style={{ color: 'var(--primary)' }} />}
                          {item.category === 'PermissionRequest' && <Clock size={15} style={{ color: 'var(--primary)' }} />}
                          {item.category === 'LateLogin' && <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />}
                          {item.category === 'Celebration' && <PartyPopper size={15} style={{ color: 'var(--violet)' }} />}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, paddingRight: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.title}
                            </span>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', marginLeft: '6px' }} />
                          </div>
                          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                            {item.message}
                          </p>
                        </div>

                        {/* Dismiss X button */}
                        <button
                          type="button"
                          onClick={(e) => handleDismissSingle(e, item.key)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 4px',
                            lineHeight: 1,
                            borderRadius: '4px',
                            transition: 'color 0.12s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                          title="Dismiss notification"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    notificationsList.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          padding: '0.55rem 0.7rem',
                          borderRadius: '10px',
                          background: 'var(--primary-tint)',
                          border: '1px solid rgba(232, 135, 60, 0.25)',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.775rem', fontWeight: 600, gap: '0.5rem' }}>
                            <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</span>
                            <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', flexShrink: 0 }}>
                              <Calendar size={11} /> {new Date(item.followUpDate).toLocaleDateString()}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                            Client: <strong style={{ color: 'var(--text-main)' }}>{item.clientCompanyName}</strong>
                          </p>
                        </div>

                        {/* Dismiss X button */}
                        <button
                          type="button"
                          onClick={(e) => handleDismissSingle(e, item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '1px 3px',
                            lineHeight: 1,
                            borderRadius: '4px',
                            transition: 'color 0.12s ease',
                            flexShrink: 0,
                            marginTop: '-1px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                          title="Dismiss reminder"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Panel Footer */}
              {user?.role === 'Admin' && (
                <div style={{
                  borderTop: '1px solid var(--border-soft)',
                  paddingTop: '0.5rem',
                  marginTop: '0.5rem',
                  textAlign: 'center',
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/admin/notifications');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>View All Notifications</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        <div style={{ height: '20px', width: '1px', background: 'var(--border)' }} />

        {/* User Profile Menu */}
        <div ref={profileMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: 'var(--panel-raised)',
              border: '1px solid var(--border)',
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
              width: '210px',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.4rem',
              zIndex: 100,
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid var(--border-soft)', marginBottom: '0.3rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)' }}>{formatDisplayName(user?.employeeName, user?.role)}</div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>{user?.role} Portal</div>
              </div>

              {/* Theme Selection in Profile Menu */}
              <div style={{ padding: '0.35rem 0.65rem', borderBottom: '1px solid var(--border-soft)', marginBottom: '0.3rem' }}>
                <div style={{ fontSize: '0.675rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Theme Preference
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '5px 8px',
                      fontSize: '0.725rem',
                      fontWeight: theme === 'light' ? 700 : 500,
                      borderRadius: '6px',
                      border: theme === 'light' ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: theme === 'light' ? 'var(--primary-tint)' : 'transparent',
                      color: theme === 'light' ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <Sun size={13} />
                    <span>Light</span>
                    {theme === 'light' && <Check size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '5px 8px',
                      fontSize: '0.725rem',
                      fontWeight: theme === 'dark' ? 700 : 500,
                      borderRadius: '6px',
                      border: theme === 'dark' ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: theme === 'dark' ? 'var(--primary-tint)' : 'transparent',
                      color: theme === 'dark' ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <Moon size={13} />
                    <span>Dark</span>
                    {theme === 'dark' && <Check size={12} />}
                  </button>
                </div>
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
