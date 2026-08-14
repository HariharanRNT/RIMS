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
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
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
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
          <input
            type="text"
            placeholder="Search..."
            style={{
              width: '100%',
              padding: '0.4rem 0.75rem 0.4rem 2.1rem',
              fontSize: '0.8rem',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)',
              color: '#F5F5F5',
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
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '0.3rem 0.65rem',
          borderRadius: 'var(--radius-sm)',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.75rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums'
        }}>
          <Clock size={13} style={{ color: '#E8873C' }} />
          <span>{timeStr || '12:00:00 PM'} IST</span>
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.6)',
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
              backgroundColor: '#E8873C',
              boxShadow: '0 0 0 2px rgba(0,0,0,0.3)'
            }} />
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '42px',
              width: '280px',
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(24px) saturate(150%)',
              WebkitBackdropFilter: 'blur(24px) saturate(150%)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
              padding: '0.85rem',
              zIndex: 200,
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#F5F5F5' }}>Notifications</span>
                <span style={{ fontSize: '0.7rem', color: '#E8873C', cursor: 'pointer', fontWeight: 600 }}>Mark all read</span>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'rgba(255,255,255,0.6)', padding: '0.4rem 0' }}>
                🟢 Attendance synced for today<br />
                <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.35)' }}>Just now</span>
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
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F5F5F5', lineHeight: 1.2 }}>
              {user?.employeeName || 'System Admin'}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#E8873C', fontWeight: 600 }}>
              {role || 'Administrator'}
            </div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)',
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
              backgroundColor: '#5EE0A0',
              border: '2px solid rgba(0,0,0,0.3)'
            }} />
          </div>
        </div>
      </div>
    </header>
  );
};
