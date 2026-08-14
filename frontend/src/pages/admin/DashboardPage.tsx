import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import {
  Users,
  Clock,
  AlertTriangle,
  Briefcase,
  Coffee,
  PhoneCall,
  UserX,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';
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
      {/* Top Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              Admin Command Center
            </h1>
            <span className="badge badge-success">
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-accent)',
              }} />
              Live Telemetry
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
            Real-time workforce intelligence, productive capacity, and automated telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Refreshed at <strong>{lastRefreshed} IST</strong>
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
            <span>Sync live feed</span>
          </button>
        </div>
      </div>

      {loading ? (
        /* Skeleton Loading State */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ui-card skeleton" style={{ height: '140px' }} />
            ))}
          </div>
          <div className="ui-card skeleton" style={{ height: '220px' }} />
          <div className="ui-card skeleton" style={{ height: '300px' }} />
        </div>
      ) : !metrics ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger-text)' }}>
          Failed to load live command center telemetry.
        </div>
      ) : (
        <>
          {/* 1. TOP KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            
            {/* Card 1: Workforce Present */}
            <div className="ui-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Workforce present
                </span>
                <div className="icon-badge icon-badge-primary">
                  <Users size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
                  {metrics.activeWorkforceCount}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  / {metrics.totalEmployees} employees
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-success">
                  <TrendingUp size={12} />
                  <span>{getPct(metrics.activeWorkforceCount, metrics.totalEmployees)}% attendance rate</span>
                </span>
              </div>
            </div>

            {/* Card 2: Productive Time */}
            <div className="ui-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Today productive time
                </span>
                <div className="icon-badge icon-badge-success">
                  <Clock size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--success-text)', lineHeight: 1 }}>
                  {formatDurationToHoursMinutes(metrics.todayProductiveHours)}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Aggregate task and support hours
              </div>
            </div>

            {/* Card 3: Late Logins Today */}
            <div className="ui-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Late logins today
                </span>
                <div className="icon-badge icon-badge-danger">
                  <AlertTriangle size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--danger-text)', lineHeight: 1 }}>
                  {metrics.todayGraceViolations}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>employees</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: metrics.todayGraceViolations > 0 ? 'var(--danger-text)' : 'var(--success-text)', fontWeight: 600 }}>
                {metrics.todayGraceViolations > 0 ? 'Exceeded shift grace limit' : 'All logins within grace limit'}
              </div>
            </div>

            {/* Card 4: Active Tasks */}
            <div className="ui-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active tasks executing
                </span>
                <div className="icon-badge icon-badge-warning">
                  <Briefcase size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--warning-text)', lineHeight: 1 }}>
                  {metrics.workingCount}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>tasks active</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Real-time task engine executing
              </div>
            </div>
          </div>

          {/* 2. LIVE WORKFORCE STATUS BREAKDOWN */}
          <div className="ui-card" style={{ marginBottom: '1.75rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Live workforce status breakdown
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Real-time ratio of active present workforce ({metrics.activeWorkforceCount} present / {metrics.totalEmployees} total)
                </p>
              </div>

              <span className="badge badge-primary">
                {metrics.totalEmployees} registered workforce
              </span>
            </div>

            {/* Multi-Segment Horizontal Stacked Bar */}
            <div style={{
              height: '14px',
              width: '100%',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(255,255,255,0.08)',
              display: 'flex',
              overflow: 'hidden',
              marginBottom: '1.25rem',
              border: '1px solid var(--border-color)'
            }}>
              <div
                style={{ width: `${getPct(metrics.workingCount, metrics.totalEmployees)}%`, backgroundColor: 'var(--primary)', transition: 'width 0.5s ease' }}
                title={`Working: ${metrics.workingCount} (${getPct(metrics.workingCount, metrics.totalEmployees)}%)`}
              />
              <div
                style={{ width: `${getPct(metrics.onBreakCount, metrics.totalEmployees)}%`, backgroundColor: 'var(--warning-accent)', transition: 'width 0.5s ease' }}
                title={`On Break: ${metrics.onBreakCount} (${getPct(metrics.onBreakCount, metrics.totalEmployees)}%)`}
              />
              <div
                style={{ width: `${getPct(metrics.inSupportCount, metrics.totalEmployees)}%`, backgroundColor: 'var(--success-accent)', transition: 'width 0.5s ease' }}
                title={`In Support: ${metrics.inSupportCount} (${getPct(metrics.inSupportCount, metrics.totalEmployees)}%)`}
              />
              <div
                style={{ width: `${getPct(metrics.offlineCount, metrics.totalEmployees)}%`, backgroundColor: 'var(--text-muted)', transition: 'width 0.5s ease' }}
                title={`Offline/Absent: ${metrics.offlineCount} (${getPct(metrics.offlineCount, metrics.totalEmployees)}%)`}
              />
            </div>

            {/* 4 Detail Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              
              {/* Working */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderLeft: '4px solid var(--primary)',
                borderTop: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <div className="icon-badge icon-badge-primary">
                  <Briefcase size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Working on task</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {metrics.workingCount} <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>({getPct(metrics.workingCount, metrics.totalEmployees)}%)</span>
                  </div>
                </div>
              </div>

              {/* On Break */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderLeft: '4px solid var(--warning-accent)',
                borderTop: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <div className="icon-badge icon-badge-warning">
                  <Coffee size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>On break</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {metrics.onBreakCount} <span style={{ fontSize: '0.8rem', color: 'var(--warning-text)' }}>({getPct(metrics.onBreakCount, metrics.totalEmployees)}%)</span>
                  </div>
                </div>
              </div>

              {/* In Support Call */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderLeft: '4px solid var(--success-accent)',
                borderTop: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <div className="icon-badge icon-badge-success">
                  <PhoneCall size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>In support call</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {metrics.inSupportCount} <span style={{ fontSize: '0.8rem', color: 'var(--success-text)' }}>({getPct(metrics.inSupportCount, metrics.totalEmployees)}%)</span>
                  </div>
                </div>
              </div>

              {/* Offline */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderLeft: '4px solid var(--text-muted)',
                borderTop: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserX size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Offline / absent</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {metrics.offlineCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({getPct(metrics.offlineCount, metrics.totalEmployees)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. REAL-TIME ACTIVITY STREAM */}
          <div className="ui-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} style={{ color: 'var(--primary)' }} />
                  <span>Real-time activity stream & telemetry feed</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Chronological event stream of task executions, break logs, and support activities
                </p>
              </div>

              <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {metrics.recentActivities.length} recent events
              </span>
            </div>

            {metrics.recentActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                No telemetry activity logged today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {metrics.recentActivities.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Left: Employee Avatar & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        background: 'var(--primary)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        E{a.employeeId}
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          Employee #{a.employeeId}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Ref table: <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{a.refTable} #{a.refId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Activity Badge & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${
                        a.activityType === 'Task' ? 'badge-primary' :
                        a.activityType === 'Break' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {a.activityType === 'Task' && 'Task'}
                        {a.activityType === 'Break' && 'Break'}
                        {a.activityType === 'Support' && 'Support'}
                        {!['Task', 'Break', 'Support'].includes(a.activityType) && a.activityType}
                      </span>

                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: a.status === 'Running' || a.status === 'Active' ? 'var(--success-text)' : 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-xs)'
                      }}>
                        {a.status}
                      </span>
                    </div>

                    {/* Right: IST Time & Duration */}
                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}>
                        🕒 {formatTimeIST(a.startTime)}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {getRelativeTime(a.startTime)} • {a.duration || 'In progress...'}
                      </div>
                    </div>

                    {/* Remarks/Outcome */}
                    {a.remarks && (
                      <div style={{
                        width: '100%',
                        fontSize: '0.785rem',
                        color: 'var(--text-main)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-xs)',
                        borderLeft: '3px solid var(--primary)',
                        borderTop: '1px solid var(--border-color)',
                        borderRight: '1px solid var(--border-color)',
                        borderBottom: '1px solid var(--border-color)',
                        marginTop: '0.2rem'
                      }}>
                        💬 {a.remarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
