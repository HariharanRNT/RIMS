import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';
import {
  X,
  Clock,
  Coffee,
  Briefcase,
  PhoneCall,
  Info,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
  ArrowUpDown
} from 'lucide-react';
import { formatTimeIST, formatDurationToHoursMinutes, formatDurationString } from '../../../utils/dateUtils';

interface TaskSession {
  startTime: string;
  endTime: string | null;
  duration: string;
}

interface TaskDetail {
  taskId: number;
  moduleName: string;
  description: string;
  productName: string;
  clientName: string;
  status: string;
  sessions: TaskSession[];
  totalTaskHours: number;
}

interface BreakDetail {
  breakTypeName: string;
  heldTaskModule: string | null;
  startTime: string;
  endTime: string | null;
  duration: string;
}

interface SupportDetail {
  activityTypeName: string;
  productName: string | null;
  clientName: string | null;
  remarks: string | null;
  startTime: string;
  endTime: string | null;
  duration: string;
}

interface TimelineItem {
  id: number;
  activityType: string;
  startTime: string;
  endTime: string | null;
  status: string;
  remarks: string | null;
  duration: string | null;
}

interface DailyIdleDetail {
  startTime: string;
  endTime: string;
  duration: string;
  type: string;
}

interface EmployeeDailyDetail {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  date: string;
  loginTime: string | null;
  logoutTime: string | null;
  status: string;
  productiveHours: number;
  breakHours: number;
  idleHours?: number;
  nonProductiveHours?: number;
  minutesLate: number;
  tasks: TaskDetail[];
  breaks: BreakDetail[];
  supportActivities: SupportDetail[];
  idles?: DailyIdleDetail[];
  timeline: TimelineItem[];
}

interface MergedTimelineEntry {
  id: string;
  type: 'Task' | 'Break' | 'Support' | 'Idle' | 'Attendance' | 'Other';
  startTimeIso: string;
  endTimeIso: string | null;
  startTimeFormatted: string;
  endTimeFormatted: string | null;
  duration: string | null;
  title: string;
  subtitle?: string | null;
  statusBadge?: string | null;
  badgeType?: 'success' | 'warning' | 'info' | 'secondary';
  rawRemark?: string | null;
}

interface Props {
  employeeId: number | null;
  date?: string;
  startDate?: string;
  endDate?: string;
  initialTab?: 'tasks' | 'breaks' | 'support' | 'idles' | 'timeline';
  onClose: () => void;
}

export const EmployeeDailyDetailModal: React.FC<Props> = ({
  employeeId,
  date,
  startDate,
  endDate,
  initialTab = 'tasks',
  onClose,
}) => {
  const [detail, setDetail] = useState<EmployeeDailyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'breaks' | 'support' | 'idles' | 'timeline'>(initialTab);
  const [expandedTaskSessions, setExpandedTaskSessions] = useState<Record<number, boolean>>({});
  const [breakSortBy, setBreakSortBy] = useState<'time' | 'duration'>('time');
  const [breakSortOrder, setBreakSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!employeeId) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        let url = `/reports/daily-detail/${employeeId}?`;
        if (startDate && endDate) {
          url += `startDate=${startDate}&endDate=${endDate}`;
        } else if (date) {
          url += `date=${date}`;
        }
        const res = await apiClient.get(url);
        if (res.data.success) {
          setDetail(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch employee daily detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [employeeId, date, startDate, endDate]);

  const formatTime = (isoStr: string | null) => formatTimeIST(isoStr);

  const resolveHeldTaskModule = (b: BreakDetail) => {
    if (b.heldTaskModule && b.heldTaskModule !== 'None') {
      return b.heldTaskModule;
    }

    if (!detail || !detail.tasks || detail.tasks.length === 0) {
      return 'None';
    }

    const breakStartMs = new Date(b.startTime.endsWith('Z') ? b.startTime : b.startTime + 'Z').getTime();

    let bestTask: TaskDetail | null = null;
    let latestSessionStart = -1;

    for (const t of detail.tasks) {
      if (t.sessions && t.sessions.length > 0) {
        for (const s of t.sessions) {
          const sStartMs = new Date(s.startTime.endsWith('Z') ? s.startTime : s.startTime + 'Z').getTime();
          if (sStartMs <= breakStartMs && sStartMs > latestSessionStart) {
            latestSessionStart = sStartMs;
            bestTask = t;
          }
        }
      }
    }

    if (bestTask && bestTask.moduleName) {
      return bestTask.moduleName;
    }

    return detail.tasks[0]?.moduleName || 'None';
  };

  const parseDurationToMinutes = (dur: string | null | undefined): number => {
    if (!dur) return 0;
    let mins = 0;
    const hMatch = dur.match(/(\d+)\s*h/i);
    const mMatch = dur.match(/(\d+)\s*m/i);
    if (hMatch || mMatch) {
      if (hMatch) mins += parseInt(hMatch[1], 10) * 60;
      if (mMatch) mins += parseInt(mMatch[1], 10);
      return mins;
    }
    const parts = dur.split(':');
    if (parts.length >= 2) {
      mins += parseInt(parts[0], 10) * 60;
      mins += parseInt(parts[1], 10);
      return mins;
    }
    return 0;
  };

  const isBreakOutlier = (b: BreakDetail) => {
    const mins = parseDurationToMinutes(b.duration);
    const type = (b.breakTypeName || '').toLowerCase();
    if (type.includes('lunch')) return mins > 45;
    if (type.includes('tea')) return mins > 20;
    if (type.includes('bio')) return mins > 10;
    return mins >= 30;
  };

  // Build merged unified chronological timeline list
  const mergedTimeline = useMemo(() => {
    if (!detail) return [];

    const list: MergedTimelineEntry[] = [];

    // 1. Login event
    if (detail.loginTime) {
      list.push({
        id: 'att-login',
        type: 'Attendance',
        startTimeIso: detail.loginTime,
        endTimeIso: null,
        startTimeFormatted: formatTime(detail.loginTime),
        endTimeFormatted: null,
        duration: null,
        title: 'Portal Login',
        subtitle: 'Employee logged in to workstation',
        statusBadge: 'Login',
        badgeType: 'success',
      });
    }

    // 2. Task Sessions
    detail.tasks.forEach((task) => {
      (task.sessions || []).forEach((s, idx) => {
        list.push({
          id: `task-${task.taskId}-${idx}`,
          type: 'Task',
          startTimeIso: s.startTime,
          endTimeIso: s.endTime,
          startTimeFormatted: formatTime(s.startTime),
          endTimeFormatted: s.endTime ? formatTime(s.endTime) : 'In Progress',
          duration: formatDurationString(s.duration),
          title: task.moduleName,
          subtitle: [
            task.productName ? `Product: ${task.productName}` : null,
            task.clientName ? `Client: ${task.clientName}` : null,
          ].filter(Boolean).join(' • ') || task.description,
          statusBadge: task.status,
          badgeType: task.status === 'Completed' ? 'success' : 'warning',
        });
      });
    });

    // 3. Breaks
    detail.breaks.forEach((b, idx) => {
      const heldMod = resolveHeldTaskModule(b);
      list.push({
        id: `break-${idx}`,
        type: 'Break',
        startTimeIso: b.startTime,
        endTimeIso: b.endTime,
        startTimeFormatted: formatTime(b.startTime),
        endTimeFormatted: b.endTime ? formatTime(b.endTime) : 'In Progress',
        duration: formatDurationString(b.duration),
        title: b.breakTypeName || 'Break',
        subtitle: heldMod && heldMod !== 'None' ? `Held Task: ${heldMod}` : null,
        statusBadge: 'Break',
        badgeType: 'warning',
      });
    });

    // 4. Support Activities
    detail.supportActivities.forEach((s, idx) => {
      list.push({
        id: `support-${idx}`,
        type: 'Support',
        startTimeIso: s.startTime,
        endTimeIso: s.endTime,
        startTimeFormatted: formatTime(s.startTime),
        endTimeFormatted: s.endTime ? formatTime(s.endTime) : 'In Progress',
        duration: formatDurationString(s.duration),
        title: s.activityTypeName || 'Support Call',
        subtitle: [
          s.productName ? `Product: ${s.productName}` : null,
          s.clientName ? `Client: ${s.clientName}` : null,
          s.remarks,
        ].filter(Boolean).join(' • '),
        statusBadge: 'Support',
        badgeType: 'info',
      });
    });

    // 5. Idle Gaps
    (detail.idles || []).forEach((idle, idx) => {
      list.push({
        id: `idle-${idx}`,
        type: 'Idle',
        startTimeIso: idle.startTime,
        endTimeIso: idle.endTime,
        startTimeFormatted: formatTime(idle.startTime),
        endTimeFormatted: formatTime(idle.endTime),
        duration: formatDurationString(idle.duration),
        title: idle.type || 'Idle Gap',
        subtitle: 'No portal task activity recorded',
        statusBadge: 'Idle',
        badgeType: 'warning',
      });
    });

    // 6. Logout event
    if (detail.logoutTime) {
      list.push({
        id: 'att-logout',
        type: 'Attendance',
        startTimeIso: detail.logoutTime,
        endTimeIso: null,
        startTimeFormatted: formatTime(detail.logoutTime),
        endTimeFormatted: null,
        duration: null,
        title: 'Portal Logout',
        subtitle: 'Employee logged out from workstation',
        statusBadge: 'Logout',
        badgeType: 'secondary',
      });
    }

    // Sort chronologically ascending
    list.sort((a, b) => {
      const timeA = new Date(a.startTimeIso.endsWith('Z') ? a.startTimeIso : a.startTimeIso + 'Z').getTime();
      const timeB = new Date(b.startTimeIso.endsWith('Z') ? b.startTimeIso : b.startTimeIso + 'Z').getTime();
      return timeA - timeB;
    });

    return list;
  }, [detail]);

  // Sorted breaks list
  const sortedBreaks = useMemo(() => {
    if (!detail?.breaks) return [];
    const list = [...detail.breaks];
    list.sort((a, b) => {
      if (breakSortBy === 'duration') {
        const durA = parseDurationToMinutes(a.duration);
        const durB = parseDurationToMinutes(b.duration);
        return breakSortOrder === 'asc' ? durA - durB : durB - durA;
      }
      const timeA = new Date(a.startTime.endsWith('Z') ? a.startTime : a.startTime + 'Z').getTime();
      const timeB = new Date(b.startTime.endsWith('Z') ? b.startTime : b.startTime + 'Z').getTime();
      return breakSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
    return list;
  }, [detail?.breaks, breakSortBy, breakSortOrder]);

  if (!employeeId) return null;

  const displayDateStr = startDate && endDate
    ? (startDate === endDate ? startDate : `${startDate} to ${endDate}`)
    : (date || '');

  const tasksCount = detail?.tasks?.length || 0;
  const breaksCount = detail?.breaks?.length || 0;
  const supportCount = detail?.supportActivities?.length || 0;
  const idlesCount = (detail?.idles || []).length;
  const timelineCount = mergedTimeline.length;

  const toggleTaskSessionExpand = (taskId: number) => {
    setExpandedTaskSessions((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const toggleBreakSort = (field: 'time' | 'duration') => {
    if (breakSortBy === field) {
      setBreakSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setBreakSortBy(field);
      setBreakSortOrder('asc');
    }
  };

  const getBreakIcon = (breakType: string) => {
    const lower = breakType.toLowerCase();
    if (lower.includes('tea')) return '☕';
    if (lower.includes('lunch')) return '🍽️';
    if (lower.includes('bio')) return '🚻';
    return '⏸️';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '940px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--panel)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sticky Header + Metric Cards + Tab Bar */}
        <div
          style={{
            padding: '1.5rem 1.75rem 0.75rem 1.75rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--panel)',
            flexShrink: 0
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.9rem', padding: '0.3rem 0.6rem' }}>
                  {detail?.employeeCode || 'EMP'}
                </span>
                <h2 style={{ fontSize: '1.35rem', margin: 0 }}>{detail?.employeeName || 'Employee Details'}</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {detail?.departmentName} • Activity & Time Log for <strong>{displayDateStr}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.4rem', borderRadius: '50%', border: 'none' }}
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Top Metric Cards */}
          {detail && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {/* Login / Logout */}
              <div style={{ background: 'var(--bg-primary)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Login / Logout</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)' }}>
                  In: {formatTime(detail.loginTime)}
                </span>
                <br />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Out: {formatTime(detail.logoutTime)}
                </span>
              </div>

              {/* Productive Time */}
              <div style={{ background: 'var(--bg-primary)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Productive Time</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>
                  {formatDurationToHoursMinutes(detail.productiveHours)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.1rem' }}>Active Tasks</span>
              </div>

              {/* Break Time */}
              <div style={{ background: 'var(--bg-primary)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Break Time</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--warning)' }}>
                  {formatDurationToHoursMinutes(detail.breakHours)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.1rem' }}>
                  {breaksCount} break{breaksCount === 1 ? '' : 's'}
                </span>
              </div>

              {/* Idle Time */}
              <div style={{ background: 'var(--bg-primary)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Idle Time</span>
                <span style={{
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  color: (detail.idleHours || 0) > 0 ? '#d97706' : 'var(--text-muted)'
                }}>
                  {formatDurationToHoursMinutes(detail.idleHours || 0)}
                </span>
                <span style={{ fontSize: '0.7rem', color: (detail.idleHours || 0) > 0 ? '#d97706' : 'var(--text-secondary)', display: 'block', marginTop: '0.1rem' }}>
                  {idlesCount} idle gap{idlesCount === 1 ? '' : 's'}
                </span>
              </div>

              {/* Non-Productive Time */}
              <div style={{ background: 'var(--bg-primary)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Non-Productive</span>
                  <span title="Combined duration: Break Time + Idle Time" style={{ cursor: 'help', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                  </span>
                </div>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--warning)' }}>
                  {formatDurationToHoursMinutes(detail.nonProductiveHours || (detail.breakHours + (detail.idleHours || 0)))}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.1rem' }}>
                  Break + Idle
                </span>
              </div>
            </div>
          )}

          {/* Sub Tabs */}
          {detail && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={`btn ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.4rem 0.8rem',
                  opacity: tasksCount === 0 && activeTab !== 'tasks' ? 0.55 : 1,
                }}
                onClick={() => setActiveTab('tasks')}
                title={tasksCount === 0 ? 'No work tasks recorded' : undefined}
              >
                <Briefcase size={15} />
                <span>Work Tasks ({tasksCount})</span>
              </button>

              <button
                className={`btn ${activeTab === 'breaks' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.4rem 0.8rem',
                  opacity: breaksCount === 0 && activeTab !== 'breaks' ? 0.55 : 1,
                }}
                onClick={() => setActiveTab('breaks')}
                title={breaksCount === 0 ? 'No breaks logged' : undefined}
              >
                <Coffee size={15} />
                <span>Breaks ({breaksCount})</span>
              </button>

              <button
                className={`btn ${activeTab === 'support' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.4rem 0.8rem',
                  opacity: supportCount === 0 && activeTab !== 'support' ? 0.55 : 1,
                }}
                onClick={() => setActiveTab('support')}
                title={supportCount === 0 ? 'No support calls logged' : undefined}
              >
                <PhoneCall size={15} />
                <span>Support Calls ({supportCount})</span>
              </button>

              <button
                className={`btn ${activeTab === 'idles' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.4rem 0.8rem',
                  opacity: idlesCount === 0 && activeTab !== 'idles' ? 0.55 : 1,
                }}
                onClick={() => setActiveTab('idles')}
                title={idlesCount === 0 ? 'No idle gaps recorded' : undefined}
              >
                <Clock size={15} />
                <span>Idle Gaps ({idlesCount})</span>
              </button>

              <button
                className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.4rem 0.8rem',
                  opacity: timelineCount === 0 && activeTab !== 'timeline' ? 0.55 : 1,
                }}
                onClick={() => setActiveTab('timeline')}
                title={timelineCount === 0 ? 'No timeline events recorded' : undefined}
              >
                <Clock size={15} />
                <span>Full Timeline ({timelineCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem 1.75rem 1.75rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading employee activity breakdown...
            </div>
          ) : !detail ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              Failed to load daily activity details.
            </div>
          ) : (
            <>
              {/* Tab 1: Work Tasks */}
              {activeTab === 'tasks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {detail.tasks.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      No work tasks recorded on this date.
                    </p>
                  ) : (
                    detail.tasks.map((task) => {
                      const sessionCount = (task.sessions || []).length;
                      const isExpanded = !!expandedTaskSessions[task.taskId];
                      const visibleSessions = isExpanded || sessionCount <= 1
                        ? task.sessions
                        : task.sessions.slice(0, 1);

                      return (
                        <div
                          key={task.taskId}
                          style={{
                            background: 'var(--bg-primary)',
                            borderRadius: '12px',
                            padding: '1.15rem',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{task.moduleName}</h4>
                              {task.description && (
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <span className={`badge ${task.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                              {task.status}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <span><strong>Product:</strong> {task.productName || 'N/A'}</span>
                            <span><strong>Client:</strong> {task.clientName || 'N/A'}</span>
                            <span><strong>Total Worked:</strong> {formatDurationToHoursMinutes(task.totalTaskHours)}</span>
                          </div>

                          {/* Sessions List */}
                          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Work Time Sessions ({sessionCount}):
                              </span>
                              {sessionCount > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.2rem 0.55rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => toggleTaskSessionExpand(task.taskId)}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp size={13} />
                                      <span>Show less</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={13} />
                                      <span>Show all sessions ({sessionCount})</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            {sessionCount === 0 ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No work time sessions logged for this task.
                              </span>
                            ) : (
                              visibleSessions.map((s, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.85rem',
                                    padding: '0.3rem 0',
                                    borderBottom: idx < visibleSessions.length - 1 ? '1px dashed var(--border-color)' : 'none'
                                  }}
                                >
                                  <span style={{ color: 'var(--text-main)' }}>
                                    🕒 {formatTime(s.startTime)} ➔ {s.endTime ? formatTime(s.endTime) : 'In Progress'}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                                    Duration: {formatDurationString(s.duration)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab 2: Breaks */}
              {activeTab === 'breaks' && (
                <div className="table-container" style={{ padding: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Break Type</th>
                        <th
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => toggleBreakSort('time')}
                          title="Click to sort by start time"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>Start Time</span>
                            <ArrowUpDown size={12} style={{ opacity: breakSortBy === 'time' ? 1 : 0.4 }} />
                          </div>
                        </th>
                        <th>End Time</th>
                        <th
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => toggleBreakSort('duration')}
                          title="Click to sort by duration"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>Duration</span>
                            <ArrowUpDown size={12} style={{ opacity: breakSortBy === 'duration' ? 1 : 0.4 }} />
                          </div>
                        </th>
                        <th>Held Task Module</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBreaks.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No break logs on this date.</td></tr>
                      ) : (
                        sortedBreaks.map((b, i) => {
                          const outlier = isBreakOutlier(b);
                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, color: 'var(--warning)' }}>
                                {getBreakIcon(b.breakTypeName)} {b.breakTypeName}
                              </td>
                              <td>{formatTime(b.startTime)}</td>
                              <td>{formatTime(b.endTime)}</td>
                              <td>
                                {outlier ? (
                                  <span
                                    className="badge badge-warning"
                                    style={{ fontWeight: 700, fontSize: '0.85rem' }}
                                    title="Unusually long break duration"
                                  >
                                    {formatDurationString(b.duration)} ⚠️
                                  </span>
                                ) : (
                                  <span style={{ fontWeight: 600 }}>{formatDurationString(b.duration)}</span>
                                )}
                              </td>
                              <td>{resolveHeldTaskModule(b)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Support Calls */}
              {activeTab === 'support' && (
                <div className="table-container" style={{ padding: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Product</th>
                        <th>Client</th>
                        <th>Time Slot</th>
                        <th>Duration</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.supportActivities.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No support activity logged on this date.</td></tr>
                      ) : (
                        detail.supportActivities.map((s, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, color: 'var(--info)' }}>📞 {s.activityTypeName}</td>
                            <td>{s.productName || '--'}</td>
                            <td>{s.clientName || '--'}</td>
                            <td>{formatTime(s.startTime)} - {formatTime(s.endTime)}</td>
                            <td style={{ fontWeight: 700 }}>{formatDurationString(s.duration)}</td>
                            <td style={{ fontSize: '0.85rem' }}>{s.remarks || '--'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: Idle Gaps */}
              {activeTab === 'idles' && (
                <div className="table-container" style={{ padding: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Gap Type</th>
                        <th>Time Slot (Start ➔ End IST)</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!detail.idles || detail.idles.length === 0) ? (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>No idle time logged on {displayDateStr}.</td></tr>
                      ) : (
                        detail.idles.map((idle, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>⏸️ {idle.type || 'Idle Gap'}</td>
                            <td>{formatTime(idle.startTime)} ➔ {formatTime(idle.endTime)}</td>
                            <td style={{ fontWeight: 700, color: '#d97706' }}>{formatDurationString(idle.duration)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 5: Full Timeline (Compact Paired List) */}
              {activeTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {mergedTimeline.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No timeline events recorded.</p>
                  ) : (
                    mergedTimeline.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          padding: '0.55rem 0.85rem',
                          background: 'var(--bg-primary)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.85rem',
                        }}
                      >
                        {/* Type Icon Badge */}
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background:
                              item.type === 'Task'
                                ? 'rgba(59, 130, 246, 0.12)'
                                : item.type === 'Break'
                                ? 'rgba(245, 158, 11, 0.12)'
                                : item.type === 'Support'
                                ? 'rgba(139, 92, 246, 0.12)'
                                : item.type === 'Idle'
                                ? 'rgba(217, 119, 6, 0.12)'
                                : 'rgba(16, 185, 129, 0.12)',
                            color:
                              item.type === 'Task'
                                ? '#3b82f6'
                                : item.type === 'Break'
                                ? '#f59e0b'
                                : item.type === 'Support'
                                ? '#8b5cf6'
                                : item.type === 'Idle'
                                ? '#d97706'
                                : '#10b981',
                          }}
                        >
                          {item.type === 'Task' && <Briefcase size={14} />}
                          {item.type === 'Break' && <Coffee size={14} />}
                          {item.type === 'Support' && <PhoneCall size={14} />}
                          {item.type === 'Idle' && <Clock size={14} />}
                          {item.type === 'Attendance' && (item.statusBadge === 'Login' ? <LogIn size={14} /> : <LogOut size={14} />)}
                        </div>

                        {/* Time Slot Range */}
                        <div style={{ minWidth: '155px', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem', flexShrink: 0 }}>
                          {item.endTimeFormatted ? `${item.startTimeFormatted} ➔ ${item.endTimeFormatted}` : item.startTimeFormatted}
                        </div>

                        {/* Title & Subtitle */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.title}
                            </span>
                            {item.statusBadge && item.type !== 'Attendance' && (
                              <span
                                className={`badge badge-${item.badgeType || 'secondary'}`}
                                style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', lineHeight: 1 }}
                              >
                                {item.statusBadge}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                              {item.subtitle}
                            </div>
                          )}
                        </div>

                        {/* Duration Badge */}
                        {item.duration && (
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              color: item.type === 'Task' ? 'var(--success)' : item.type === 'Break' ? 'var(--warning)' : 'var(--text-secondary)',
                              flexShrink: 0,
                            }}
                          >
                            {item.duration}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
