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
import { formatTimeIST } from '../../utils/dateUtils';

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
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              lineHeight: 1.1
            }}>
              Admin Command Center
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0, 194, 168, 0.3)',
              color: '#00C2A8',
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0, 194, 168, 0.15)'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#00C2A8',
                boxShadow: '0 0 8px #00C2A8'
              }} />
              LIVE TELEMETRY
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>
            Real-time workforce intelligence, productive capacity, & automated telemetry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.785rem', color: '#475569', fontWeight: 600 }}>
              Refreshed at <strong>{lastRefreshed} IST</strong>
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              borderColor: '#CBD5E1',
              color: '#0F172A',
              fontSize: '0.825rem',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
            <span>Sync Live Feed</span>
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
        <div className="ui-card" style={{ textAlign: 'center', padding: '3rem', color: '#FF5252', backgroundColor: '#FFFFFF' }}>
          Failed to load live command center telemetry.
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 1. TOP 4 ELEVATED FLOATING WHITE KPI CARDS ON #DFDFDF CANVAS */}
          {/* ========================================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            
            {/* Card 1: Workforce Present (Purple Accent Identity) */}
            <div className="ui-card" style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 30px -5px rgba(123, 97, 255, 0.2), 0 4px 12px rgba(15, 23, 42, 0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.785rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Workforce Present
                </span>
                <div style={{ padding: '0.55rem', borderRadius: '12px', background: 'linear-gradient(135deg, #7B61FF 0%, #6C5CE7 100%)', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(123, 97, 255, 0.35)' }}>
                  <Users size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#7B61FF', lineHeight: 1 }}>
                  {metrics.activeWorkforceCount}
                </span>
                <span style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 600 }}>
                  / {metrics.totalEmployees} Employees
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(0, 194, 168, 0.1)',
                  border: '1px solid rgba(0, 194, 168, 0.25)',
                  color: '#00C2A8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}>
                  <TrendingUp size={12} />
                  <span>{getPct(metrics.activeWorkforceCount, metrics.totalEmployees)}% Attendance Rate</span>
                </span>
              </div>
            </div>

            {/* Card 2: Productive Time (Teal/Mint Accent Identity) */}
            <div className="ui-card" style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 30px -5px rgba(0, 194, 168, 0.2), 0 4px 12px rgba(15, 23, 42, 0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.785rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Today Productive Time
                </span>
                <div style={{ padding: '0.55rem', borderRadius: '12px', background: 'linear-gradient(135deg, #00C2A8 0%, #059669 100%)', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(0, 194, 168, 0.35)' }}>
                  <Clock size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#00C2A8', lineHeight: 1 }}>
                  {metrics.todayProductiveHours}
                </span>
                <span style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 600 }}>hrs</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                ⚡ Aggregate Task & Support hours
              </div>
            </div>

            {/* Card 3: Late Logins Today (Coral/Orange Accent Identity) */}
            <div className="ui-card" style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 30px -5px rgba(255, 122, 89, 0.2), 0 4px 12px rgba(15, 23, 42, 0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.785rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Late Logins Today
                </span>
                <div style={{ padding: '0.55rem', borderRadius: '12px', background: 'linear-gradient(135deg, #FF7A59 0%, #FF5252 100%)', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(255, 122, 89, 0.35)' }}>
                  <AlertTriangle size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#FF7A59', lineHeight: 1 }}>
                  {metrics.todayGraceViolations}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Employees</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: metrics.todayGraceViolations > 0 ? '#FF5252' : '#00C2A8', fontWeight: 700 }}>
                {metrics.todayGraceViolations > 0 ? '⚠️ Exceeded shift grace limit' : '✓ All logins within grace limit'}
              </div>
            </div>

            {/* Card 4: Active Tasks (Amber Accent Identity) */}
            <div className="ui-card" style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 30px -5px rgba(245, 158, 11, 0.2), 0 4px 12px rgba(15, 23, 42, 0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.785rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Tasks Executing
                </span>
                <div style={{ padding: '0.55rem', borderRadius: '12px', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)' }}>
                  <Briefcase size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}>
                  {metrics.workingCount}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Tasks Active</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                💻 Real-time task engine executing
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. LIVE WORKFORCE STATUS BREAKDOWN (SOLID WHITE CARD ON #DFDFDF CANVAS) */}
          {/* ========================================================================= */}
          <div className="ui-card" style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: '#FFFFFF',
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.12)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Live Workforce Status Breakdown
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                  Real-time ratio of active present workforce ({metrics.activeWorkforceCount} present / {metrics.totalEmployees} total)
                </p>
              </div>

              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7B61FF', background: 'rgba(123, 97, 255, 0.08)', padding: '0.3rem 0.75rem', borderRadius: '9999px', border: '1px solid rgba(123, 97, 255, 0.2)' }}>
                {metrics.totalEmployees} Registered Workforce
              </span>
            </div>

            {/* Multi-Segment Horizontal Stacked Bar */}
            <div style={{
              height: '16px',
              width: '100%',
              borderRadius: '9999px',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)',
              border: '1px solid #CBD5E1'
            }}>
              <div
                style={{ width: `${getPct(metrics.workingCount, metrics.totalEmployees)}%`, backgroundColor: '#7B61FF', transition: 'width 0.5s ease' }}
                title={`Working: ${metrics.workingCount} (${getPct(metrics.workingCount, metrics.totalEmployees)}%)`}
              />
              <div
                style={{ width: `${getPct(metrics.onBreakCount, metrics.totalEmployees)}%`, backgroundColor: '#F59E0B', transition: 'width 0.5s ease' }}
                title={`On Break: ${metrics.onBreakCount} (${getPct(metrics.onBreakCount, metrics.totalEmployees)}%)`}
              />
              <div
                style={{ width: `${getPct(metrics.inSupportCount, metrics.totalEmployees)}%`, backgroundColor: '#00C2A8', transition: 'width 0.5s ease' }}
                title={`In Support: ${metrics.inSupportCount} (${getPct(metrics.inSupportCount, metrics.totalEmployees)}%)`}
              />
              <div
                style={{ width: `${getPct(metrics.offlineCount, metrics.totalEmployees)}%`, backgroundColor: '#64748B', transition: 'width 0.5s ease' }}
                title={`Offline/Absent: ${metrics.offlineCount} (${getPct(metrics.offlineCount, metrics.totalEmployees)}%)`}
              />
            </div>

            {/* 4 Detail Status Cards with Accent Left Borders */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              
              {/* Working (Violet) */}
              <div style={{
                background: '#FFFFFF',
                borderLeft: '4px solid #7B61FF',
                borderTop: '1px solid #E2E8F0',
                borderRight: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
              }}>
                <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: 'rgba(123, 97, 255, 0.12)', color: '#7B61FF' }}>
                  <Briefcase size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.785rem', color: '#475569', fontWeight: 600 }}>Working on Task</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                    {metrics.workingCount} <span style={{ fontSize: '0.8rem', color: '#7B61FF' }}>({getPct(metrics.workingCount, metrics.totalEmployees)}%)</span>
                  </div>
                </div>
              </div>

              {/* On Break (Amber) */}
              <div style={{
                background: '#FFFFFF',
                borderLeft: '4px solid #F59E0B',
                borderTop: '1px solid #E2E8F0',
                borderRight: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
              }}>
                <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
                  <Coffee size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.785rem', color: '#475569', fontWeight: 600 }}>On Break</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                    {metrics.onBreakCount} <span style={{ fontSize: '0.8rem', color: '#F59E0B' }}>({getPct(metrics.onBreakCount, metrics.totalEmployees)}%)</span>
                  </div>
                </div>
              </div>

              {/* In Support Call (Teal) */}
              <div style={{
                background: '#FFFFFF',
                borderLeft: '4px solid #00C2A8',
                borderTop: '1px solid #E2E8F0',
                borderRight: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
              }}>
                <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: 'rgba(0, 194, 168, 0.12)', color: '#00C2A8' }}>
                  <PhoneCall size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.785rem', color: '#475569', fontWeight: 600 }}>In Support Call</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                    {metrics.inSupportCount} <span style={{ fontSize: '0.8rem', color: '#00C2A8' }}>({getPct(metrics.inSupportCount, metrics.totalEmployees)}%)</span>
                  </div>
                </div>
              </div>

              {/* Offline (Slate) */}
              <div style={{
                background: '#FFFFFF',
                borderLeft: '4px solid #64748B',
                borderTop: '1px solid #E2E8F0',
                borderRight: '1px solid #E2E8F0',
                borderBottom: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
              }}>
                <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: 'rgba(100, 116, 139, 0.12)', color: '#64748B' }}>
                  <UserX size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.785rem', color: '#475569', fontWeight: 600 }}>Offline / Absent</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                    {metrics.offlineCount} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({getPct(metrics.offlineCount, metrics.totalEmployees)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. REAL-TIME ACTIVITY STREAM & TELEMETRY FEED (SOLID WHITE FLOATING CARD) */}
          {/* ========================================================================= */}
          <div className="ui-card" style={{
            padding: '1.5rem',
            background: '#FFFFFF',
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.12)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} style={{ color: '#7B61FF' }} />
                  <span>Real-Time Activity Stream & Telemetry Feed</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                  Chronological event stream of task executions, break logs, and support activities
                </p>
              </div>

              <span style={{ fontSize: '0.785rem', color: '#64748B', fontWeight: 700 }}>
                {metrics.recentActivities.length} recent events
              </span>
            </div>

            {metrics.recentActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                No telemetry activity logged today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {metrics.recentActivities.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '0.85rem 1.1rem',
                      gap: '1rem',
                      transition: 'all 0.2s ease',
                      flexWrap: 'wrap',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
                    }}
                  >
                    {/* Left: Employee Avatar & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '220px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #7B61FF 0%, #6C5CE7 100%)',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(123, 97, 255, 0.2)'
                      }}>
                        E{a.employeeId}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                          Employee #{a.employeeId}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          Ref Table: <span style={{ color: '#334155', fontWeight: 600 }}>{a.refTable} #{a.refId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Activity Badge & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.785rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        borderRadius: '9999px',
                        backgroundColor:
                          a.activityType === 'Task' ? 'rgba(123, 97, 255, 0.1)' :
                          a.activityType === 'Break' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 194, 168, 0.1)',
                        color:
                          a.activityType === 'Task' ? '#7B61FF' :
                          a.activityType === 'Break' ? '#F59E0B' : '#00C2A8',
                        border:
                          a.activityType === 'Task' ? '1px solid rgba(123, 97, 255, 0.3)' :
                          a.activityType === 'Break' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(0, 194, 168, 0.3)'
                      }}>
                        {a.activityType === 'Task' && '💻 Task'}
                        {a.activityType === 'Break' && '☕ Break'}
                        {a.activityType === 'Support' && '📞 Support'}
                        {!['Task', 'Break', 'Support'].includes(a.activityType) && a.activityType}
                      </span>

                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: a.status === 'Running' || a.status === 'Active' ? '#00C2A8' : '#475569',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px'
                      }}>
                        {a.status}
                      </span>
                    </div>

                    {/* Right: IST Time & Duration */}
                    <div style={{ textAlign: 'right', minWidth: '160px' }}>
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#7B61FF' }}>
                        🕒 {formatTimeIST(a.startTime)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.1rem' }}>
                        {getRelativeTime(a.startTime)} • {a.duration || 'In Progress...'}
                      </div>
                    </div>

                    {/* Remarks/Outcome */}
                    {a.remarks && (
                      <div style={{
                        width: '100%',
                        fontSize: '0.8rem',
                        color: '#334155',
                        background: '#FFFFFF',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        borderLeft: '3px solid #7B61FF',
                        borderTop: '1px solid #E2E8F0',
                        borderRight: '1px solid #E2E8F0',
                        borderBottom: '1px solid #E2E8F0',
                        marginTop: '0.25rem'
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
