import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Bell, Clock } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);

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

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header style={{
      height: '60px',
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Left: Global Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '360px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search..."
            style={{
              width: '100%',
              padding: '0.4rem 0.75rem 0.4rem 2.1rem',
              fontSize: '0.8rem',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              outline: 'none',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {/* Right: Clock, Notifications & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Live IST Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-color)',
          padding: '0.3rem 0.65rem',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          fontSize: '0.75rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums'
        }}>
          <Clock size={13} style={{ color: 'var(--primary)' }} />
          <span>{timeStr || '12:00:00 PM'} IST</span>
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
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
          >
            <Bell size={16} />
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)',
              boxShadow: '0 0 0 2px #FFFFFF'
            }} />
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '42px',
              width: '280px',
              background: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.85rem',
              zIndex: 200,
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)' }}>Notifications</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Mark all read</span>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', padding: '0.4rem 0' }}>
                🟢 Attendance synced for today<br />
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Just now</span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div 
          onClick={() => navigate(role === 'Admin' ? '/admin/profile' : '/profile')}
          title="View My Profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.25rem 0.6rem 0.25rem 0.6rem',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {user?.employeeName || 'System Admin'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>
              {role || 'Administrator'}
            </div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #4F46E5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.75rem',
            position: 'relative',
            flexShrink: 0
          }}>
            {getInitials(user?.employeeName)}
            <span style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              border: '2px solid #FFFFFF'
            }} />
          </div>
        </div>
      </div>
    </header>
  );
};
