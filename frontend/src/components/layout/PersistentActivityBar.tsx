import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  Coffee,
  PhoneCall,
  StopCircle,
  Clock,
  Check,
  Calendar,
  Sparkles,
  AlertCircle,
  X,
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
  const [stopProductId, setStopProductId] = useState<number | ''>('');
  const [stopClientId, setStopClientId] = useState<number | ''>('');
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
    if (!stopProductId) return [];
    const mappedClientIds = mappings
      .filter((m) => m.productId === Number(stopProductId) && m.isActive !== false)
      .map((m) => m.clientId);

    return clients.filter((c) => mappedClientIds.includes(c.id));
  }, [stopProductId, clients, mappings]);

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
    setStopClientId('');
    setStopError('');
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

    const isDemo = activeSupport.activityTypeName === 'Demo';

    if (!stopRemarks || !stopProductId || !stopClientId || (isDemo && !followUpDate)) {
      setStopError(isDemo ? 'Product, Client, Review remarks, and Follow-Up Date are required.' : 'Product, Client, and Remarks are required.');
      return;
    }

    setStopping(true);
    setStopError('');

    try {
      if (isDemo) {
        await apiClient.post('/support/demo/complete', {
          supportLogId: activeSupport.id,
          productId: Number(stopProductId),
          clientId: Number(stopClientId),
          reviewRemarks: stopRemarks,
          followUpDate,
        });

        setToastNotification(`Demo follow-up reminder has been scheduled for ${new Date(followUpDate).toLocaleDateString()}.`);
      } else {
        await apiClient.post(`/support/${activeSupport.id}/stop`, {
          remarks: stopRemarks,
          productId: Number(stopProductId),
          clientId: Number(stopClientId),
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
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          userSelect: 'none',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '350px',
            padding: '1.5rem 1.25rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-color)',
            animation: 'modalSlideIn 0.2s ease-out',
          }}>
            {/* Icon Pill Header */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              marginBottom: '0.75rem',
              boxShadow: '0 3px 10px rgba(245, 158, 11, 0.15)',
            }}>
              <Coffee size={26} />
            </div>

            {/* Break Title */}
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '0.25rem',
              letterSpacing: '-0.02em',
            }}>
              ☕ {activeBreak.breakTypeName}
            </h2>

            {/* Break in Progress Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              fontSize: '0.725rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#D97706',
                boxShadow: '0 0 0 2px rgba(217, 119, 6, 0.2)',
                display: 'inline-block',
              }} />
              <span>Break in Progress</span>
            </div>

            {/* Live Monospace Timer Card */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem',
              marginBottom: '0.85rem',
            }}>
              <div style={{
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '2.2rem',
                fontWeight: 700,
                color: '#1E1B4B',
                lineHeight: 1,
                letterSpacing: '0.02em',
                marginBottom: '0.3rem',
              }}>
                {formatTimer(elapsedSec)}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Break Duration
              </span>
            </div>

            {/* Started At Timestamp */}
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
            }}>
              Started at <strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatStartTime(activeBreak.startTime)}</strong>
            </p>

            {/* Stop Break Action Button */}
            <button
              onClick={handleStopBreak}
              className="btn btn-danger"
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 3px 10px rgba(239, 68, 68, 0.2)',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <StopCircle size={17} />
              <span>Stop Break</span>
            </button>

            {/* Helpful Notice Callout Box */}
            <div style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 0.65rem',
              fontSize: '0.75rem',
              color: '#1E40AF',
              lineHeight: 1.4,
            }}>
              Your current task is temporarily <strong>on hold</strong> until you stop the break.
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
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.6rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-subtle)',
      }}>
        {/* Active Session Badge & Counter */}
        {(activeBreak || activeSupport) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span className={`badge ${activeBreak ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}>
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
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.2rem' }}>
              Breaks:
            </span>
            {breakTypes.map((bt) => (
              <button
                key={`break-${bt.id}`}
                className="btn btn-secondary btn-sm"
                disabled={!!activeBreak || !!activeSupport}
                onClick={() => handleStartBreak(bt.id)}
                style={{ fontSize: '0.785rem', padding: '0.25rem 0.55rem' }}
              >
                <Coffee size={13} style={{ color: 'var(--warning)' }} />
                <span>{bt.name}</span>
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)' }} />

          {/* Support Activities Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.2rem' }}>
              Support Activities:
            </span>
            {supportTypes.map((st) => (
              <button
                key={`support-${st.id}`}
                className={`btn ${st.name === 'Demo' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                disabled={!!activeBreak || !!activeSupport}
                onClick={() => handleStartSupport(st.id, st.name)}
                style={{ fontSize: '0.785rem', padding: '0.25rem 0.55rem' }}
              >
                <PhoneCall size={13} />
                <span>{st.name}</span>
              </button>
            ))}
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
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: 'var(--danger)',
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
                <label className="form-label">Product Name *</label>
                <select
                  className="form-select"
                  value={stopProductId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setStopProductId(val);
                    setStopClientId('');
                  }}
                  required
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Client Name *</label>
                <select
                  className="form-select"
                  value={stopClientId}
                  onChange={(e) => setStopClientId(e.target.value ? Number(e.target.value) : '')}
                  required
                  disabled={!stopProductId}
                >
                  <option value="">
                    {!stopProductId
                      ? 'Select Product First'
                      : availableClients.length === 0
                      ? 'No Clients Mapped to Product'
                      : 'Select Client'}
                  </option>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
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
                  disabled={!stopRemarks || !stopProductId || !stopClientId || (activeSupport?.activityTypeName === 'Demo' && !followUpDate) || stopping}
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
