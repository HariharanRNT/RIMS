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
  PlayCircle,
  Clock,
  Check,
  Calendar,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  X,
  Info,
} from 'lucide-react';

interface LookupItem {
  id: number;
  name: string;
  allowedMinutes?: number;
}

interface ActiveBreak {
  id: number;
  breakTypeId: number;
  breakTypeName: string;
  allowedMinutes?: number;
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
  const iconColor = isActive ? '#E8873C' : '#6b7280';
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
  const iconColor = isActive ? '#E8873C' : '#6b7280';
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
  const [pendingBreakType, setPendingBreakType] = useState<LookupItem | null>(null);
  const [startingBreak, setStartingBreak] = useState(false);
  const [stoppingBreak, setStoppingBreak] = useState(false);
  const [activeSupport, setActiveSupport] = useState<ActiveSupport | null>(null);
  const [pendingSupportType, setPendingSupportType] = useState<LookupItem | null>(null);
  const [startingSupport, setStartingSupport] = useState(false);

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
      setStartingBreak(true);
      const res = await apiClient.post('/breaks/start', { breakTypeId: typeId });
      if (res.data.success) {
        if (res.data.data) {
          setActiveBreak(res.data.data);
        }
        setPendingBreakType(null);
        fetchActiveSessions();
        window.dispatchEvent(new Event('activity-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start break.');
    } finally {
      setStartingBreak(false);
    }
  };

  // Stop Break
  const handleStopBreak = async () => {
    if (!activeBreak || stoppingBreak) return;
    try {
      setStoppingBreak(true);
      await apiClient.post(`/breaks/${activeBreak.id}/stop`);
      setToastNotification(`Break "${activeBreak.breakTypeName}" stopped successfully.`);
      setActiveBreak(null);
      setPendingBreakType(null);
      fetchActiveSessions();
      window.dispatchEvent(new Event('activity-changed'));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to stop break.');
    } finally {
      setStoppingBreak(false);
    }
  };

  // Start Support activity
  const handleStartSupport = async (typeId: number) => {
    if (activeBreak || activeSupport) {
      alert('Cannot start a new activity while another session is active.');
      return;
    }

    try {
      const res = await apiClient.post('/support/start', { activityTypeId: typeId });
      if (res.data.success) {
        fetchActiveSessions();
        window.dispatchEvent(new Event('activity-changed'));
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

  const formatClock = (totalSec: number, forceHours: boolean = false) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (forceHours || hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Allowed break minutes, stage, and exceeded calculations
  const activeBreakAllowedMinutes = activeBreak
    ? (activeBreak.allowedMinutes || breakTypes.find((bt) => bt.id === activeBreak.breakTypeId)?.allowedMinutes || 15)
    : (pendingBreakType?.allowedMinutes || 15);

  const allowedSec = activeBreakAllowedMinutes * 60;
  const progressRatio = allowedSec > 0 ? (activeBreak ? elapsedSec / allowedSec : 0) : 0;
  const isOverBreak = !!activeBreak && elapsedSec >= allowedSec;
  const isWarningStage = !!activeBreak && !isOverBreak && progressRatio >= 0.8;
  const exceededSec = isOverBreak ? elapsedSec - allowedSec : 0;
  const remainingSec = !isOverBreak ? Math.max(0, allowedSec - elapsedSec) : 0;

  const clampedRatio = Math.min(Math.max(progressRatio, 0), 1);
  const progressPct = Math.round(progressRatio * 100);

  // SVG Progress ring geometry (radius = 76, circumference = 2 * PI * 76 = 477.52)
  const RING_RADIUS = 76;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const strokeDashoffset = isOverBreak ? 0 : RING_CIRCUMFERENCE * (1 - clampedRatio);

  // Standardized format: if either elapsed or allowed is >= 1hr, format both with hh:mm:ss
  const showHours = elapsedSec >= 3600 || allowedSec >= 3600;
  const formattedElapsed = formatClock(activeBreak ? elapsedSec : 0, showHours);
  const formattedAllowed = formatClock(allowedSec, showHours);
  const formattedOverage = formatClock(exceededSec, showHours);

  const formatExceededTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const parts: string[] = [];
    if (hrs > 0) parts.push(`${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`);
    if (mins > 0) parts.push(`${mins} ${mins === 1 ? 'min' : 'mins'}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} ${secs === 1 ? 'sec' : 'secs'}`);
    return parts.join(' ');
  };

  const formatRemainingTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins > 0) {
      return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
    }
    return `${secs}s`;
  };

  // State-specific visual tokens with distinct golden warning and urgent exceeded button
  const getBreakTheme = () => {
    if (!activeBreak) {
      return {
        state: 'ready',
        badgeLabel: 'Ready to Start Break',
        badgeBg: '#ecfdf5',
        badgeBorder: '#a7f3d0',
        badgeColor: '#065f46',
        badgeDotColor: '#10b981',
        ringColor: '#10b981',
        ringTrackBg: '#f3f4f6',
        timerTextColor: '#111827',
        progressTextColor: '#6b7280',
        buttonBg: '#059669',
        buttonShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
        srAnnouncement: 'Break ready to start',
      };
    }
    if (isOverBreak) {
      return {
        state: 'exceeded',
        badgeLabel: 'Break Time Exceeded',
        badgeBg: '#fef2f2',
        badgeBorder: '#fca5a5',
        badgeColor: '#991b1b',
        badgeDotColor: '#dc2626',
        ringColor: '#dc2626',
        ringTrackBg: '#fee2e2',
        timerTextColor: '#dc2626',
        progressTextColor: '#dc2626',
        buttonBg: '#dc2626',
        buttonShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
        srAnnouncement: 'Break time limit exceeded',
      };
    }
    if (isWarningStage) {
      return {
        state: 'warning',
        badgeLabel: 'Approaching Limit',
        badgeBg: '#fefce8',
        badgeBorder: '#fef08a',
        badgeColor: '#854d0e',
        badgeDotColor: '#eab308',
        ringColor: '#eab308',
        ringTrackBg: '#fef9c3',
        timerTextColor: '#a16207',
        progressTextColor: '#854d0e',
        buttonBg: '#E8873C',
        buttonShadow: '0 2px 4px rgba(232, 135, 60, 0.25)',
        srAnnouncement: 'Break time approaching limit',
      };
    }
    return {
      state: 'normal',
      badgeLabel: 'Break in Progress',
      badgeBg: '#ecfdf5',
      badgeBorder: '#a7f3d0',
      badgeColor: '#065f46',
      badgeDotColor: '#10b981',
      ringColor: '#10b981',
      ringTrackBg: '#f3f4f6',
      timerTextColor: '#111827',
      progressTextColor: '#059669',
      buttonBg: '#E8873C',
      buttonShadow: '0 2px 4px rgba(232, 135, 60, 0.25)',
      srAnnouncement: 'Break in progress',
    };
  };

  const breakTheme = getBreakTheme();

  if (!user || user.role !== 'Employee') return null;

  return (
    <>
      {/* Full-Screen Break Modal Overlay */}
      {(activeBreak || pendingBreakType) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(17, 24, 39, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          userSelect: 'none',
        }}>
          {/* Screen reader live announcement for state changes */}
          <div aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
            {breakTheme.srAnnouncement}
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '22px',
              width: '100%',
              maxWidth: '480px',
              padding: '1.35rem 1.25rem 1.15rem',
              textAlign: 'center',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.1)',
              animation: 'modalIn 0.2s ease-out',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 1. Header: [Break icon] {Break Type Name} / ● {Status Label} */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              textAlign: 'left',
              marginBottom: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                {/* Circular Break Icon Badge */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fff4e6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {getBreakIcon(activeBreak ? activeBreak.breakTypeName : pendingBreakType!.name, true, 20)}
                </div>

                {/* Break Type Name & Status Pill */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2
                    title={activeBreak ? activeBreak.breakTypeName : pendingBreakType!.name}
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      margin: 0,
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '300px',
                    }}
                  >
                    {activeBreak ? activeBreak.breakTypeName : pendingBreakType!.name}
                  </h2>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    backgroundColor: breakTheme.badgeBg,
                    border: `1px solid ${breakTheme.badgeBorder}`,
                    color: breakTheme.badgeColor,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    marginTop: '0.2rem',
                  }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: breakTheme.badgeDotColor,
                        display: 'inline-block',
                      }}
                    />
                    <span>{breakTheme.badgeLabel}</span>
                  </div>
                </div>
              </div>

              {/* Close Button ONLY for Pending (Ready to Start) Modal — NO close button on active break */}
              {!activeBreak && (
                <button
                  type="button"
                  onClick={() => setPendingBreakType(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: '0.35rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  title="Cancel and close"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* 2. Break Information Row: Two-column layout */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '0.5rem 1rem',
              marginBottom: '0.85rem',
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.675rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Started
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  {activeBreak ? formatStartTime(activeBreak.startTime) : 'Not yet started'}
                </div>
              </div>

              <div style={{ width: '1px', height: '22px', backgroundColor: '#e5e7eb' }} />

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.675rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Allowed
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  {activeBreakAllowedMinutes.toString().padStart(2, '0')} {activeBreakAllowedMinutes === 1 ? 'min' : 'mins'}
                </div>
              </div>
            </div>

            {/* 3. Timer Section (Compact Circular Progress Ring) */}
            <div style={{
              position: 'relative',
              width: '184px',
              height: '184px',
              margin: '0 auto 0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg
                width="184"
                height="184"
                viewBox="0 0 184 184"
                style={{
                  position: 'absolute',
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                }}
              >
                {/* Background Ring Track */}
                <circle
                  cx="92"
                  cy="92"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={breakTheme.ringTrackBg}
                  strokeWidth="6"
                />
                {/* Active Dynamic Progress Ring */}
                <circle
                  cx="92"
                  cy="92"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={breakTheme.ringColor}
                  strokeWidth="7"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
                  }}
                />
              </svg>

              {/* Centered Readout with clear vertical spacing */}
              <div
                aria-live="off"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  zIndex: 1,
                  padding: '0.2rem',
                }}
              >
                <div style={{
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: showHours ? '1.3rem' : '1.6rem',
                  fontWeight: 800,
                  color: breakTheme.timerTextColor,
                  lineHeight: 1.1,
                  letterSpacing: '0.02em',
                }}>
                  {formattedElapsed}
                </div>
                <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.05rem' }}>
                  Elapsed
                </div>

                <div style={{ width: '20px', height: '1px', backgroundColor: '#e5e7eb', margin: '0.25rem 0 0.2rem' }} />

                <div style={{
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#4b5563',
                  lineHeight: 1,
                }}>
                  {formattedAllowed}
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.05rem' }}>
                  Allowed
                </div>
              </div>
            </div>

            {/* Percentage Used Subtext */}
            <div style={{
              fontSize: '0.825rem',
              fontWeight: 700,
              color: breakTheme.progressTextColor,
              marginBottom: isOverBreak ? '0.6rem' : '0.85rem',
            }}>
              {progressPct}% used
            </div>

            {/* 4. Exceeded Warning Banner (Only in Exceeded State) */}
            {isOverBreak && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '10px',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                textAlign: 'left',
                color: '#991b1b',
                fontSize: '0.775rem',
                fontWeight: 600,
                lineHeight: 1.3,
              }}>
                <AlertCircle size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span>
                  ⚠ You have exceeded your allowed break time by <strong>{formattedOverage}</strong>.
                </span>
              </div>
            )}

            {/* 5. Main Action Button (Red in Exceeded state, Orange in Normal/Warning) */}
            {activeBreak ? (
              <button
                type="button"
                onClick={handleStopBreak}
                disabled={stoppingBreak}
                style={{
                  width: '100%',
                  padding: '0.7rem 1.15rem',
                  backgroundColor: breakTheme.buttonBg,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: stoppingBreak ? 'not-allowed' : 'pointer',
                  opacity: stoppingBreak ? 0.75 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  boxShadow: breakTheme.buttonShadow,
                  transition: 'all 0.2s ease',
                  marginBottom: '0.65rem',
                }}
              >
                {stoppingBreak ? (
                  <>
                    <span style={{ width: '15px', height: '15px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    <span>Stopping Break...</span>
                  </>
                ) : (
                  <>
                    <StopCircle size={17} style={{ color: '#ffffff' }} />
                    <span>Stop Break & Resume Work</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStartBreak(pendingBreakType!.id)}
                disabled={startingBreak}
                style={{
                  width: '100%',
                  padding: '0.7rem 1.15rem',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: startingBreak ? 'not-allowed' : 'pointer',
                  opacity: startingBreak ? 0.75 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.2s ease',
                  marginBottom: '0.65rem',
                }}
              >
                {startingBreak ? (
                  <>
                    <span style={{ width: '15px', height: '15px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle size={17} style={{ color: '#ffffff' }} />
                    <span>Start Break</span>
                  </>
                )}
              </button>
            )}

            {/* 6. Info Message (Single line compact helper) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              color: '#6b7280',
              fontSize: '0.75rem',
              lineHeight: 1.3,
              textAlign: 'center',
            }}>
              <Info size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
              <span>
                {activeBreak
                  ? 'Your break is being tracked automatically. Stopping the break will resume your work.'
                  : 'Starting a break will automatically place your active work task on hold.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Locked Support Activity Start Modal Overlay */}
      {pendingSupportType && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(17, 24, 39, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          userSelect: 'none',
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '360px',
            padding: '1.75rem 1.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'modalIn 0.2s ease-out',
            position: 'relative',
          }}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPendingSupportType(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '0.25rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close"
            >
              <X size={18} />
            </button>

            {/* Circular Icon Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#3b82f6',
              marginBottom: '0.85rem',
            }}>
              {getSupportIcon(pendingSupportType.name, true, 26)}
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '0.35rem',
            }}>
              Start {pendingSupportType.name}?
            </h2>

            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.1rem',
            }}>
              Click <strong>Start Activity</strong> to begin the timer
            </p>

            {/* Action Buttons: Yes / No */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '0.85rem' }}>
              <button
                type="button"
                onClick={() => setPendingSupportType(null)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '10px' }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setStartingSupport(true);
                  await handleStartSupport(pendingSupportType.id);
                  setStartingSupport(false);
                  setPendingSupportType(null);
                }}
                disabled={startingSupport}
                className="btn-success-glass"
                style={{ flex: 1.2, padding: '0.6rem 1rem', borderRadius: '10px' }}
              >
                <PlayCircle size={17} style={{ color: '#059669' }} />
                <span>{startingSupport ? 'Starting...' : 'Start Activity'}</span>
              </button>
            </div>

            {/* Inset Callout */}
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.75rem',
              color: '#4b5563',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textAlign: 'left',
            }}>
              <Info size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
              <span>Starting a support activity will automatically place your current work task <strong>on hold</strong>.</span>
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
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
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
            {activeBreak ? (
              <span
                className={`badge ${isOverBreak ? 'badge-danger' : isWarningStage ? 'badge-warning' : 'badge-warning'}`}
                style={{
                  fontSize: '0.825rem',
                  padding: '0.35rem 0.75rem',
                  backgroundColor: isOverBreak ? '#fef2f2' : isWarningStage ? '#fefce8' : '#ecfdf5',
                  borderColor: isOverBreak ? '#fca5a5' : isWarningStage ? '#fef08a' : '#a7f3d0',
                  color: isOverBreak ? '#dc2626' : isWarningStage ? '#854d0e' : '#065f46',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.3s ease',
                }}
              >
                {isOverBreak ? (
                  <AlertCircle size={14} style={{ color: '#dc2626' }} />
                ) : isWarningStage ? (
                  <AlertTriangle size={14} style={{ color: '#ca8a04' }} />
                ) : (
                  <Clock size={14} style={{ color: '#059669' }} />
                )}
                Active: <strong>{activeBreak.breakTypeName}</strong> ({formattedElapsed} / {formattedAllowed}
                {isOverBreak
                  ? ` • Exceeded by ${formatExceededTime(exceededSec)}`
                  : isWarningStage
                  ? ` • ${formatRemainingTime(remainingSec)} left`
                  : ''}
                )
              </span>
            ) : (
              <span className="badge badge-primary" style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}>
                <Clock size={14} />
                Active: <strong>{activeSupport?.activityTypeName}</strong> ({formatClock(elapsedSec)})
              </span>
            )}

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
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.2rem' }}>
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
                  title={`${bt.name} (${bt.allowedMinutes ?? 15} mins allowed)`}
                  onClick={() => {
                    if (activeBreak || activeSupport) {
                      alert('Cannot start a new activity while another session is active.');
                      return;
                    }
                    setPendingBreakType(bt);
                  }}
                >
                  {getBreakIcon(bt.name, isThisActive, 15)}
                  <span>{bt.name}</span>
                  {bt.allowedMinutes && (
                    <span style={{ fontSize: '0.675rem', opacity: 0.7, marginLeft: '0.15rem' }}>
                      ({bt.allowedMinutes}m)
                    </span>
                  )}
                  {isThisActive && <Check size={13} style={{ color: '#E8873C', marginLeft: '0.1rem' }} />}
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '22px', backgroundColor: '#e5e7eb' }} />

          {/* Support Activities Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.2rem' }}>
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
                  onClick={() => {
                    if (activeBreak || activeSupport) {
                      alert('Cannot start a new activity while another session is active.');
                      return;
                    }
                    setPendingSupportType(st);
                  }}
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
