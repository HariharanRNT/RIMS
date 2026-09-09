import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { CelebrationBanner } from '../../components/dashboard/CelebrationBanner';
import { RefreshCw, X, Search } from 'lucide-react';
import { formatTimeIST, formatDurationToHoursMinutes } from '../../utils/dateUtils';

interface ActivityItem {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeCode?: string;
  activityType: string;
  refTable: string;
  refId: number;
  startTime: string;
  endTime?: string;
  status: string;
  remarks?: string;
  duration?: string;
}

interface WorkforceStatusEmployee {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  statusDetail?: string;
  startTime?: string;
  duration?: string;
  secondaryDetail?: string;
}

interface Metrics {
  totalEmployees: number;
  activeWorkforceCount: number;
  workingCount: number;
  onBreakCount: number;
  inSupportCount: number;
  offlineCount: number;
  todayProductiveHours: number;
  todayGraceViolations: number;
  recentActivities: ActivityItem[];
  workingEmployees?: WorkforceStatusEmployee[];
  onBreakEmployees?: WorkforceStatusEmployee[];
  inSupportEmployees?: WorkforceStatusEmployee[];
  offlineEmployees?: WorkforceStatusEmployee[];
}

type StatusKey = 'working' | 'break' | 'support' | 'offline';

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string;
    icon: string;
    accent: string;
    accentDim: string;
    emptyMessage: string;
    count: (m: Metrics) => number;
    list: (m: Metrics) => WorkforceStatusEmployee[];
  }
> = {
  working: {
    label: 'Working on task',
    icon: '💼',
    accent: 'var(--amber)',
    accentDim: 'var(--amber-dim)',
    emptyMessage: 'No employees are currently working on a task.',
    count: (m) => m.workingCount,
    list: (m) => m.workingEmployees || []
  },
  break: {
    label: 'On break',
    icon: '☕',
    accent: 'var(--blue)',
    accentDim: 'var(--blue-dim)',
    emptyMessage: 'No one is currently on break.',
    count: (m) => m.onBreakCount,
    list: (m) => m.onBreakEmployees || []
  },
  support: {
    label: 'In support call',
    icon: '📞',
    accent: 'var(--green)',
    accentDim: 'var(--green-dim)',
    emptyMessage: 'No employees are currently in a support call.',
    count: (m) => m.inSupportCount,
    list: (m) => m.inSupportEmployees || []
  },
  offline: {
    label: 'Offline / absent',
    icon: '✕',
    accent: 'var(--red)',
    accentDim: 'var(--red-dim)',
    emptyMessage: 'All registered employees are currently active and logged in!',
    count: (m) => m.offlineCount,
    list: (m) => m.offlineEmployees || []
  }
};

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<StatusKey | null>(null);
  const [statusSearch, setStatusSearch] = useState<string>('');

  // Activity stream filters
  const [feedTypeFilter, setFeedTypeFilter] = useState<string>('ALL');
  const [feedEmployeeFilter, setFeedEmployeeFilter] = useState<string>('ALL');
  const [feedSearch, setFeedSearch] = useState<string>('');

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await apiClient.get('/reports/admin-dashboard');
      if (res.data.success) {
        setMetrics(res.data.data);
        const now = new Date();
        setLastRefreshed(
          now.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })
        );
      }
    } catch (err) {
      console.error('Failed to fetch admin metrics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => fetchMetrics(), 30000);
    const handleActivityChanged = () => fetchMetrics();
    window.addEventListener('activity-changed', handleActivityChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('activity-changed', handleActivityChanged);
    };
  }, []);

  const getRelativeTime = (isoStr: string) => {
    if (!isoStr) return '';
    const utcStr = isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z';
    const time = new Date(utcStr).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - time) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getPct = (val: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  const getInitials = (name?: string, id?: number) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return `E${id || '0'}`;
  };

  const toggleStatus = (key: StatusKey) => {
    if (selectedStatus === key) {
      setSelectedStatus(null);
      setStatusSearch('');
    } else {
      setSelectedStatus(key);
      setStatusSearch('');
    }
  };

  const formatActivityType = (type?: string) => {
    if (!type) return 'Task';
    const clean = type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').trim();
    const lower = clean.toLowerCase();
    if (lower.includes('support')) return 'Support Activity';
    if (lower.includes('break')) return 'Break';
    if (lower.includes('task')) return 'Task';
    return clean
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatStatusText = (status?: string) => {
    if (!status) return '';
    const clean = status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').trim();
    return clean
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const getStatusColorConfig = (status?: string, activityType?: string) => {
    const s = (status || '').toLowerCase();
    const t = (activityType || '').toLowerCase();

    // Green: Active, Resumed, Running, In Progress, Started
    if (
      s.includes('active') ||
      s.includes('resume') ||
      s.includes('running') ||
      s.includes('start') ||
      s.includes('progress')
    ) {
      return {
        accent: 'var(--green)',
        accentDim: 'var(--green-dim)',
        tagClass: 'tag tag-resumed'
      };
    }
    // Amber / Yellow: OnHold, AutoHeld, Paused, Pending, Hold
    if (s.includes('hold') || s.includes('pause') || s.includes('pending') || s.includes('wait')) {
      return {
        accent: 'var(--amber)',
        accentDim: 'var(--amber-dim)',
        tagClass: 'tag tag-autoheld'
      };
    }
    // Red: Stopped, Terminated, Rejected, Cancelled, Failed, Violation
    if (
      s.includes('stop') ||
      s.includes('reject') ||
      s.includes('cancel') ||
      s.includes('terminat') ||
      s.includes('fail') ||
      s.includes('violation')
    ) {
      return {
        accent: 'var(--red)',
        accentDim: 'var(--red-dim)',
        tagClass: 'tag tag-red'
      };
    }
    // Blue / Neutral: Completed, Finished, Logged, Info
    if (s.includes('complete') || s.includes('finish') || s.includes('end') || s.includes('done')) {
      return {
        accent: 'var(--blue)',
        accentDim: 'var(--blue-dim)',
        tagClass: 'tag tag-completed'
      };
    }
    // Fallbacks based on activity type
    if (t.includes('support')) {
      return {
        accent: 'var(--green)',
        accentDim: 'var(--green-dim)',
        tagClass: 'tag tag-support'
      };
    }
    if (t.includes('break')) {
      return {
        accent: 'var(--blue)',
        accentDim: 'var(--blue-dim)',
        tagClass: 'tag tag-break'
      };
    }
    return {
      accent: 'var(--amber)',
      accentDim: 'var(--amber-dim)',
      tagClass: 'tag tag-task'
    };
  };

  const getActivityTypeClass = (activityType?: string) => {
    const t = (activityType || '').toLowerCase();
    if (t.includes('support')) return 'tag tag-support';
    if (t.includes('break')) return 'tag tag-break';
    return 'tag tag-task';
  };

  type TimeGroup = 'Just now' | 'Earlier today' | 'Yesterday' | 'Earlier this week' | 'Older';

  const getTimeGroup = (isoStr?: string): TimeGroup => {
    if (!isoStr) return 'Earlier today';
    const utcStr = isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z';
    const eventTime = new Date(utcStr).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - eventTime) / 60000);

    if (diffMins < 15) return 'Just now';

    const eventDate = new Date(utcStr);
    const nowDate = new Date();
    const isSameDay =
      eventDate.getDate() === nowDate.getDate() &&
      eventDate.getMonth() === nowDate.getMonth() &&
      eventDate.getFullYear() === nowDate.getFullYear();

    if (isSameDay) return 'Earlier today';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      eventDate.getDate() === yesterday.getDate() &&
      eventDate.getMonth() === yesterday.getMonth() &&
      eventDate.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Yesterday';

    const diffDays = Math.floor((now - eventTime) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return 'Earlier this week';

    return 'Older';
  };

  const activeConfig = selectedStatus ? STATUS_CONFIG[selectedStatus] : null;
  const rawEmployees = activeConfig && metrics ? activeConfig.list(metrics) : [];
  const filteredEmployees = rawEmployees.filter((emp) => {
    if (!statusSearch.trim()) return true;
    const q = statusSearch.toLowerCase();
    return (
      emp.employeeName?.toLowerCase().includes(q) ||
      emp.employeeCode?.toLowerCase().includes(q) ||
      emp.departmentName?.toLowerCase().includes(q) ||
      emp.statusDetail?.toLowerCase().includes(q) ||
      emp.secondaryDetail?.toLowerCase().includes(q)
    );
  });

  // Derived activity feed filters
  const allActivities = metrics?.recentActivities || [];
  const uniqueEmployees = Array.from(
    new Set(
      allActivities
        .map((a) => a.employeeName?.trim())
        .filter((name): name is string => Boolean(name))
    )
  ).sort();

  const uniqueTypes = Array.from(
    new Set(allActivities.map((a) => formatActivityType(a.activityType)))
  ).sort();

  const filteredActivities = allActivities.filter((a) => {
    const formattedType = formatActivityType(a.activityType);
    if (feedTypeFilter !== 'ALL' && formattedType.toLowerCase() !== feedTypeFilter.toLowerCase()) {
      return false;
    }
    if (feedEmployeeFilter !== 'ALL' && a.employeeName !== feedEmployeeFilter) {
      return false;
    }
    if (feedSearch.trim()) {
      const q = feedSearch.toLowerCase();
      const matchesName = a.employeeName?.toLowerCase().includes(q);
      const matchesCode = a.employeeCode?.toLowerCase().includes(q);
      const matchesRef = `${a.refTable} #${a.refId}`.toLowerCase().includes(q);
      const matchesRemarks = a.remarks?.toLowerCase().includes(q);
      const matchesType = formattedType.toLowerCase().includes(q);
      const matchesStatus = a.status?.toLowerCase().includes(q);
      if (!matchesName && !matchesCode && !matchesRef && !matchesRemarks && !matchesType && !matchesStatus) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* 🎉 Today's Employee Celebrations Banner */}
      <CelebrationBanner />

      {/* Top Header Section */}
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="pulse-dot"></span>
            Live Telemetry — Grid Nominal
          </div>
          <h1>Command Center</h1>
          <p className="page-sub">
            Live read on who's on the floor, what's running, and what needs eyes.
          </p>
        </div>

        <div className="head-right">
          {lastRefreshed && (
            <div className="refreshed">
              Last sync <b>{lastRefreshed} IST</b>
            </div>
          )}
          <button
            className="sync-btn"
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin-animation' : ''} />
            <span>Sync live feed</span>
          </button>
        </div>
      </div>

      {loading ? (
        /* Skeleton Loading State */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="kpi-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="panel skeleton" style={{ height: '120px' }} />
            ))}
          </div>
          <div className="panel skeleton" style={{ height: '180px' }} />
          <div className="panel skeleton" style={{ height: '300px' }} />
        </div>
      ) : !metrics ? (
        <div className="panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--red)' }}>
          Failed to load live command center telemetry.
        </div>
      ) : (
        <>
          {/* 1. TOP KPI CARDS */}
          <div className="kpi-grid">
            {/* Card 1: Workforce Present */}
            <div className="kpi" style={{ '--accent': 'var(--green)', '--accent-dim': 'var(--green-dim)' } as React.CSSProperties}>
              <div className="kpi-top">
                <div className="kpi-label">Workforce Present</div>
                <div className="kpi-icon">◉</div>
              </div>
              <div className="kpi-value">
                {metrics.activeWorkforceCount}
                <span className="unit">/ {metrics.totalEmployees} employees</span>
              </div>
              <div className="kpi-foot tag-green">
                ▲ {getPct(metrics.activeWorkforceCount, metrics.totalEmployees)}% attendance rate
              </div>
            </div>

            {/* Card 2: Productive Time */}
            <div className="kpi" style={{ '--accent': 'var(--blue)', '--accent-dim': 'var(--blue-dim)' } as React.CSSProperties}>
              <div className="kpi-top">
                <div className="kpi-label">Today Productive Time</div>
                <div className="kpi-icon">◷</div>
              </div>
              <div className="kpi-value">
                {formatDurationToHoursMinutes(metrics.todayProductiveHours)}
              </div>
              <div className="kpi-foot">
                Aggregate task &amp; support hours
              </div>
            </div>

            {/* Card 3: Late Logins Today */}
            <div className="kpi" style={{ '--accent': 'var(--red)', '--accent-dim': 'var(--red-dim)' } as React.CSSProperties}>
              <div className="kpi-top">
                <div className="kpi-label">Late Logins Today</div>
                <div className="kpi-icon">⚠</div>
              </div>
              <div className="kpi-value">
                {metrics.todayGraceViolations}
                <span className="unit">employees</span>
              </div>
              <div className={`kpi-foot ${metrics.todayGraceViolations > 0 ? 'tag-red' : 'tag-green'}`}>
                {metrics.todayGraceViolations > 0 ? 'Exceeded shift grace limit' : 'All within grace limit'}
              </div>
            </div>

            {/* Card 4: Active Tasks */}
            <div className="kpi" style={{ '--accent': 'var(--amber)', '--accent-dim': 'var(--amber-dim)' } as React.CSSProperties}>
              <div className="kpi-top">
                <div className="kpi-label">Active Tasks Executing</div>
                <div className="kpi-icon">▣</div>
              </div>
              <div className="kpi-value">
                {metrics.workingCount}
                <span className="unit">tasks active</span>
              </div>
              <div className="kpi-foot">
                Real-time task engine executing
              </div>
            </div>
          </div>

          {/* 2. LIVE WORKFORCE STATUS BREAKDOWN */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">
                  <span className="ic">◉</span>
                  Live workforce status breakdown
                </div>
                <div className="panel-desc">
                  Real-time ratio of active present workforce ({metrics.activeWorkforceCount} present / {metrics.totalEmployees} total)
                </div>
              </div>

              <div className="panel-badge">
                {metrics.totalEmployees} registered workforce
              </div>
            </div>

            {/* Multi-Segment Horizontal Stacked Bar */}
            <div className="stack-bar">
              <span
                style={{ width: `${getPct(metrics.workingCount, metrics.totalEmployees)}%`, background: 'var(--amber)' }}
                title={`Working: ${metrics.workingCount} (${getPct(metrics.workingCount, metrics.totalEmployees)}%)`}
              />
              <span
                style={{ width: `${getPct(metrics.onBreakCount, metrics.totalEmployees)}%`, background: 'var(--blue)' }}
                title={`On Break: ${metrics.onBreakCount} (${getPct(metrics.onBreakCount, metrics.totalEmployees)}%)`}
              />
              <span
                style={{ width: `${getPct(metrics.inSupportCount, metrics.totalEmployees)}%`, background: 'var(--green)' }}
                title={`In Support: ${metrics.inSupportCount} (${getPct(metrics.inSupportCount, metrics.totalEmployees)}%)`}
              />
              <span
                style={{ width: `${getPct(metrics.offlineCount, metrics.totalEmployees)}%`, background: 'var(--border)' }}
                title={`Offline/Absent: ${metrics.offlineCount} (${getPct(metrics.offlineCount, metrics.totalEmployees)}%)`}
              />
            </div>

            {/* 4 Detail Status Tiles */}
            <div className="status-grid">
              {(['working', 'break', 'support', 'offline'] as StatusKey[]).map((key) => {
                const config = STATUS_CONFIG[key];
                const count = config.count(metrics);
                const pct = getPct(count, metrics.totalEmployees);
                const isActive = selectedStatus === key;

                return (
                  <div
                    key={key}
                    className={`status-tile ${isActive ? 'active' : ''}`}
                    style={{ '--accent': config.accent, '--accent-dim': config.accentDim } as React.CSSProperties}
                    onClick={() => toggleStatus(key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleStatus(key);
                      }
                    }}
                    title={`Click to ${isActive ? 'collapse' : 'view'} ${config.label.toLowerCase()} employees`}
                  >
                    <div className="tile-head">
                      <div className="ic">{config.icon}</div>
                      <span
                        className="active-indicator"
                        style={{ opacity: isActive ? 1 : 0.7 }}
                      >
                        View list {isActive ? '▲' : '▾'}
                      </span>
                    </div>
                    <div className="label">{config.label}</div>
                    <div className="val">
                      {count} <span className="pct">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expandable Employee List Drawer Panel */}
            {selectedStatus && activeConfig && (
              <div
                className="status-drawer-panel"
                style={
                  {
                    '--accent': activeConfig.accent,
                    '--accent-dim': activeConfig.accentDim,
                    borderColor: activeConfig.accent
                  } as React.CSSProperties
                }
              >
                <div className="status-drawer-head">
                  <div className="status-drawer-title">
                    <span style={{ fontSize: '16px' }}>{activeConfig.icon}</span>
                    <span>{activeConfig.label}</span>
                    <span className="status-drawer-badge">
                      {activeConfig.count(metrics)} {activeConfig.count(metrics) === 1 ? 'employee' : 'employees'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {rawEmployees.length > 0 && (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search
                          size={13}
                          style={{
                            position: 'absolute',
                            left: '8px',
                            color: 'var(--text-faint)',
                            pointerEvents: 'none'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Filter employees..."
                          value={statusSearch}
                          onChange={(e) => setStatusSearch(e.target.value)}
                          style={{
                            background: 'var(--panel)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '4px 8px 4px 26px',
                            fontSize: '12px',
                            color: 'var(--text)',
                            width: '160px',
                            outline: 'none'
                          }}
                        />
                        {statusSearch && (
                          <button
                            type="button"
                            onClick={() => setStatusSearch('')}
                            style={{
                              position: 'absolute',
                              right: '6px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-faint)',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '11px'
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      className="status-drawer-close"
                      onClick={() => {
                        setSelectedStatus(null);
                        setStatusSearch('');
                      }}
                      title="Close list"
                      aria-label="Close employee list"
                    >
                      <X size={14} />
                      <span>Close</span>
                    </button>
                  </div>
                </div>

                {rawEmployees.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2rem 1rem',
                      color: 'var(--text-dim)',
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <div style={{ fontSize: '24px', opacity: 0.8 }}>{activeConfig.icon}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{activeConfig.emptyMessage}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                      0 registered workforce members currently in this state.
                    </div>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '1.5rem',
                      color: 'var(--text-dim)',
                      fontSize: '13px'
                    }}
                  >
                    No employees matching "<strong>{statusSearch}</strong>"
                  </div>
                ) : (
                  <div className="status-employee-grid">
                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp.employeeId}
                        className="status-employee-card"
                        style={
                          {
                            '--accent': activeConfig.accent,
                            '--accent-dim': activeConfig.accentDim
                          } as React.CSSProperties
                        }
                      >
                        <div className="status-emp-avatar">
                          {getInitials(emp.employeeName, emp.employeeId)}
                        </div>
                        <div className="status-emp-info">
                          <div className="status-emp-name" title={emp.employeeName}>
                            {emp.employeeName}
                          </div>
                          <div className="status-emp-meta">
                            {emp.employeeCode || `EMP-${emp.employeeId}`}
                            {emp.departmentName ? ` • ${emp.departmentName}` : ''}
                          </div>
                          {emp.statusDetail && (
                            <div className="status-emp-detail" title={emp.statusDetail}>
                              <span>{emp.statusDetail}</span>
                              {emp.duration && (
                                <span style={{ opacity: 0.85, fontWeight: 500 }}>
                                  ({emp.duration})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. REAL-TIME ACTIVITY STREAM */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">
                  <span className="ic">〰</span>
                  Real-time activity stream &amp; telemetry feed
                </div>
                <div className="panel-desc">
                  Chronological event stream of task executions, break logs, and support activities
                </div>
              </div>

              <div className="panel-badge">
                {filteredActivities.length === allActivities.length
                  ? `${allActivities.length} recent events`
                  : `Showing ${filteredActivities.length} of ${allActivities.length} events`}
              </div>
            </div>

            {/* Activity Stream Filter Controls */}
            <div className="feed-filter-bar">
              <div className="feed-filter-chips">
                <button
                  type="button"
                  className={`feed-chip ${feedTypeFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFeedTypeFilter('ALL')}
                >
                  All Types
                </button>
                {uniqueTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`feed-chip ${feedTypeFilter === t ? 'active' : ''}`}
                    onClick={() => setFeedTypeFilter(feedTypeFilter === t ? 'ALL' : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="feed-filter-controls">
                {uniqueEmployees.length > 0 && (
                  <select
                    className="feed-select"
                    value={feedEmployeeFilter}
                    onChange={(e) => setFeedEmployeeFilter(e.target.value)}
                    aria-label="Filter by employee"
                  >
                    <option value="ALL">All Employees ({uniqueEmployees.length})</option>
                    {uniqueEmployees.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                )}

                <div className="feed-search-box">
                  <Search
                    size={13}
                    style={{
                      position: 'absolute',
                      left: '8px',
                      color: 'var(--text-faint)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Filter activity feed..."
                    value={feedSearch}
                    onChange={(e) => setFeedSearch(e.target.value)}
                    aria-label="Filter events by employee or ref ID"
                  />
                  {feedSearch && (
                    <button
                      type="button"
                      onClick={() => setFeedSearch('')}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-faint)',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '11px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {(feedTypeFilter !== 'ALL' || feedEmployeeFilter !== 'ALL' || feedSearch) && (
                  <button
                    type="button"
                    className="feed-chip"
                    style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }}
                    onClick={() => {
                      setFeedTypeFilter('ALL');
                      setFeedEmployeeFilter('ALL');
                      setFeedSearch('');
                    }}
                    title="Reset filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {allActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-faint)', fontSize: '13.5px' }}>
                No telemetry activity logged today.
              </div>
            ) : filteredActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)', fontSize: '13px' }}>
                No activities match the current filter criteria.
              </div>
            ) : (
              <div className="feed">
                {filteredActivities.map((a, index) => {
                  const currentGroup = getTimeGroup(a.startTime);
                  const prevGroup = index > 0 ? getTimeGroup(filteredActivities[index - 1].startTime) : null;
                  const showGroupDivider = index === 0 || currentGroup !== prevGroup;

                  const formattedType = formatActivityType(a.activityType);
                  const formattedStatus = formatStatusText(a.status);
                  const colorConfig = getStatusColorConfig(a.status, a.activityType);
                  const typeBadgeClass = getActivityTypeClass(a.activityType);

                  return (
                    <React.Fragment key={a.id}>
                      {showGroupDivider && (
                        <div className="activity-group-divider">
                          <span className="divider-line" />
                          <span className="divider-badge">{currentGroup}</span>
                          <span className="divider-line" />
                        </div>
                      )}
                      <div className="feed-item">
                        {/* Avatar */}
                        <div
                          className="feed-avatar"
                          style={
                            {
                              '--accent': colorConfig.accent,
                              '--accent-dim': colorConfig.accentDim
                            } as React.CSSProperties
                          }
                        >
                          {getInitials(a.employeeName, a.employeeId)}
                        </div>

                        {/* Main */}
                        <div className="feed-main">
                          <div className="row1">
                            <span className="feed-name">{a.employeeName || `Employee #${a.employeeId}`}</span>
                            <span className="feed-ref">
                              Ref table: {a.refTable} #{a.refId}
                            </span>
                            <span className={typeBadgeClass}>{formattedType}</span>
                            {a.status && <span className={colorConfig.tagClass}>{formattedStatus}</span>}
                          </div>

                          {a.remarks && (
                            <div className="feed-note" style={{ '--accent': colorConfig.accent } as React.CSSProperties}>
                              {a.remarks}
                            </div>
                          )}
                        </div>

                        {/* Time */}
                        <div className="feed-time">
                          <div className="t">{formatTimeIST(a.startTime)}</div>
                          <div className="d">
                            {getRelativeTime(a.startTime)} · {a.duration || 'In progress…'}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
