import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { CelebrationBanner } from '../../components/dashboard/CelebrationBanner';
import { RefreshCw } from 'lucide-react';
import { formatTimeIST, formatDurationToHoursMinutes } from '../../utils/dateUtils';

interface ActivityItem {
  id: number;
  employeeId: number;
  activityType: string;
  refTable: string;
  refId: number;
  startTime: string;
  endTime?: string;
  status: string;
  remarks?: string;
  duration?: string;
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
}

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

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
    return () => clearInterval(interval);
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
              {/* Working */}
              <div className="status-tile" style={{ '--accent': 'var(--amber)', '--accent-dim': 'var(--amber-dim)' } as React.CSSProperties}>
                <div className="ic">💼</div>
                <div className="label">Working on task</div>
                <div className="val">
                  {metrics.workingCount}{' '}
                  <span className="pct">({getPct(metrics.workingCount, metrics.totalEmployees)}%)</span>
                </div>
              </div>

              {/* On Break */}
              <div className="status-tile" style={{ '--accent': 'var(--blue)', '--accent-dim': 'var(--blue-dim)' } as React.CSSProperties}>
                <div className="ic">☕</div>
                <div className="label">On break</div>
                <div className="val">
                  {metrics.onBreakCount}{' '}
                  <span className="pct">({getPct(metrics.onBreakCount, metrics.totalEmployees)}%)</span>
                </div>
              </div>

              {/* In Support Call */}
              <div className="status-tile" style={{ '--accent': 'var(--green)', '--accent-dim': 'var(--green-dim)' } as React.CSSProperties}>
                <div className="ic">📞</div>
                <div className="label">In support call</div>
                <div className="val">
                  {metrics.inSupportCount}{' '}
                  <span className="pct">({getPct(metrics.inSupportCount, metrics.totalEmployees)}%)</span>
                </div>
              </div>

              {/* Offline */}
              <div className="status-tile" style={{ '--accent': 'var(--red)', '--accent-dim': 'var(--red-dim)' } as React.CSSProperties}>
                <div className="ic">✕</div>
                <div className="label">Offline / absent</div>
                <div className="val">
                  {metrics.offlineCount}{' '}
                  <span className="pct">({getPct(metrics.offlineCount, metrics.totalEmployees)}%)</span>
                </div>
              </div>
            </div>
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
                {metrics.recentActivities.length} recent events
              </div>
            </div>

            {metrics.recentActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-faint)', fontSize: '13.5px' }}>
                No telemetry activity logged today.
              </div>
            ) : (
              <div className="feed">
                {metrics.recentActivities.map((a) => {
                  const typeLower = (a.activityType || 'task').toLowerCase();
                  const statusLower = (a.status || '').toLowerCase();
                  const isGreen = statusLower.includes('resume') || statusLower.includes('running') || statusLower.includes('active') || typeLower === 'support';
                  const isAmber = statusLower.includes('held') || statusLower.includes('pause') || typeLower === 'break';
                  const isRed = statusLower.includes('stop') || statusLower.includes('reject');

                  const accentVar = isGreen ? 'var(--green)' : isAmber ? 'var(--amber)' : isRed ? 'var(--red)' : 'var(--blue)';
                  const accentDimVar = isGreen ? 'var(--green-dim)' : isAmber ? 'var(--amber-dim)' : isRed ? 'var(--red-dim)' : 'var(--blue-dim)';

                  const tagClass = typeLower === 'task' ? 'tag tag-task' : typeLower === 'break' ? 'tag tag-break' : 'tag tag-support';
                  const statusTagClass = statusLower.includes('held')
                    ? 'tag tag-autoheld'
                    : statusLower.includes('resume') || statusLower.includes('running') || statusLower.includes('active')
                    ? 'tag tag-resumed'
                    : 'tag tag-completed';

                  return (
                    <div key={a.id} className="feed-item">
                      {/* Avatar */}
                      <div className="feed-avatar" style={{ '--accent': accentVar, '--accent-dim': accentDimVar } as React.CSSProperties}>
                        E{a.employeeId}
                      </div>

                      {/* Main */}
                      <div className="feed-main">
                        <div className="row1">
                          <span className="feed-name">Employee #{a.employeeId}</span>
                          <span className="feed-ref">Ref table: {a.refTable} #{a.refId}</span>
                          <span className={tagClass}>{a.activityType}</span>
                          {a.status && <span className={statusTagClass}>{a.status}</span>}
                        </div>

                        {a.remarks && (
                          <div className="feed-note" style={{ '--accent': accentVar } as React.CSSProperties}>
                            {a.remarks}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <div className="feed-time">
                        <div className="t">{formatTimeIST(a.startTime)}</div>
                        <div className="d">{getRelativeTime(a.startTime)} · {a.duration || 'In progress…'}</div>
                      </div>
                    </div>
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
