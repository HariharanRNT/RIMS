import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client';
import { Bell, Calendar, Clock, AlertTriangle, CheckCheck, Search, ArrowRight, PartyPopper } from 'lucide-react';

interface NotificationItem {
  key: string;
  id: number;
  employeeId: number;
  category: string; // "LeaveRequest", "PermissionRequest", "LateLogin", "Celebration"
  employeeName: string;
  title: string;
  message: string;
  timestamp: string;
  targetUrl: string;
  isRead: boolean;
  minutesLate?: number;
}

export const AdminNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'All' | 'LeaveRequest' | 'PermissionRequest' | 'LateLogin' | 'Celebration'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Unread' | 'Read'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/reports/admin-notifications');
      if (res.data.success) {
        setNotifications(res.data.data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/reports/admin-notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await apiClient.post('/reports/admin-notifications/read', { key: item.key });
        setNotifications((prev) =>
          prev.map((n) => (n.key === item.key ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark item read:', err);
      }
    }
    if (item.targetUrl) {
      navigate(item.targetUrl);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago (${d.toLocaleDateString()})`;
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeCategory !== 'All' && n.category !== activeCategory) return false;
    if (statusFilter === 'Unread' && n.isRead) return false;
    if (statusFilter === 'Read' && !n.isRead) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = n.employeeName?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      const matchTitle = n.title?.toLowerCase().includes(q);
      if (!matchName && !matchMsg && !matchTitle) return false;
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'LeaveRequest':
        return <Calendar size={18} style={{ color: '#E8873C' }} />;
      case 'PermissionRequest':
        return <Clock size={18} style={{ color: '#E8873C' }} />;
      case 'Celebration':
        return <PartyPopper size={18} style={{ color: '#8B5CF6' }} />;
      case 'LateLogin':
      default:
        return <AlertTriangle size={18} style={{ color: '#EF4444' }} />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={22} style={{ color: '#E8873C' }} />
            <span>Admin Notifications & Alerts</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Real-time feed for Leave Requests, Permission Requests, Late Logins, and Celebration Wishes.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleMarkAllAsRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              background: '#fff',
              border: '1px solid #e5e7eb',
              color: '#374151',
            }}
          >
            <CheckCheck size={16} style={{ color: '#10B981' }} />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Main Glass Card */}
      <div className="ui-card" style={{ padding: '1.5rem' }}>
        {/* Filters Card */}
        <div
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingBottom: '1rem',
          }}
        >
          {/* Category Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'All', label: 'All Notifications', count: notifications.length },
              {
                id: 'LeaveRequest',
                label: 'Leave Requests',
                count: notifications.filter((n) => n.category === 'LeaveRequest').length,
              },
              {
                id: 'PermissionRequest',
                label: 'Permission Requests',
                count: notifications.filter((n) => n.category === 'PermissionRequest').length,
              },
              {
                id: 'LateLogin',
                label: 'Late Logins',
                count: notifications.filter((n) => n.category === 'LateLogin').length,
              },
              {
                id: 'Celebration',
                label: 'Celebrations',
                count: notifications.filter((n) => n.category === 'Celebration').length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                className={`btn ${activeCategory === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.825rem',
                  background: activeCategory === tab.id ? 'var(--primary)' : '#ffffff',
                  borderColor: activeCategory === tab.id ? 'var(--primary)' : '#e5e7eb',
                  color: activeCategory === tab.id ? '#ffffff' : '#374151',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: activeCategory === tab.id ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                    color: activeCategory === tab.id ? '#ffffff' : '#6b7280',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    marginLeft: '0.35rem',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Right Controls: Search & Read Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', fontSize: '0.8125rem', height: '34px' }}
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="form-input"
              style={{ fontSize: '0.8125rem', height: '34px', padding: '0 0.6rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="All">All Status</option>
              <option value="Unread">Unread Only</option>
              <option value="Read">Read Only</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading notification history...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Bell size={36} style={{ color: '#d1d5db', marginBottom: '0.5rem' }} />
            <h3 style={{ color: '#111827' }}>No notifications found</h3>
            <p style={{ fontSize: '0.825rem', color: '#6b7280' }}>
              There are no alerts matching your active filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {filteredNotifications.map((item) => (
              <div
                key={item.key}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9rem 1.15rem',
                  borderRadius: '12px',
                  background: item.isRead
                    ? '#ffffff'
                    : '#fffdfa',
                  border: item.isRead
                    ? '1px solid #e5e7eb'
                    : '1px solid #fed7aa',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  opacity: item.isRead ? 0.75 : 1,
                  boxShadow: item.isRead ? 'none' : '0 1px 3px rgba(232, 135, 60, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Category Icon Badge */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: item.category === 'LateLogin' ? '#fef2f2' : '#fff4e6',
                      border: item.category === 'LateLogin' ? '1px solid #fecaca' : '1px solid #fed7aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Notification Details */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#E8873C',
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.835rem', color: '#374151', lineHeight: 1.4 }}>
                      {item.message}
                    </p>
                    <span style={{ fontSize: '0.725rem', color: '#6b7280', marginTop: '0.25rem', display: 'block' }}>
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Right Action Trigger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      color: '#E8873C',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>{item.category === 'LateLogin' ? 'View Attendance' : 'Review Request'}</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
