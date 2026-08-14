import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  Coffee,
  PhoneCall,
  Phone,
  PhoneOff,
  Headphones,
  Users,
  MessageSquare,
  Monitor,
  Utensils,
  User,
  MoreHorizontal,
  StopCircle,
  Clock,
  Check,
  Calendar,
  Sparkles,
  AlertCircle,
  X,
  Info,
} from 'lucide-react';

interface LookupItem {
  id: number;
  name: string;
}

interface ActiveBreak {
  id: number;
  breakTypeId: number;
  breakTypeName: string;
  startTime: string;
}

interface ActiveSupport {
  id: number;
  activityTypeId: number;
  activityTypeName: string;
  startTime: string;
}

interface Product {
  id: number;
  name: string;
  code: string;
}

interface Client {
  id: number;
  companyName: string;
}

const getBreakIcon = (name: string, isActive: boolean = false, size: number = 16) => {
  const iconColor = isActive ? '#E8873C' : 'rgba(255, 255, 255, 0.7)';
  const lower = name.toLowerCase();

  if (lower.includes('bio')) {
    return <User size={size} style={{ color: iconColor }} />;
  }
  if (lower.includes('tea') || lower.includes('coffee')) {
    return <Coffee size={size} style={{ color: iconColor }} />;
  }
  if (lower.includes('lunch') || lower.includes('food') || lower.includes('meal')) {
    return <Utensils size={size} style={{ color: iconColor }} />;
  }
  if (lower.includes('call') || lower.includes('phone')) {
    return <PhoneOff size={size} style={{ color: iconColor }} />;
  }
  return <MoreHorizontal size={size} style={{ color: iconColor }} />;
};

const getSupportIcon = (name: string, isActive: boolean = false, size: number = 16) => {
  const iconColor = isActive ? '#E8873C' : 'rgba(255, 255, 255, 0.7)';
  const lower = name.toLowerCase();

  if (lower.includes('support')) {
    return <Headphones size={size} style={{ color: iconColor }} />;
  }
  if (lower.includes('meeting')) {
    return <Users size={size} style={{ color: iconColor }} />;
  }
  if (lower.includes('discussion') || lower.includes('chat')) {
    return <MessageSquare size={size} style={{ color: iconColor }} />;
  }
  if (lower.includes('demo') || lower.includes('presentation')) {
    return <Monitor size={size} style={{ color: iconColor }} />;
  }
  if (lower.includes('call') || lower.includes('phone')) {
    return <Phone size={size} style={{ color: iconColor }} />;
  }
  return <PhoneCall size={size} style={{ color: iconColor }} />;
};

export const PersistentActivityBar: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId || 0;

  const [breakTypes, setBreakTypes] = useState<LookupItem[]>([]);
  const [supportTypes, setSupportTypes] = useState<LookupItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);

  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null);
  const [activeSupport, setActiveSupport] = useState<ActiveSupport | null>(null);

  // Stop / Demo Modal State
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopRemarks, setStopRemarks] = useState('');
  const [stopProductId, setStopProductId] = useState<number | 'CUSTOM' | ''>('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');

  const [stopClientId, setStopClientId] = useState<number | 'CUSTOM' | ''>('');
  const [isCustomClient, setIsCustomClient] = useState(false);
  const [customClientName, setCustomClientName] = useState('');

  const [productError, setProductError] = useState('');
  const [clientError, setClientError] = useState('');

  const [followUpDate, setFollowUpDate] = useState('');
  const [stopError, setStopError] = useState('');
  const [stopping, setStopping] = useState(false);

  // Toast confirmation state
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Timer
  const [elapsedSec, setElapsedSec] = useState(0);

  const fetchLookups = async () => {
    try {
      const [breakRes, supportRes, prodRes, clientRes, mappingRes] = await Promise.all([
        apiClient.get('/break-types'),
        apiClient.get('/support-activity-types'),
        apiClient.get('/products'),
        apiClient.get('/clients'),
        apiClient.get('/mappings'),
      ]);

      if (breakRes.data.success) setBreakTypes(breakRes.data.data);
      if (supportRes.data.success) setSupportTypes(supportRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (clientRes.data.success) setClients(clientRes.data.data);
      if (mappingRes.data.success) setMappings(mappingRes.data.data);
    } catch {
      // Ignore
    }
  };

  const availableClients = React.useMemo(() => {
    if (!stopProductId || isCustomProduct) return [];
    const mappedClientIds = mappings
      .filter((m) => m.productId === Number(stopProductId) && m.isActive !== false)
      .map((m) => m.clientId);

    return clients.filter((c) => mappedClientIds.includes(c.id));
  }, [stopProductId, isCustomProduct, clients, mappings]);

  const fetchActiveSessions = async () => {
    if (!employeeId) return;
    try {
      const [breakRes, supportRes] = await Promise.all([
        apiClient.get(`/breaks/active/${employeeId}`),
        apiClient.get(`/support/active/${employeeId}`),
      ]);

      if (breakRes.data.success) setActiveBreak(breakRes.data.data);
      if (supportRes.data.success) setActiveSupport(supportRes.data.data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchLookups();
    if (employeeId) {
      fetchActiveSessions();
    }
  }, [employeeId]);

  useEffect(() => {
    const handleActivityChanged = () => {
      if (employeeId) fetchActiveSessions();
    };
    window.addEventListener('activity-changed', handleActivityChanged);
    return () => window.removeEventListener('activity-changed', handleActivityChanged);
  }, [employeeId]);

  const parseUtcMs = (dateStr: string) => {
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(str).getTime();
  };

  const formatStartTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(parseUtcMs(dateStr));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Live timer for active break or support activity
  useEffect(() => {
    let interval: any = null;
    const activeSession = activeBreak || activeSupport;

    if (activeSession && activeSession.startTime) {
      const startMs = parseUtcMs(activeSession.startTime);
      const updateTimer = () => {
        const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setElapsedSec(diff);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedSec(0);
    }

    return () => clearInterval(interval);
  }, [activeBreak, activeSupport]);

  // Toast auto-hide
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Start Break
  const handleStartBreak = async (typeId: number) => {
    if (activeBreak || activeSupport) {
      alert('Cannot start a new activity while another session is active.');
      return;
    }

    try {
      const res = await apiClient.post('/breaks/start', { breakTypeId: typeId });
      if (res.data.success) {
        fetchActiveSessions();
        window.dispatchEvent(new Event('activity-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start break.');
    }
  };

  // Stop Break
  const handleStopBreak = async () => {
    if (!activeBreak) return;
    try {
      await apiClient.post(`/breaks/${activeBreak.id}/stop`);
      setActiveBreak(null);
      fetchActiveSessions();
      window.dispatchEvent(new Event('activity-changed'));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to stop break.');
    }
  };

  // Start Support activity
  const handleStartSupport = async (typeId: number, typeName: string) => {
    if (activeBreak || activeSupport) {
      alert('Cannot start a new activity while another session is active.');
      return;
    }

    try {
      const res = await apiClient.post('/support/start', { activityTypeId: typeId });
      if (res.data.success) {
        fetchActiveSessions();
        window.dispatchEvent(new Event('activity-changed'));

        // If Demo activity clicked directly, prompt modal automatically or notify
        if (typeName === 'Demo') {
          handleOpenStopSupport();
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start support activity.');
    }
  };

  // Open Stop Support / Demo Modal
  const handleOpenStopSupport = () => {
    setStopRemarks('');
    setStopProductId('');
    setIsCustomProduct(false);
    setCustomProductName('');
    setStopClientId('');
    setIsCustomClient(false);
    setCustomClientName('');
    setStopError('');
    setProductError('');
    setClientError('');
    // Default follow-up date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDate(tomorrow.toISOString().split('T')[0]);
    setShowStopModal(true);
  };

  // Submit Stop Support / Demo Popup
  const handleConfirmStopSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupport) return;

    setStopError('');
    setProductError('');
    setClientError('');

    let hasError = false;

    // Product validation
    if (isCustomProduct) {
      if (!customProductName.trim()) {
        setProductError('Custom product name cannot be empty or only spaces.');
        hasError = true;
      }
    } else if (!stopProductId || stopProductId === 'CUSTOM') {
      setProductError('Please select a Product or choose "+ Add Other Product".');
      hasError = true;
    }

    // Client validation
    if (isCustomClient) {
      if (!customClientName.trim()) {
        setClientError('Custom client company name cannot be empty or only spaces.');
        hasError = true;
      }
    } else if (!stopClientId || stopClientId === 'CUSTOM') {
      setClientError('Please select a Client or choose "+ Add Other Client".');
      hasError = true;
    }

    const isDemo = activeSupport.activityTypeName === 'Demo';
    if (!stopRemarks.trim() || (isDemo && !followUpDate)) {
      setStopError(isDemo ? 'Review remarks and Follow-Up Date are required.' : 'Remarks are required.');
      hasError = true;
    }

    if (hasError) return;

    setStopping(true);

    const payload = {
      productId: isCustomProduct ? null : Number(stopProductId),
      customProductName: isCustomProduct ? customProductName.trim() : null,
      clientId: isCustomClient ? null : Number(stopClientId),
      customClientName: isCustomClient ? customClientName.trim() : null,
    };

    try {
      if (isDemo) {
        await apiClient.post('/support/demo/complete', {
          supportLogId: activeSupport.id,
          ...payload,
          reviewRemarks: stopRemarks.trim(),
          followUpDate,
        });

        setToastNotification(`Demo follow-up reminder has been scheduled for ${new Date(followUpDate).toLocaleDateString()}.`);
      } else {
        await apiClient.post(`/support/${activeSupport.id}/stop`, {
          remarks: stopRemarks.trim(),
          ...payload,
        });

        setToastNotification(`Activity "${activeSupport.activityTypeName}" completed successfully.`);
      }

      setShowStopModal(false);
      setActiveSupport(null);
      fetchActiveSessions();
      window.dispatchEvent(new Event('activity-changed'));
    } catch (err: any) {
      setStopError(err.response?.data?.message || 'Failed to complete support activity.');
    } finally {
      setStopping(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user || user.role !== 'Employee') return null;

  return (
    <>
      {/* Full-Screen Locked Break Modal Overlay */}
      {activeBreak && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          userSelect: 'none',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '360px',
            padding: '1.75rem 1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            animation: 'modalIn 0.2s ease-out',
          }}>
            {/* Amber Circular Icon Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(232, 135, 60, 0.15)',
              color: '#E8873C',
              marginBottom: '0.85rem',
              boxShadow: '0 0 16px rgba(232, 135, 60, 0.2)',
            }}>
              {getBreakIcon(activeBreak.breakTypeName, true, 26)}
            </div>

            {/* Break Title */}
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '0.35rem',
              letterSpacing: '-0.02em',
            }}>
              {activeBreak.breakTypeName}
            </h2>

            {/* Status Badge ("Break in Progress") */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(232, 135, 60, 0.15)',
              border: '1px solid rgba(232, 135, 60, 0.3)',
              color: '#F5C060',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}>
              <span className="pulse-dot" />
              <span>Break in Progress</span>
            </div>

            {/* Live Monospace Timer Card with Amber Arc Ring Accent */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '1.25rem 1rem',
              marginBottom: '1rem',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {/* Thin Amber Circular Arc Progress Indicator Accent */}
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 0 8px rgba(232, 135, 60, 0.45))',
                  animation: 'spin 8s linear infinite',
                }}
              >
                <circle
                  cx="70"
                  cy="70"
                  r="58"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="58"
                  fill="none"
                  stroke="rgba(232, 135, 60, 0.65)"
                  strokeWidth="3"
                  strokeDasharray="95 270"
                  strokeLinecap="round"
                />
              </svg>

              <div style={{
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '2.35rem',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1,
                letterSpacing: '0.04em',
                marginBottom: '0.4rem',
                position: 'relative',
                zIndex: 1,
              }}>
                {formatTimer(elapsedSec)}
              </div>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                position: 'relative',
                zIndex: 1,
              }}>
                Break Duration
              </span>
            </div>

            {/* Started At Timestamp */}
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.1rem',
            }}>
              Started at <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatStartTime(activeBreak.startTime)}</strong>
            </p>

            {/* Stop Break Action Glass Button */}
            <button
              type="button"
              onClick={handleStopBreak}
              className="btn-danger-glass"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                color: '#F87171',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.15)',
                marginBottom: '0.85rem',
              }}
            >
              <StopCircle size={17} style={{ color: '#F87171' }} />
              <span>Stop Break</span>
            </button>

            {/* Helpful Glass Inset Callout */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.65)',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textAlign: 'left',
            }}>
              <Info size={16} style={{ color: 'rgba(255, 255, 255, 0.5)', flexShrink: 0 }} />
              <span>
                Your current task is temporarily <strong>on hold</strong> until you stop the break.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Popup */}
      {toastNotification && (
        <div className="toast-container">
          <div className="toast toast-success">
            <Sparkles size={18} style={{ color: 'var(--success)' }} />
            <span>{toastNotification}</span>
            <button
              onClick={() => setToastNotification(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Activity Bar Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(12, 45, 43, 0.85) 0%, rgba(16, 87, 82, 0.75) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        padding: '0.6rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        {/* Active Session Badge & Counter */}
        {(activeBreak || activeSupport) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span className={`badge ${activeBreak ? 'badge-warning' : 'badge-primary'}`} style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}>
              <Clock size={14} />
              Active: <strong>{activeBreak ? activeBreak.breakTypeName : activeSupport?.activityTypeName}</strong> ({formatTimer(elapsedSec)})
            </span>

            {activeBreak && (
              <button className="btn btn-danger btn-sm" onClick={handleStopBreak}>
                <StopCircle size={14} />
                <span>Stop Break</span>
              </button>
            )}

            {activeSupport && (
              <button className="btn btn-danger btn-sm" onClick={handleOpenStopSupport}>
                <StopCircle size={14} />
                <span>{activeSupport.activityTypeName === 'Demo' ? 'Complete Demo' : 'Stop Activity'}</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Quick Activities:
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              (Clicking automatically holds active work task)
            </span>
          </div>
        )}

        {/* Quick Activity Action Buttons */}
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Breaks Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.2rem' }}>
              Breaks:
            </span>
            {breakTypes.map((bt) => {
              const isThisActive = activeBreak?.breakTypeId === bt.id;
              return (
                <button
                  key={`break-${bt.id}`}
                  type="button"
                  className={`activity-btn ${isThisActive ? 'active' : ''}`}
                  disabled={!!activeSupport || (!!activeBreak && !isThisActive)}
                  onClick={() => handleStartBreak(bt.id)}
                >
                  {getBreakIcon(bt.name, isThisActive, 15)}
                  <span>{bt.name}</span>
                  {isThisActive && <Check size={13} style={{ color: '#E8873C', marginLeft: '0.1rem' }} />}
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255,255,255,0.12)' }} />

          {/* Support Activities Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.2rem' }}>
              Support Activities:
            </span>
            {supportTypes.map((st) => {
              const isThisActive = activeSupport?.activityTypeId === st.id;
              return (
                <button
                  key={`support-${st.id}`}
                  type="button"
                  className={`activity-btn ${isThisActive ? 'active' : ''}`}
                  disabled={!!activeBreak || (!!activeSupport && !isThisActive)}
                  onClick={() => handleStartSupport(st.id, st.name)}
                >
                  {getSupportIcon(st.name, isThisActive, 15)}
                  <span>{st.name}</span>
                  {isThisActive && <Check size={13} style={{ color: '#E8873C', marginLeft: '0.1rem' }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Demo & Support Activity Completion Modal */}
      {showStopModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                {activeSupport?.activityTypeName === 'Demo' ? 'Complete Demo Activity' : 'Complete Support Activity'}
              </h3>
              <button
                onClick={() => setShowStopModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.25rem', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              {activeSupport?.activityTypeName === 'Demo'
                ? 'Select the associated Product and Client, provide demo review notes, and select a Follow-up Date for automatic reminder scheduling.'
                : 'Provide activity outcome notes and select the associated Product and Client.'}
            </p>

            {stopError && (
              <div style={{
                background: 'rgba(240,96,96,0.12)',
                border: '1px solid rgba(240,96,96,0.25)',
                color: '#FF7B7B',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={16} />
                <span>{stopError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmStopSupport}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Product Name *</label>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.785rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                    onClick={() => {
                      const newMode = !isCustomProduct;
                      setIsCustomProduct(newMode);
                      setStopProductId(newMode ? 'CUSTOM' : '');
                      setCustomProductName('');
                      setStopClientId('');
                      setCustomClientName('');
                      setIsCustomClient(false);
                      setProductError('');
                      setClientError('');
                    }}
                  >
                    {isCustomProduct ? '← Select Existing Product' : '+ Add Other Product'}
                  </button>
                </div>

                {isCustomProduct ? (
                  <div>
                    <input
                      type="text"
                      className="form-input"
                      value={customProductName}
                      maxLength={150}
                      onChange={(e) => {
                        setCustomProductName(e.target.value);
                        if (e.target.value.trim()) setProductError('');
                      }}
                      placeholder="Enter Product Name manually..."
                      required
                    />
                    <span style={{ fontSize: '0.725rem', color: 'var(--primary)', marginTop: '0.25rem', display: 'inline-block', fontWeight: 500 }}>
                      ✨ Custom Product Name (Stored on this activity)
                    </span>
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={stopProductId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProductError('');
                      if (val === 'CUSTOM') {
                        setIsCustomProduct(true);
                        setStopProductId('CUSTOM');
                        setCustomProductName('');
                      } else {
                        setIsCustomProduct(false);
                        setStopProductId(val ? Number(val) : '');
                      }
                      setStopClientId('');
                      setCustomClientName('');
                      setIsCustomClient(false);
                    }}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                    <option value="CUSTOM" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      + Add Other Product...
                    </option>
                  </select>
                )}
                {productError && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                    {productError}
                  </span>
                )}
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Client Name *</label>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.785rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                    onClick={() => {
                      const newMode = !isCustomClient;
                      setIsCustomClient(newMode);
                      setStopClientId(newMode ? 'CUSTOM' : '');
                      setCustomClientName('');
                      setClientError('');
                    }}
                    disabled={!isCustomProduct && !stopProductId}
                  >
                    {isCustomClient ? '← Select Existing Client' : '+ Add Other Client'}
                  </button>
                </div>

                {isCustomClient ? (
                  <div>
                    <input
                      type="text"
                      className="form-input"
                      value={customClientName}
                      maxLength={150}
                      onChange={(e) => {
                        setCustomClientName(e.target.value);
                        if (e.target.value.trim()) setClientError('');
                      }}
                      placeholder="Enter Client Name manually..."
                      required
                    />
                    <span style={{ fontSize: '0.725rem', color: 'var(--primary)', marginTop: '0.25rem', display: 'inline-block', fontWeight: 500 }}>
                      ✨ Custom Client Name (Stored on this activity)
                    </span>
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={stopClientId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClientError('');
                      if (val === 'CUSTOM') {
                        setIsCustomClient(true);
                        setStopClientId('CUSTOM');
                        setCustomClientName('');
                      } else {
                        setIsCustomClient(false);
                        setStopClientId(val ? Number(val) : '');
                      }
                    }}
                    required
                    disabled={!isCustomProduct && !stopProductId}
                  >
                    <option value="">
                      {!isCustomProduct && !stopProductId
                        ? 'Select Product First'
                        : availableClients.length === 0 && !isCustomProduct
                          ? 'No Mapped Clients (Use + Add Other Client)'
                          : 'Select Client'}
                    </option>
                    {availableClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                    <option value="CUSTOM" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      + Add Other Client...
                    </option>
                  </select>
                )}
                {clientError && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.2rem', display: 'block' }}>
                    {clientError}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  {activeSupport?.activityTypeName === 'Demo' ? 'Review / Discussion Field *' : 'Remarks / Summary *'}
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={stopRemarks}
                  onChange={(e) => setStopRemarks(e.target.value)}
                  placeholder={activeSupport?.activityTypeName === 'Demo' ? 'Enter demo feedback, client discussion points...' : 'Enter activity outcome or notes...'}
                  required
                />
              </div>

              {activeSupport?.activityTypeName === 'Demo' && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} style={{ color: 'var(--primary)' }} />
                      Follow-up Date *
                    </span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    A reminder will be automatically scheduled for this follow-up date.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowStopModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    !stopRemarks ||
                    (!isCustomProduct && !stopProductId) ||
                    (isCustomProduct && !customProductName.trim()) ||
                    (!isCustomClient && !stopClientId) ||
                    (isCustomClient && !customClientName.trim()) ||
                    (activeSupport?.activityTypeName === 'Demo' && !followUpDate) ||
                    stopping
                  }
                >
                  <Check size={16} />
                  <span>{stopping ? 'Saving...' : activeSupport?.activityTypeName === 'Demo' ? 'Start Demo / Save Follow-Up' : 'Complete Activity'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
