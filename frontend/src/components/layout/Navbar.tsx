import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';
import { Search, Clock, Calendar, AlertTriangle, Settings, ExternalLink, CheckCircle2, PartyPopper } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  // Preference Filters
  const [prefLeave, setPrefLeave] = useState(true);
  const [prefPermission, setPrefPermission] = useState(true);
  const [prefLateLogin, setPrefLateLogin] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      if (role === 'Admin') {
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
  }, [user, role]);

  const handleClearAll = async () => {
    setActionError(null);
    const backupList = [...notificationsList];
    // Optimistic UI update: mark all as read
    setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      if (role === 'Admin') {
        await apiClient.post('/reports/admin-notifications/read-all');
      }
    } catch (err) {
      console.error('Clear All failed:', err);
      setNotificationsList(backupList);
      setActionError("Couldn't clear notifications — please try again.");
      setTimeout(() => setActionError(null), 4000);
    }
  };

  const handleDismissSingle = async (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setActionError(null);
    const backupList = [...notificationsList];
    // Optimistic UI update: mark single item as read
    setNotificationsList((prev) =>
      prev.map((n) => (n.key === key ? { ...n, isRead: true } : n))
    );

    try {
      if (role === 'Admin') {
        await apiClient.post('/reports/admin-notifications/read', { key });
      }
    } catch (err) {
      console.error('Dismiss notification failed:', err);
      setNotificationsList(backupList);
      setActionError("Couldn't dismiss notification — please try again.");
      setTimeout(() => setActionError(null), 4000);
    }
  };

  const handleNotificationClick = async (item: any) => {
    setShowNotifications(false);
    if (role === 'Admin') {
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
    if (role !== 'Admin') return true;
    if (item.category === 'LeaveRequest' && !prefLeave) return false;
    if (item.category === 'PermissionRequest' && !prefPermission) return false;
    if (item.category === 'LateLogin' && !prefLateLogin) return false;
    return true;
  });

  const unreadItems = filteredList.filter((item) => !item.isRead);
  const calculatedUnreadCount = role === 'Admin' ? unreadItems.length : unreadCount;

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatDisplayName = (name?: string, userRole?: string) => {
    if (!name) return userRole === 'Admin' ? 'System Admin' : 'Employee';
    if (name.includes('@')) {
      const localPart = name.split('@')[0];
      const cleanName = localPart.replace(/[0-9._-]/g, ' ').trim();
      if (!cleanName) return userRole === 'Admin' ? 'System Admin' : 'Employee';
      return cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return name;
  };

  return (
    <div className="topbar">
      {/* Search Bar */}
      <div className="search">
        <Search size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search employees, tasks, ref IDs…"
        />
      </div>

      {/* Clock */}
      <div className="clock">
        🕐 {timeStr || '12:00:00 PM'} <span className="tz">IST</span>
      </div>

      {/* Notification Bell */}
      <div style={{ position: 'relative' }}>
        <div
          className={`bell ${calculatedUnreadCount > 0 ? 'has-unread' : ''}`}
          onClick={() => setShowNotifications(!showNotifications)}
          title="Notifications & Alerts"
        >
          🔔
        </div>

        {/* Notifications Dropdown Panel */}
        {showNotifications && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '360px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            padding: '1rem',
            zIndex: 200,
            animation: 'fadeIn 0.15s ease-out'
          }}>
            {/* Header Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.65rem',
                borderBottom: '1px solid #f0f0f0',
                paddingBottom: '0.55rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                    {role === 'Admin' ? 'Admin Alerts & Requests' : 'Follow-Up Reminders'}
                  </span>
                  {role === 'Admin' && (
                    <button
                      type="button"
                      onClick={() => setShowPrefs(!showPrefs)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: showPrefs ? '#E8873C' : '#9ca3af',
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {role === 'Admin' && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{
                        background: '#fff4e6',
                        border: '1px solid #fed7aa',
                        borderRadius: '6px',
                        color: '#E8873C',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0.2rem 0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                      title="Mark all notifications as read and clear from view"
                    >
                      Clear All
                    </button>
                  )}
                  <span className={`badge ${calculatedUnreadCount > 0 ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.675rem' }}>
                    {calculatedUnreadCount} New
                  </span>
                </div>
              </div>

              {/* Preferences Filter Panel */}
              {showPrefs && role === 'Admin' && (
                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '0.5rem 0.65rem',
                  marginBottom: '0.65rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}>
                  <div style={{ fontWeight: 600, color: '#6b7280', fontSize: '0.7rem' }}>Filter Alerts:</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" checked={prefLeave} onChange={(e) => setPrefLeave(e.target.checked)} style={{ accentColor: '#E8873C' }} />
                    <span>Leave Requests</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" checked={prefPermission} onChange={(e) => setPrefPermission(e.target.checked)} style={{ accentColor: '#E8873C' }} />
                    <span>Permission Requests</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" checked={prefLateLogin} onChange={(e) => setPrefLateLogin(e.target.checked)} style={{ accentColor: '#EF4444' }} />
                    <span>Late Login Alerts</span>
                  </label>
                </div>
              )}

              {/* Action Error Banner */}
              {actionError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
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
              {(role === 'Admin' ? filteredList.filter(n => !n.isRead).length : filteredList.length) === 0 ? (
                <div style={{ padding: '1.25rem 0.5rem', textAlign: 'center' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem auto',
                    color: '#059669'
                  }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', marginBottom: '0.25rem' }}>
                    You're all caught up!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
                    {role === 'Admin' ? 'No new notifications — all requests & alerts cleared.' : 'No pending follow-up reminders.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
                  {role === 'Admin' ? (
                    filteredList.filter(n => !n.isRead).map((item) => (
                      <div
                        key={item.key}
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          background: '#fff7ed',
                          border: '1px solid #fed7aa',
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
                          {item.category === 'LeaveRequest' && <Calendar size={15} style={{ color: '#E8873C' }} />}
                          {item.category === 'PermissionRequest' && <Clock size={15} style={{ color: '#E8873C' }} />}
                          {item.category === 'LateLogin' && <AlertTriangle size={15} style={{ color: '#EF4444' }} />}
                          {item.category === 'Celebration' && <PartyPopper size={15} style={{ color: '#8B5CF6' }} />}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, paddingRight: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#111827' }}>
                              {item.title}
                            </span>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E8873C', display: 'inline-block', marginLeft: '6px' }} />
                          </div>
                          <p style={{ fontSize: '0.74rem', color: '#4b5563', margin: 0, lineHeight: 1.35 }}>
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
                            color: '#9ca3af',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 4px',
                            lineHeight: 1,
                            borderRadius: '4px',
                            transition: 'color 0.12s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
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
                          padding: '0.5rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', fontWeight: 600 }}>
                          <span style={{ color: '#111827' }}>{item.productName}</span>
                          <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}>
                            <Calendar size={11} /> {new Date(item.followUpDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.15rem' }}>
                          Client: {item.clientCompanyName}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Panel Footer */}
              {role === 'Admin' && (
                <div style={{
                  borderTop: '1px solid #f0f0f0',
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
                      color: '#E8873C',
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

        {/* User Profile */}
      {/* Profile Chip */}
      <div
        className="who-chip"
        onClick={() => navigate(role === 'Admin' ? '/admin/profile' : '/profile')}
        title="View My Profile"
      >
        <div>
          <div className="n">{formatDisplayName(user?.employeeName, user?.role)}</div>
          <div className="r">{role || 'Admin'}</div>
        </div>
        <div className="avatar">
          {getInitials(user?.employeeName)}
        </div>
      </div>
    </div>
  );
};
