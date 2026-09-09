import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
  Play,
  Check,
  Calendar,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  X,
  Info,
  ChevronDown,
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

const getBreakIcon = (name: string, isActive: boolean = false, size: number = 15, isOther?: boolean) => {
  const isOtherBreak = isOther !== undefined ? isOther : name.toLowerCase().includes('other');
  const iconColor = isActive ? '#ffffff' : isOtherBreak ? '#0284c7' : '#0284c7';
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

const getSupportIcon = (name: string, isActive: boolean = false, size: number = 15) => {
  const iconColor = isActive ? '#ffffff' : '#9333ea';
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

import { useTaskEndReminders } from '../../hooks/useTaskEndReminders';
import { createBackgroundInterval, showIdleNotification, requestNotificationPermission, unlockAudioContext } from '../../utils/notificationUtils';

interface ActiveTask {
  taskId: number;
  productId?: number;
  productName?: string;
  clientId?: number;
  clientCompanyName?: string;
  moduleName?: string;
  description?: string;
  status: string;
  startTime?: string;
  accumulatedSeconds?: number;
  plannedDurationMinutes?: number;
  reminder30Fired?: boolean;
  reminder15Fired?: boolean;
  reminderCompletionFired?: boolean;
}

interface ActiveConflictModal {
  title: string;
  message: string;
  activeType: 'break' | 'support';
  activeName: string;
}

interface CustomToast {
  message: string;
  type: 'success' | 'warning' | 'error';
}

export const PersistentActivityBar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const employeeId = user?.employeeId || 0;

  const [breakTypes, setBreakTypes] = useState<LookupItem[]>([]);
  const [supportTypes, setSupportTypes] = useState<LookupItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);

  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null);
  const [pendingBreakType, setPendingBreakType] = useState<LookupItem | null>(null);
  const [startingBreak, setStartingBreak] = useState(false);
  const [stoppingBreak, setStoppingBreak] = useState(false);
  const [activeSupport, setActiveSupport] = useState<ActiveSupport | null>(null);
  const [pendingSupportType, setPendingSupportType] = useState<LookupItem | null>(null);
  const [startingSupport, setStartingSupport] = useState(false);

  // Dropdown Popover States
  const [showBreakMenu, setShowBreakMenu] = useState(false);
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const breakDropdownRef = useRef<HTMLDivElement>(null);
  const activityDropdownRef = useRef<HTMLDivElement>(null);

  // In-app Conflict Modal & Toast State
  const [conflictModal, setConflictModal] = useState<ActiveConflictModal | null>(null);
  const [toast, setToast] = useState<CustomToast | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
  };

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

  // Timer
  const [elapsedSec, setElapsedSec] = useState(0);
  const [taskElapsedSec, setTaskElapsedSec] = useState(0);

  // Notification Permission State & Real-Time Sync
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : null
  );

  useEffect(() => {
    const updatePerm = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    };
    updatePerm();
    window.addEventListener('focus', updatePerm);
    window.addEventListener('click', updatePerm);
    return () => {
      window.removeEventListener('focus', updatePerm);
      window.removeEventListener('click', updatePerm);
    };
  }, []);

  const handleEnableNotifications = async () => {
    unlockAudioContext();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await requestNotificationPermission();
        setNotifPermission(perm);
        if (perm === 'granted') {
          showToast('Browser notifications enabled successfully!', 'success');
          showIdleNotification(
            '🔔 Notifications Enabled',
            'You will now receive desktop alerts for task timers and idle duration.',
            'perm-enabled-' + Date.now()
          );
        } else if (perm === 'denied') {
          showToast('Notifications blocked in browser settings. Please allow notifications in site settings.', 'warning');
        }
      } catch (err) {
        console.error('Failed to request notification permission:', err);
      }
    }
  };


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
      if (mappingRes.data.success) setMappings(mappings.length ? mappings : mappingRes.data.data);
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
      const [breakRes, supportRes, taskRes] = await Promise.all([
        apiClient.get(`/breaks/active/${employeeId}`),
        apiClient.get(`/support/active/${employeeId}`),
        apiClient.get(`/tasks/active/${employeeId}`),
      ]);

      if (breakRes.data.success) setActiveBreak(breakRes.data.data || null);
      if (supportRes.data.success) setActiveSupport(supportRes.data.data || null);
      if (taskRes.data.success) setActiveTask(taskRes.data.data || null);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchLookups();
    if (employeeId) {
      fetchActiveSessions();
      const stopPoll = createBackgroundInterval(fetchActiveSessions, 3000);
      return () => stopPoll();
    }
  }, [employeeId]);

  useEffect(() => {
    const handleActivityChanged = () => {
      if (employeeId) fetchActiveSessions();
    };
    window.addEventListener('activity-changed', handleActivityChanged);
    window.addEventListener('task-changed', handleActivityChanged);
    return () => {
      window.removeEventListener('activity-changed', handleActivityChanged);
      window.removeEventListener('task-changed', handleActivityChanged);
    };
  }, [employeeId]);

  const parseUtcMs = (dateStr: string) => {
    const str = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
    return new Date(str).getTime();
  };

  const formatStartTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(parseUtcMs(dateStr));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Live timer for active break or support activity (Web Worker backed)
  useEffect(() => {
    let stopTimer: (() => void) | null = null;
    const activeSession = activeBreak || activeSupport;

    if (activeSession && activeSession.startTime) {
      const startMs = parseUtcMs(activeSession.startTime);
      const updateTimer = () => {
        const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setElapsedSec(diff);
      };
      updateTimer();
      stopTimer = createBackgroundInterval(updateTimer, 1000);
    } else {
      setElapsedSec(0);
    }

    return () => {
      if (stopTimer) stopTimer();
    };
  }, [activeBreak, activeSupport]);

  // Live timer for active work task (Web Worker backed for background tab accuracy)
  useEffect(() => {
    let stopTimer: (() => void) | null = null;
    const isRunning = activeTask && (activeTask.status?.toLowerCase() === 'running' || activeTask.status === '1');

    if (isRunning) {
      const baseAccumulated = activeTask.accumulatedSeconds || 0;
      const startMs = activeTask.startTime ? parseUtcMs(activeTask.startTime) : Date.now();

      const updateTaskTimer = () => {
        const currentSegment = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setTaskElapsedSec(baseAccumulated + currentSegment);
      };

      updateTaskTimer();
      stopTimer = createBackgroundInterval(updateTaskTimer, 1000);
    } else {
      setTaskElapsedSec(activeTask?.accumulatedSeconds || 0);
    }

    return () => {
      if (stopTimer) stopTimer();
    };
  }, [activeTask]);

  // Task End-Time Reminders (Active app-wide in PersistentActivityBar)
  const [reminderSettings, setReminderSettings] = useState<{
    firstMinutes: number;
    secondMinutes: number;
    completionEnabled: boolean;
  }>({ firstMinutes: 30, secondMinutes: 15, completionEnabled: true });

  useEffect(() => {
    const fetchTaskReminderSettings = () => {
      apiClient.get('/settings/task-reminders').then(res => {
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setReminderSettings({
            firstMinutes: Number(d.taskReminderFirstMinutes) || 30,
            secondMinutes: Number(d.taskReminderSecondMinutes) || 15,
            completionEnabled: d.taskReminderCompletionEnabled === true || String(d.taskReminderCompletionEnabled).toLowerCase() === 'true',
          });
        }
      }).catch(() => { /* fail silently */ });
    };

    fetchTaskReminderSettings();
    window.addEventListener('settings-changed', fetchTaskReminderSettings);
    const pollId = setInterval(fetchTaskReminderSettings, 10000);

    return () => {
      window.removeEventListener('settings-changed', fetchTaskReminderSettings);
      clearInterval(pollId);
    };
  }, []);

  const activeTaskForReminder = React.useMemo(() => {
    if (!activeTask) return null;
    const isRunning = activeTask.status?.toLowerCase() === 'running' || activeTask.status === '1';
    if (!isRunning) return null;
    return {
      id: activeTask.taskId,
      moduleName: activeTask.moduleName || 'Task',
      status: 'Running',
      plannedDurationMinutes: activeTask.plannedDurationMinutes,
      totalProductiveSeconds: taskElapsedSec,
      reminder30Fired: activeTask.reminder30Fired,
      reminder15Fired: activeTask.reminder15Fired,
      reminderCompletionFired: activeTask.reminderCompletionFired,
    };
  }, [
    activeTask?.taskId,
    activeTask?.status,
    activeTask?.plannedDurationMinutes,
    activeTask?.moduleName,
    activeTask?.reminder30Fired,
    activeTask?.reminder15Fired,
    activeTask?.reminderCompletionFired,
  ]);

  useTaskEndReminders(activeTaskForReminder, taskElapsedSec, reminderSettings);

  // Dropdown Popover Click-Outside & Keyboard Handling
  useEffect(() => {
    if (!showBreakMenu && !showActivityMenu) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (showBreakMenu && breakDropdownRef.current && !breakDropdownRef.current.contains(target)) {
        setShowBreakMenu(false);
      }
      if (showActivityMenu && activityDropdownRef.current && !activityDropdownRef.current.contains(target)) {
        setShowActivityMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowBreakMenu(false);
        setShowActivityMenu(false);
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
  }, [showBreakMenu, showActivityMenu]);

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = !!(activeBreak || pendingBreakType || pendingSupportType || conflictModal || showStopModal);
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeBreak, pendingBreakType, pendingSupportType, conflictModal, showStopModal]);

  // Global Escape key handler for dismissible dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingBreakType && !activeBreak) {
          setPendingBreakType(null);
        } else if (pendingSupportType) {
          setPendingSupportType(null);
        } else if (conflictModal) {
          setConflictModal(null);
        } else if (showStopModal) {
          setShowStopModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingBreakType, activeBreak, pendingSupportType, conflictModal, showStopModal]);

  // Helper to validate and prompt in-app modal if session conflict exists
  const checkSessionConflict = (newActivityName: string) => {
    if (activeBreak) {
      setConflictModal({
        title: 'Break in Progress',
        message: `You currently have an active "${activeBreak.breakTypeName}" break running. Please stop your active break before starting "${newActivityName}".`,
        activeType: 'break',
        activeName: activeBreak.breakTypeName,
      });
      return true;
    }
    if (activeSupport) {
      setConflictModal({
        title: 'Support Activity in Progress',
        message: `You currently have an active "${activeSupport.activityTypeName}" activity in progress. Please complete or stop it before starting "${newActivityName}".`,
        activeType: 'support',
        activeName: activeSupport.activityTypeName,
      });
      return true;
    }
    return false;
  };

  // Start Break
  const handleStartBreak = async (typeId: number) => {
    const btName = breakTypes.find((b) => b.id === typeId)?.name || 'Break';
    if (checkSessionConflict(btName)) return;

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
        window.dispatchEvent(new Event('task-changed'));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to start break.', 'error');
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
      showToast(`Break "${activeBreak.breakTypeName}" stopped successfully.`, 'success');
      setActiveBreak(null);
      setPendingBreakType(null);
      fetchActiveSessions();
      window.dispatchEvent(new Event('activity-changed'));
      window.dispatchEvent(new Event('task-changed'));
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to stop break.', 'error');
    } finally {
      setStoppingBreak(false);
    }
  };

  // Start Support activity
  const handleStartSupport = async (typeId: number) => {
    const stName = supportTypes.find((s) => s.id === typeId)?.name || 'Support Activity';
    if (checkSessionConflict(stName)) return;

    try {
      const res = await apiClient.post('/support/start', { activityTypeId: typeId });
      if (res.data.success) {
        fetchActiveSessions();
        window.dispatchEvent(new Event('activity-changed'));
        window.dispatchEvent(new Event('task-changed'));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to start support activity.', 'error');
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

        showToast(`Demo follow-up reminder has been scheduled for ${new Date(followUpDate).toLocaleDateString()}.`, 'success');
      } else {
        await apiClient.post(`/support/${activeSupport.id}/stop`, {
          remarks: stopRemarks.trim(),
          ...payload,
        });

        showToast(`Activity "${activeSupport.activityTypeName}" completed successfully.`, 'success');
      }

      setShowStopModal(false);
      setActiveSupport(null);
      fetchActiveSessions();
      window.dispatchEvent(new Event('activity-changed'));
      window.dispatchEvent(new Event('task-changed'));
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
        badgeBg: 'var(--success-bg)',
        badgeBorder: 'rgba(16, 185, 129, 0.3)',
        badgeColor: 'var(--success-text)',
        badgeDotColor: 'var(--success)',
        ringColor: 'var(--success)',
        ringTrackBg: 'var(--border)',
        timerTextColor: 'var(--text-main)',
        progressTextColor: 'var(--text-muted)',
        buttonBg: 'var(--success)',
        buttonShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
        srAnnouncement: 'Break ready to start',
      };
    }
    if (isOverBreak) {
      return {
        state: 'exceeded',
        badgeLabel: 'Break Time Exceeded',
        badgeBg: 'var(--danger-bg)',
        badgeBorder: 'rgba(239, 68, 68, 0.3)',
        badgeColor: 'var(--danger-text)',
        badgeDotColor: 'var(--danger)',
        ringColor: 'var(--danger)',
        ringTrackBg: 'rgba(239, 68, 68, 0.15)',
        timerTextColor: 'var(--danger-text)',
        progressTextColor: 'var(--danger-text)',
        buttonBg: 'var(--danger)',
        buttonShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
        srAnnouncement: 'Break time limit exceeded',
      };
    }
    if (isWarningStage) {
      return {
        state: 'warning',
        badgeLabel: 'Approaching Limit',
        badgeBg: 'var(--warning-bg)',
        badgeBorder: 'rgba(245, 158, 11, 0.3)',
        badgeColor: 'var(--warning-text)',
        badgeDotColor: 'var(--warning)',
        ringColor: 'var(--warning)',
        ringTrackBg: 'var(--border)',
        timerTextColor: 'var(--warning-text)',
        progressTextColor: 'var(--warning-text)',
        buttonBg: 'var(--primary)',
        buttonShadow: '0 2px 4px rgba(232, 135, 60, 0.25)',
        srAnnouncement: 'Break time approaching limit',
      };
    }
    return {
      state: 'normal',
      badgeLabel: 'Break in Progress',
      badgeBg: 'var(--success-bg)',
      badgeBorder: 'rgba(16, 185, 129, 0.3)',
      badgeColor: 'var(--success-text)',
      badgeDotColor: 'var(--success)',
      ringColor: 'var(--success)',
      ringTrackBg: 'var(--border)',
      timerTextColor: 'var(--text-main)',
      progressTextColor: 'var(--success-text)',
      buttonBg: 'var(--primary)',
      buttonShadow: '0 2px 4px rgba(232, 135, 60, 0.25)',
      srAnnouncement: 'Break in progress',
    };
  };

  const breakTheme = getBreakTheme();

  if (!user || user.role !== 'Employee') return null;

  return (
    <>
      {/* Full-Screen Break Modal Overlay (Rendered at Root via Portal) */}
      {(activeBreak || pendingBreakType) && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !activeBreak) {
              setPendingBreakType(null);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(17, 24, 39, 0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            userSelect: 'none',
            pointerEvents: 'auto',
          }}
        >
          {/* Screen reader live announcement for state changes */}
          <div aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
            {breakTheme.srAnnouncement}
          </div>

          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '22px',
              width: '100%',
              maxWidth: '480px',
              padding: '1.35rem 1.25rem 1.15rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
              animation: 'modalIn 0.2s ease-out',
              position: 'relative',
              overflow: 'hidden',
              zIndex: 10001,
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
                  backgroundColor: 'var(--primary-tint)',
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
              background: 'var(--panel-raised)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.5rem 1rem',
              marginBottom: '0.85rem',
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.675rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Started
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  {activeBreak ? formatStartTime(activeBreak.startTime) : 'Not yet started'}
                </div>
              </div>

              <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border)' }} />

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.675rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.05rem' }}>
                  Elapsed
                </div>

                <div style={{ width: '20px', height: '1px', backgroundColor: 'var(--border)', margin: '0.25rem 0 0.2rem' }} />

                <div style={{
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  lineHeight: 1,
                }}>
                  {formattedAllowed}
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.05rem' }}>
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
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                textAlign: 'left',
                color: 'var(--danger-text)',
                fontSize: '0.775rem',
                fontWeight: 600,
                lineHeight: 1.3,
              }}>
                <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
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
        </div>,
        document.body
      )}

      {/* Full-Screen Locked Support Activity Start Modal Overlay (Rendered at Root via Portal) */}
      {pendingSupportType && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPendingSupportType(null);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(17, 24, 39, 0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            userSelect: 'none',
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '360px',
            padding: '1.75rem 1.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
            animation: 'modalIn 0.2s ease-out',
            position: 'relative',
            zIndex: 10001,
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
                color: 'var(--text-muted)',
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
              backgroundColor: 'var(--primary-tint)',
              color: 'var(--primary)',
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
              background: 'var(--panel-raised)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textAlign: 'left',
            }}>
              <Info size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span>Starting a support activity will automatically place your current work task <strong>on hold</strong>.</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* In-App Active Session Conflict Modal Dialog (Rendered at Root via Portal) */}
      {conflictModal && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConflictModal(null);
            }
          }}
          style={{ zIndex: 10000, pointerEvents: 'auto' }}
        >
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center', padding: '1.75rem 1.5rem', borderRadius: '22px', zIndex: 10001 }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'var(--warning-bg)',
              color: 'var(--warning)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
              {conflictModal.title}
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1.35rem 0' }}>
              {conflictModal.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '10px' }}
                onClick={() => setConflictModal(null)}
              >
                Dismiss
              </button>

              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1.35, padding: '0.6rem 1rem', borderRadius: '10px' }}
                onClick={() => {
                  const type = conflictModal.activeType;
                  setConflictModal(null);
                  if (type === 'break') {
                    handleStopBreak();
                  } else {
                    handleOpenStopSupport();
                  }
                }}
              >
                <StopCircle size={15} />
                <span>{conflictModal.activeType === 'break' ? 'Stop Active Break' : 'Complete Activity'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modern In-App Toast Notification (Rendered at Root via Portal) */}
      {toast && createPortal(
        <div className="toast-container" style={{ zIndex: 10002 }}>
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? (
              <Sparkles size={18} style={{ color: 'var(--success)' }} />
            ) : toast.type === 'error' ? (
              <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
            ) : (
              <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Unified Sticky Session Bar */}
      <div className="unified-session-bar">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'var(--panel-raised)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '0.4rem 0.85rem',
        }}>
          {/* Left / Center Section: Live Status + Active Task & Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: '1 1 auto', flexWrap: 'wrap' }}>
            {activeBreak ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flexWrap: 'nowrap' }}>
                <div className="session-pulse-indicator">
                  <span
                    className="pulse-ring"
                    style={{ backgroundColor: isOverBreak ? 'var(--danger)' : isWarningStage ? 'var(--warning)' : '#10B981' }}
                  />
                  <span
                    className="pulse-core"
                    style={{ backgroundColor: isOverBreak ? 'var(--danger)' : isWarningStage ? 'var(--warning)' : '#10B981' }}
                  />
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.825rem',
                    color: isOverBreak ? 'var(--danger-text)' : isWarningStage ? 'var(--warning-text)' : 'var(--text-main)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Coffee size={15} style={{ color: isOverBreak ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
                  <span>On Break: <strong>{activeBreak.breakTypeName}</strong></span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, marginLeft: '2px', color: 'var(--text-main)' }}>
                    ({formattedElapsed} / {formattedAllowed})
                  </span>
                  {isOverBreak && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger-text)' }}>
                      • Exceeded +{formatExceededTime(exceededSec)}
                    </span>
                  )}
                  {isWarningStage && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning-text)' }}>
                      • {formatRemainingTime(remainingSec)} left
                    </span>
                  )}
                </div>
              </div>
            ) : activeSupport ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flexWrap: 'nowrap' }}>
                <div className="session-pulse-indicator">
                  <span className="pulse-ring" style={{ backgroundColor: '#A855F7' }} />
                  <span className="pulse-core" style={{ backgroundColor: '#A855F7' }} />
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.825rem',
                    color: '#A855F7',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getSupportIcon(activeSupport.activityTypeName, false, 15)}
                  <span>Support: <strong>{activeSupport.activityTypeName}</strong></span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, marginLeft: '2px', color: 'var(--text-main)' }}>
                    ({formatClock(elapsedSec, true)})
                  </span>
                </div>
              </div>
            ) : (activeTask && (activeTask.status?.toLowerCase() === 'running' || activeTask.status === '1') && activeTask.startTime) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, overflow: 'hidden', flexWrap: 'wrap' }}>
                <div
                  className="session-task-clickable"
                  onClick={() => navigate('/work-task')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('/work-task');
                    }
                  }}
                  aria-label={`View current task: ${activeTask.moduleName || 'Active Work Task'} — go to Work Task Engine`}
                  title={`View current task: ${activeTask.moduleName || 'Active Work Task'} (Go to Work Task Engine)`}
                >
                  <div className="session-pulse-indicator">
                    <span className="pulse-ring" style={{ backgroundColor: '#10B981' }} />
                    <span className="pulse-core" style={{ backgroundColor: '#10B981' }} />
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', minWidth: 0 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Task:</span>
                    <span
                      className="session-task-title"
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        maxWidth: '280px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}
                      title={activeTask.moduleName}
                    >
                      {activeTask.moduleName || 'Active Work Task'}
                    </span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        color: 'var(--primary)',
                        marginLeft: '0.2rem',
                        backgroundColor: 'var(--primary-light)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {formatClock(taskElapsedSec, true)}
                    </span>
                  </div>
                </div>
                <span
                  title="Starting any break or support activity will automatically put your running task on hold"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    backgroundColor: 'rgba(100, 116, 139, 0.1)',
                    border: '1px solid rgba(100, 116, 139, 0.2)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '6px',
                    cursor: 'help',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Info size={11} />
                  <span>Auto-holds on activity</span>
                </span>
              </div>
            ) : (activeTask && (activeTask.status?.toLowerCase() === 'onhold' || activeTask.status?.toLowerCase() === 'on hold' || activeTask.status === '2')) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, overflow: 'hidden' }}>
                <div
                  className="session-task-clickable"
                  onClick={() => navigate('/work-task')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('/work-task');
                    }
                  }}
                  aria-label={`View task on hold: ${activeTask.moduleName} — go to Work Task Engine`}
                  title={`View task on hold: ${activeTask.moduleName} (Go to Work Task Engine)`}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)', flexShrink: 0 }} />
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem' }}>
                    <span style={{ color: 'var(--warning-text)', fontWeight: 600 }}>Task on hold:</span>
                    <strong
                      className="session-task-title"
                      style={{
                        color: 'var(--text-main)',
                        maxWidth: '240px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={activeTask.moduleName}
                    >
                      {activeTask.moduleName}
                    </strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/work-task')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Resume in Tasks →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>No active task running</span>
                <button
                  type="button"
                  onClick={() => navigate('/work-task')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '0.1rem 0.3rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Play size={12} />
                  <span>Start Task</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Section: Connected Quick Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Active Session Stop Action Shortcut */}
            {activeBreak && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleStopBreak}
                style={{
                  borderRadius: '8px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.785rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600,
                }}
              >
                <StopCircle size={14} />
                <span>Stop Break</span>
              </button>
            )}

            {activeSupport && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleOpenStopSupport}
                style={{
                  borderRadius: '8px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.785rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600,
                }}
              >
                <StopCircle size={14} />
                <span>{activeSupport.activityTypeName === 'Demo' ? 'Complete Demo' : 'Stop Activity'}</span>
              </button>
            )}

            {/* Desktop Alerts Prompt (if default or denied) */}
            {notifPermission === 'default' && (
              <button
                type="button"
                onClick={handleEnableNotifications}
                title="Click to allow desktop browser notifications for idle alerts and task timers"
                style={{
                  background: 'var(--primary-tint)',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>🔔 Alerts</span>
              </button>
            )}

            {/* Break Dropdown */}
            <div ref={breakDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowBreakMenu(!showBreakMenu);
                  setShowActivityMenu(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeBreak ? '1px solid var(--warning)' : '1px solid var(--border)',
                  background: activeBreak ? 'var(--warning-bg)' : 'var(--panel)',
                  color: activeBreak ? 'var(--warning-text)' : 'var(--text-main)',
                  transition: 'all 0.15s ease',
                }}
                aria-expanded={showBreakMenu}
                aria-label="Open Break Menu"
              >
                <Coffee size={15} style={{ color: activeBreak ? 'var(--warning)' : 'var(--warning-text)' }} />
                <span>{activeBreak ? `Break: ${activeBreak.breakTypeName}` : 'Break'}</span>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--text-muted)',
                    transform: showBreakMenu ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              </button>

              {showBreakMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '240px',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '0.5rem',
                    zIndex: 100,
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  <div style={{ padding: '0.3rem 0.5rem 0.4rem', borderBottom: '1px solid var(--border-soft)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      Quick Breaks
                    </span>
                    <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Auto-holds task</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {(breakTypes.length > 0 ? breakTypes : [
                      { id: 1, name: 'Bio Break', allowedMinutes: 5 },
                      { id: 2, name: 'Tea Break', allowedMinutes: 15 },
                      { id: 3, name: 'Lunch Break', allowedMinutes: 30 },
                      { id: 4, name: 'Call Break', allowedMinutes: 5 },
                      { id: 5, name: 'Other', allowedMinutes: 5 },
                    ]).map((bt) => {
                      const isThisActive = activeBreak?.breakTypeId === bt.id;
                      const isOther = bt.name.toLowerCase().includes('other');
                      const allowedMins = bt.allowedMinutes ?? (isOther ? 5 : bt.name.toLowerCase().includes('tea') ? 15 : bt.name.toLowerCase().includes('lunch') ? 30 : 5);

                      return (
                        <button
                          key={`break-opt-${bt.id}`}
                          type="button"
                          onClick={() => {
                            setShowBreakMenu(false);
                            if (checkSessionConflict(bt.name)) return;
                            setPendingBreakType({ ...bt, allowedMinutes: allowedMins });
                          }}
                          disabled={!!activeSupport || (!!activeBreak && !isThisActive)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            border: isThisActive ? '1px solid var(--warning)' : '1px solid transparent',
                            background: isThisActive ? 'var(--warning-bg)' : 'transparent',
                            color: isThisActive ? 'var(--warning-text)' : 'var(--text-main)',
                            cursor: (!!activeSupport || (!!activeBreak && !isThisActive)) ? 'not-allowed' : 'pointer',
                            opacity: (!!activeSupport || (!!activeBreak && !isThisActive)) ? 0.5 : 1,
                            fontSize: '0.8rem',
                            fontWeight: isThisActive ? 700 : 500,
                            textAlign: 'left',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isThisActive && !activeSupport && !activeBreak) {
                              e.currentTarget.style.background = 'var(--panel-raised)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isThisActive) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            {getBreakIcon(bt.name, isThisActive, 15, isOther)}
                            <span>{bt.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'var(--panel-raised)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                              }}
                            >
                              {allowedMins}m
                            </span>
                            {isThisActive && <Check size={13} style={{ color: 'var(--warning)' }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activeBreak && (
                    <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '0.45rem', marginTop: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBreakMenu(false);
                          handleStopBreak();
                        }}
                        className="btn btn-danger btn-sm"
                        style={{ width: '100%', justifyContent: 'center', gap: '0.35rem', borderRadius: '8px' }}
                      >
                        <StopCircle size={14} />
                        <span>Stop Active Break</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Activity Dropdown */}
            <div ref={activityDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowActivityMenu(!showActivityMenu);
                  setShowBreakMenu(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeSupport ? '1px solid #A855F7' : '1px solid var(--border)',
                  background: activeSupport ? 'rgba(168, 85, 247, 0.16)' : 'var(--panel)',
                  color: activeSupport ? '#A855F7' : 'var(--text-main)',
                  transition: 'all 0.15s ease',
                }}
                aria-expanded={showActivityMenu}
                aria-label="Open Activity Menu"
              >
                <Headphones size={15} style={{ color: '#A855F7' }} />
                <span>{activeSupport ? `Activity: ${activeSupport.activityTypeName}` : 'Activity'}</span>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--text-muted)',
                    transform: showActivityMenu ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              </button>

              {showActivityMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '230px',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '0.5rem',
                    zIndex: 100,
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  <div style={{ padding: '0.3rem 0.5rem 0.4rem', borderBottom: '1px solid var(--border-soft)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      Support Activities
                    </span>
                    <span style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Auto-holds task</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {(supportTypes.length > 0 ? supportTypes : [
                      { id: 1, name: 'Support Call' },
                      { id: 2, name: 'Call' },
                      { id: 3, name: 'Meeting' },
                      { id: 4, name: 'Discussion' },
                      { id: 5, name: 'Demo' },
                    ]).map((st) => {
                      const isThisActive = activeSupport?.activityTypeId === st.id;

                      return (
                        <button
                          key={`support-opt-${st.id}`}
                          type="button"
                          onClick={() => {
                            setShowActivityMenu(false);
                            if (checkSessionConflict(st.name)) return;
                            setPendingSupportType(st);
                          }}
                          disabled={!!activeBreak || (!!activeSupport && !isThisActive)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            border: isThisActive ? '1px solid #A855F7' : '1px solid transparent',
                            background: isThisActive ? 'rgba(168, 85, 247, 0.16)' : 'transparent',
                            color: isThisActive ? '#A855F7' : 'var(--text-main)',
                            cursor: (!!activeBreak || (!!activeSupport && !isThisActive)) ? 'not-allowed' : 'pointer',
                            opacity: (!!activeBreak || (!!activeSupport && !isThisActive)) ? 0.5 : 1,
                            fontSize: '0.8rem',
                            fontWeight: isThisActive ? 700 : 500,
                            textAlign: 'left',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isThisActive && !activeBreak && !activeSupport) {
                              e.currentTarget.style.background = 'var(--panel-raised)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isThisActive) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            {getSupportIcon(st.name, isThisActive, 15)}
                            <span>{st.name}</span>
                          </div>
                          {isThisActive && <Check size={13} style={{ color: '#A855F7' }} />}
                        </button>
                      );
                    })}
                  </div>

                  {activeSupport && (
                    <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '0.45rem', marginTop: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowActivityMenu(false);
                          handleOpenStopSupport();
                        }}
                        className="btn btn-danger btn-sm"
                        style={{ width: '100%', justifyContent: 'center', gap: '0.35rem', borderRadius: '8px' }}
                      >
                        <StopCircle size={14} />
                        <span>{activeSupport.activityTypeName === 'Demo' ? 'Complete Demo' : 'Stop Activity'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demo & Support Activity Completion Modal (Rendered at Root via Portal) */}
      {showStopModal && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStopModal(false);
            }
          }}
          style={{ zIndex: 10000, pointerEvents: 'auto' }}
        >
          <div className="modal-content" style={{ zIndex: 10001 }}>
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
                      color: '#E8873C',
                      fontSize: '0.785rem',
                      fontWeight: 700,
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
                    <span style={{ fontSize: '0.725rem', color: '#E8873C', marginTop: '0.25rem', display: 'inline-block', fontWeight: 600 }}>
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
                    <option value="CUSTOM" style={{ fontWeight: 'bold', color: '#E8873C' }}>
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
                      color: (!isCustomProduct && !stopProductId) ? '#cbd5e1' : '#E8873C',
                      fontSize: '0.785rem',
                      fontWeight: 700,
                      cursor: (!isCustomProduct && !stopProductId) ? 'not-allowed' : 'pointer',
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
                      placeholder="Enter Client Company Name manually..."
                      required
                    />
                    <span style={{ fontSize: '0.725rem', color: '#E8873C', marginTop: '0.25rem', display: 'inline-block', fontWeight: 600 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    {activeSupport?.activityTypeName === 'Demo' ? 'Review / Discussion Field *' : 'Remarks / Summary *'}
                  </label>
                  <span
                    style={{
                      fontSize: '0.725rem',
                      color: stopRemarks.length >= 500 ? '#ef4444' : stopRemarks.length >= 425 ? '#f59e0b' : '#94a3b8',
                      fontWeight: stopRemarks.length >= 425 ? 600 : 400,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {stopRemarks.length}/500
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  rows={3}
                  maxLength={500}
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
        </div>,
        document.body
      )}
    </>
  );
};
