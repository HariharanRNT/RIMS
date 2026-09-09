import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { CelebrationBanner } from '../../components/dashboard/CelebrationBanner';
import {
  AlertTriangle,
  AlertCircle,
  CalendarDays,
  CreditCard,
  Play,
  Clock,
  CheckCircle,
  Coffee,
  Calendar,
  Eye,
  Download,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { formatTimeIST, formatDurationToHoursMinutes } from '../../utils/dateUtils';
import { GlassDatePicker } from '../../components/ui/GlassDatePicker';
import { EmployeeDailyDetailModal } from '../admin/reports/EmployeeDailyDetailModal';

interface EmployeeMetrics {
  employeeId: number;
  employeeName: string;
  todayLoginTime?: string;
  todayLogoutTime?: string;
  todayProductiveHours: number;
  todayBreakHours: number;
  todayIdleHours?: number;
  todayNonProductiveHours?: number;
  hasGraceViolationToday: boolean;
  minutesLateToday: number;
  todayStatus?: string;
  isHalfDayToday?: boolean;
  activeTask?: {
    taskId: number;
    productName: string;
    clientCompanyName: string;
    moduleName: string;
    status: string;
  };
  todayActivities: {
    id: number;
    activityType: string;
    startTime: string;
    endTime?: string;
    status: string;
    remarks?: string;
    duration?: string;
  }[];
}

interface DailyItem {
  employeeId: number;
  attendanceLogId?: number | null;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  date?: string;
  loginTime: string | null;
  logoutTime: string | null;
  status: string;
  productiveHours: number;
  workTaskCount?: number;
  workTaskHours?: number;
  breakCount?: number;
  breakHours: number;
  callCount?: number;
  callHours?: number;
  idleHours?: number;
  tasksCompleted: number;
  minutesLate: number;
}

export const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId || 0;
  const navigate = useNavigate();

  // Compute Date strings for historical report
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [metrics, setMetrics] = useState<EmployeeMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Historical Daily Report State (Date Mode: Single Date vs Custom Range)
  const [histDateMode, setHistDateMode] = useState<'single' | 'range'>('single');
  const [histSingleDate, setHistSingleDate] = useState<string>(getYesterdayStr());
  const [histStartDate, setHistStartDate] = useState<string>(getYesterdayStr());
  const [histEndDate, setHistEndDate] = useState<string>(getTodayStr());

  const [dailyData, setDailyData] = useState<DailyItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  // Pagination State for Historical Performance Table
  const [histCurrentPage, setHistCurrentPage] = useState<number>(1);
  const [histPageSize, setHistPageSize] = useState<number>(10);

  // Popup Modal State
  const [modalEmployeeId, setModalEmployeeId] = useState<number | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'tasks' | 'breaks' | 'support' | 'idles' | 'timeline'>('tasks');
  const [modalDate, setModalDate] = useState<string>('');

  const openDetailModal = (tab: 'tasks' | 'breaks' | 'support' | 'idles' | 'timeline', targetDate: string) => {
    setModalEmployeeId(employeeId);
    setModalInitialTab(tab);
    setModalDate(targetDate);
  };

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      let url = `/reports/export-daily-production?`;
      if (histDateMode === 'single') {
        url += `date=${histSingleDate}`;
      } else {
        url += `startDate=${histStartDate}&endDate=${histEndDate}`;
      }

      const response = await apiClient.get(url, { responseType: 'blob' });

      const contentDisposition = response.headers['content-disposition'];
      let fileName = histDateMode === 'single'
        ? `Performance_Report_${histSingleDate}.xlsx`
        : `Performance_Report_${histStartDate}_to_${histEndDate}.xlsx`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert('Failed to export Excel report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const formatHoursToHM = (hoursVal: number | undefined | null) => {
    if (hoursVal === undefined || hoursVal === null || hoursVal <= 0 || isNaN(hoursVal)) return '00h 00m';
    const totalMinutes = Math.round(hoursVal * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  const fetchMetrics = async () => {
    try {
      const res = await apiClient.get(`/reports/employee-dashboard/${employeeId}`);
      if (res.data.success) {
        setMetrics(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchHistDetail = async () => {
    if (!employeeId) return;
    setHistLoading(true);
    try {
      let url = `/reports/daily-production?employeeId=${employeeId}&`;
      if (histDateMode === 'single') {
        url += `date=${histSingleDate}`;
      } else {
        url += `startDate=${histStartDate}&endDate=${histEndDate}`;
      }
      const res = await apiClient.get(url);
      if (res.data.success) {
        setDailyData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch historical daily production:', err);
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchMetrics();
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      fetchHistDetail();
    }
  }, [employeeId, histDateMode, histSingleDate, histStartDate, histEndDate]);

  // Listen for real-time activity changes (e.g. stopping/starting break, task, support)
  useEffect(() => {
    const handleActivityChanged = () => {
      if (employeeId) {
        fetchMetrics();
        fetchHistDetail();
      }
    };
    window.addEventListener('activity-changed', handleActivityChanged);
    return () => window.removeEventListener('activity-changed', handleActivityChanged);
  }, [employeeId, histDateMode, histSingleDate, histStartDate, histEndDate]);

  // Daily target goal calculation (Standard 8 hours)
  const DAILY_GOAL_HOURS = 8.0;
  const productiveHours = metrics?.todayProductiveHours || 0;
  const progressPercent = Math.min(Math.round((productiveHours / DAILY_GOAL_HOURS) * 100), 100);

  // SVG circular ring calculation (radius 38, circumference 238.76)
  const RING_RADIUS = 38;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const ringOffset = RING_CIRCUMFERENCE * (1 - Math.min(productiveHours / DAILY_GOAL_HOURS, 1));

  // Trend vs yesterday calculation
  const yesterdayItem = dailyData.find((d) => {
    const dStr = d.date ? d.date.split('T')[0] : '';
    return dStr === getYesterdayStr();
  });
  const yesterdayProductive = yesterdayItem?.productiveHours ?? 0;

  let trendLabel = '';
  let isPositiveTrend = true;
  if (yesterdayProductive > 0) {
    const diff = productiveHours - yesterdayProductive;
    const pct = Math.round((diff / yesterdayProductive) * 100);
    trendLabel = `${pct >= 0 ? '+' : ''}${pct}% vs yesterday`;
    isPositiveTrend = pct >= 0;
  } else if (productiveHours > 0) {
    trendLabel = `${progressPercent}% of 8h goal`;
    isPositiveTrend = progressPercent >= 40;
  } else {
    trendLabel = '0% of 8h goal';
    isPositiveTrend = true;
  }

  return (
    <div>
      {/* ─── Page Title Header ─────────────────────────────────────────── */}
      <div className="header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            Employee Workspace
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Welcome back, <strong style={{ color: 'var(--text-main)' }}>{user?.employeeName}</strong>! Here is your daily productivity summary and activity breakdown.
          </p>
        </div>
      </div>

      {/* 🎉 Today's Employee Celebrations Banner */}
      <CelebrationBanner />

      {loading ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)', borderRadius: '16px' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }} />
          <span>Loading workspace metrics...</span>
        </div>
      ) : !metrics ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--danger-text)', borderRadius: '16px' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 0.75rem auto', color: 'var(--danger)' }} />
          <h4 style={{ margin: '0 0 0.25rem 0' }}>Failed to load metrics</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Unable to connect to the performance service. Please refresh the page.</p>
        </div>
      ) : (
        <>
          {/* ─── 1. HERO METRIC & SECONDARY STATS SECTION ──────────────────── */}
          <div className="dashboard-hero-section">
            {/* HERO CARD: Productive Time */}
            <div className="hero-metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Sparkles size={13} />
                    <span>Core Metric</span>
                  </div>

                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginTop: '0.75rem' }}>
                    Productive Work Time
                  </span>

                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.2rem 0 0.4rem 0', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {formatDurationToHoursMinutes(metrics.todayProductiveHours)}
                  </h1>

                  {/* Trend Indicator comparing to yesterday / target */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '8px', background: isPositiveTrend ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: isPositiveTrend ? '#10B981' : '#EF4444', fontSize: '0.785rem', fontWeight: 700 }}>
                    {isPositiveTrend ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{trendLabel}</span>
                  </div>
                </div>

                {/* Circular Progress Indicator for 8h Goal */}
                <div style={{ position: 'relative', width: '92px', height: '92px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="92" height="92" viewBox="0 0 92 92" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
                    {/* Background Track */}
                    <circle
                      cx="46"
                      cy="46"
                      r={RING_RADIUS}
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="7"
                    />
                    {/* Active Progress Ring */}
                    <circle
                      cx="46"
                      cy="46"
                      r={RING_RADIUS}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="7"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={ringOffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                      {progressPercent}%
                    </span>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>
                      of 8h
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-soft)', paddingTop: '0.85rem', marginTop: '1rem', fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
                <span>Daily Target: <strong>8h 00m</strong></span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>Active Tasks & Support</span>
              </div>
            </div>

            {/* SECONDARY ROW: 4 Responsive Metric Cards */}
            <div className="secondary-metrics-grid">
              {/* 1. Login Time Card */}
              <div className="metric-card-modern">
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={20} style={{ color: '#3B82F6' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>Login Time</span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.15rem 0', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                    {metrics.todayLoginTime ? formatTimeIST(metrics.todayLoginTime) : 'Not Logged In'}
                  </h3>
                  {metrics.isHalfDayToday || metrics.todayStatus === 'HalfDay Attendance' ? (
                    <span style={{ fontSize: '0.7rem', color: '#F59E0B', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                      <AlertTriangle size={12} /> Half Day ({metrics.minutesLateToday}m)
                    </span>
                  ) : metrics.hasGraceViolationToday ? (
                    <span style={{ fontSize: '0.7rem', color: '#EF4444', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                      <AlertTriangle size={12} /> Late ({metrics.minutesLateToday}m)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle size={12} /> On time
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Break Time Card */}
              <div className="metric-card-modern">
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Coffee size={20} style={{ color: '#F59E0B' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>Break Time</span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.15rem 0', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                    {formatDurationToHoursMinutes(metrics.todayBreakHours)}
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                    Scheduled breaks & pauses
                  </span>
                </div>
              </div>

              {/* 3. Idle Time Card */}
              <div className="metric-card-modern">
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={20} style={{ color: '#EF4444' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>Idle Time</span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.15rem 0', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                    {formatDurationToHoursMinutes(metrics.todayIdleHours || 0)}
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                    Portal Inactivity gaps
                  </span>
                </div>
              </div>

              {/* 4. Non-Productive Time Card */}
              <div className="metric-card-modern">
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={20} style={{ color: '#EF4444' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>Non-Productive</span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.15rem 0', color: '#EF4444', whiteSpace: 'nowrap' }}>
                    {formatDurationToHoursMinutes(metrics.todayNonProductiveHours || (metrics.todayBreakHours + (metrics.todayIdleHours || 0)))}
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                    Total Break + Idle
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. QUICK SHORTCUTS ─────────────────────────────────────────── */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem' }}>
              Quick Navigation Shortcuts
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {/* Shortcut 1: Work Task Engine */}
              <div
                className="shortcut-card-modern"
                onClick={() => navigate('/work-task')}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Play size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.15rem 0' }}>Work Task Engine</h4>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>Start, pause, or complete tasks</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>

              {/* Shortcut 2: Leave Requests */}
              <div
                className="shortcut-card-modern"
                onClick={() => navigate('/leave')}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarDays size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.15rem 0' }}>Leave Requests</h4>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>Submit and track leave applications</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>

              {/* Shortcut 3: Monthly Payslips */}
              <div
                className="shortcut-card-modern"
                onClick={() => navigate('/payslip')}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.15rem 0' }}>Monthly Payslips</h4>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>View and download salary statements</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* ─── 3. HISTORICAL PERFORMANCE & ACTIVITY TIMELINE ─────────────── */}
          <div className="ui-card" style={{ padding: '1.5rem', marginBottom: '2.5rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.15rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-main)' }}>
                  <Calendar size={20} style={{ color: 'var(--primary)' }} />
                  <span>Daily performance & activity history</span>
                </h3>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Detailed workday timeline bar showing productive tasks, breaks, support, and idle gaps.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Date Mode
                  </label>
                  <div style={{ display: 'inline-flex', background: 'var(--panel-raised)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      className={`btn ${histDateMode === 'single' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
                      onClick={() => setHistDateMode('single')}
                    >
                      Single Date
                    </button>
                    <button
                      type="button"
                      className={`btn ${histDateMode === 'range' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
                      onClick={() => setHistDateMode('range')}
                    >
                      Custom Range
                    </button>
                  </div>
                </div>

                {histDateMode === 'single' ? (
                  <div style={{ width: '165px' }}>
                    <label style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                      Select Date
                    </label>
                    <GlassDatePicker
                      value={histSingleDate}
                      onChange={(d) => setHistSingleDate(d)}
                      maxDate={new Date()}
                      placeholder="Select date"
                    />
                  </div>
                ) : (
                  <>
                    <div style={{ width: '165px' }}>
                      <label style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Start Date
                      </label>
                      <GlassDatePicker
                        value={histStartDate}
                        onChange={(d) => setHistStartDate(d)}
                        maxDate={new Date()}
                        placeholder="Start date"
                      />
                    </div>
                    <div style={{ width: '165px' }}>
                      <label style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        End Date
                      </label>
                      <GlassDatePicker
                        value={histEndDate}
                        onChange={(d) => setHistEndDate(d)}
                        maxDate={new Date()}
                        placeholder="End date"
                      />
                    </div>
                  </>
                )}

                <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: exporting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={handleExportExcel}
                    disabled={exporting}
                  >
                    <Download size={15} />
                    <span>{exporting ? 'Exporting...' : 'Export to Excel'}</span>
                  </button>
                </div>
              </div>
            </div>

            {histLoading ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ width: '26px', height: '26px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }} />
                <span>Loading activity breakdown...</span>
              </div>
            ) : dailyData.length === 0 ? (
              /* Friendly Empty State (Requirement 7) */
              <div className="empty-state-container" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div className="empty-state-icon" style={{ margin: '0 auto 1rem auto' }}>
                  <Calendar size={24} />
                </div>
                <h4 className="empty-state-title">No activity records found</h4>
                <p className="empty-state-desc" style={{ margin: '0.25rem auto 1.25rem auto' }}>
                  There are no performance or attendance logs recorded for the selected date filter.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setHistDateMode('single');
                      setHistSingleDate(getTodayStr());
                    }}
                  >
                    View Today
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setHistDateMode('single');
                      setHistSingleDate(getYesterdayStr());
                    }}
                  >
                    View Yesterday
                  </button>
                </div>
              </div>
            ) : (() => {
              const totalItems = dailyData.length;
              const totalPages = Math.ceil(totalItems / histPageSize) || 1;
              const safeCurrentPage = Math.min(Math.max(histCurrentPage, 1), totalPages);
              const startIndex = (safeCurrentPage - 1) * histPageSize;
              const endIndex = startIndex + histPageSize;
              const paginatedDailyData = dailyData.slice(startIndex, endIndex);

              return (
                <div className="table-container" style={{ padding: 0, marginBottom: 0, background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0, width: '100%' }}>
                      <thead>
                        <tr>
                          <th className="table-sticky-col-date">DATE</th>
                          <th className="table-sticky-col-emp">EMPLOYEE</th>
                          <th style={{ minWidth: '140px' }}>LOGIN / LOGOUT</th>
                          <th style={{ minWidth: '120px' }}>STATUS</th>
                          <th style={{ minWidth: '320px' }}>DAY TIMELINE BREAKDOWN</th>
                          <th style={{ minWidth: '110px', textAlign: 'center' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDailyData.map((item, idx) => {
                          const itemDateStr = item.date ? item.date.split('T')[0] : (histDateMode === 'single' ? histSingleDate : histStartDate);

                          const taskHours = item.workTaskHours ?? item.productiveHours ?? 0;
                          const breakHours = item.breakHours ?? 0;
                          const callHours = item.callHours ?? 0;
                          const idleHours = item.idleHours ?? 0;
                          const totalWorkdayHours = taskHours + breakHours + callHours + idleHours;

                          const taskPct = totalWorkdayHours > 0 ? (taskHours / totalWorkdayHours) * 100 : 0;
                          const breakPct = totalWorkdayHours > 0 ? (breakHours / totalWorkdayHours) * 100 : 0;
                          const callPct = totalWorkdayHours > 0 ? (callHours / totalWorkdayHours) * 100 : 0;
                          const idlePct = totalWorkdayHours > 0 ? (idleHours / totalWorkdayHours) * 100 : 0;

                          return (
                            <tr key={`${item.employeeId}-${itemDateStr}-${idx}`}>
                              <td className="table-sticky-col-date" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                {itemDateStr}
                              </td>
                              <td className="table-sticky-col-emp">
                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.employeeName}</div>
                                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                                  {item.employeeCode} • {item.departmentName}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.825rem' }}>
                                  <span style={{ color: item.loginTime ? '#10B981' : 'var(--text-muted)', fontWeight: 600 }}>
                                    In: {formatTimeIST(item.loginTime)}
                                  </span>
                                  <br />
                                  <span style={{ color: item.logoutTime ? 'var(--text-muted)' : '#F59E0B' }}>
                                    Out: {formatTimeIST(item.logoutTime)}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${item.status === 'Normal' || item.status === 'Present (Logged Out)' ? 'badge-success' :
                                    item.status === 'Permission' ? 'badge-info' :
                                      item.status === 'Late' ? 'badge-warning' :
                                        item.status?.includes('Working') ? 'badge-success' : 'badge-secondary'
                                  }`}>
                                  {item.status}
                                </span>
                              </td>

                              {/* Proportional Stacked Day Timeline (Requirement 3) */}
                              <td>
                                <div className="timeline-stacked-bar-container">
                                  {totalWorkdayHours === 0 ? (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                      No recorded activity duration
                                    </div>
                                  ) : (
                                    <>
                                      {/* Horizontal Proportional Stacked Bar */}
                                      <div
                                        className="timeline-stacked-bar"
                                        title={`Day Total: ${formatHoursToHM(totalWorkdayHours)} | Tasks: ${formatHoursToHM(taskHours)} (${Math.round(taskPct)}%) | Breaks: ${formatHoursToHM(breakHours)} (${Math.round(breakPct)}%) | Calls: ${formatHoursToHM(callHours)} (${Math.round(callPct)}%) | Idle: ${formatHoursToHM(idleHours)} (${Math.round(idlePct)}%)`}
                                      >
                                        {taskPct > 0 && (
                                          <div
                                            className="timeline-segment"
                                            style={{ width: `${taskPct}%`, background: '#10B981' }}
                                            onClick={() => openDetailModal('tasks', itemDateStr)}
                                            title={`Tasks: ${formatHoursToHM(taskHours)} (${Math.round(taskPct)}%)`}
                                          />
                                        )}
                                        {breakPct > 0 && (
                                          <div
                                            className="timeline-segment"
                                            style={{ width: `${breakPct}%`, background: '#F59E0B' }}
                                            onClick={() => openDetailModal('breaks', itemDateStr)}
                                            title={`Breaks: ${formatHoursToHM(breakHours)} (${Math.round(breakPct)}%)`}
                                          />
                                        )}
                                        {callPct > 0 && (
                                          <div
                                            className="timeline-segment"
                                            style={{ width: `${callPct}%`, background: '#A855F7' }}
                                            onClick={() => openDetailModal('support', itemDateStr)}
                                            title={`Support/Calls: ${formatHoursToHM(callHours)} (${Math.round(callPct)}%)`}
                                          />
                                        )}
                                        {idlePct > 0 && (
                                          <div
                                            className="timeline-segment"
                                            style={{ width: `${idlePct}%`, background: '#EF4444' }}
                                            onClick={() => openDetailModal('idles', itemDateStr)}
                                            title={`Idle: ${formatHoursToHM(idleHours)} (${Math.round(idlePct)}%)`}
                                          />
                                        )}
                                      </div>

                                      {/* Mini Legend Row below the bar */}
                                      <div className="timeline-legend-row">
                                        <span
                                          className="timeline-legend-item"
                                          onClick={() => openDetailModal('tasks', itemDateStr)}
                                          title="Click to view work tasks"
                                        >
                                          <span className="timeline-dot" style={{ background: '#10B981' }} />
                                          <span>Tasks: <strong>{formatHoursToHM(taskHours)}</strong></span>
                                        </span>

                                        <span
                                          className="timeline-legend-item"
                                          onClick={() => openDetailModal('breaks', itemDateStr)}
                                          title="Click to view break logs"
                                        >
                                          <span className="timeline-dot" style={{ background: '#F59E0B' }} />
                                          <span>Break: <strong>{formatHoursToHM(breakHours)}</strong></span>
                                        </span>

                                        {callHours > 0 && (
                                          <span
                                            className="timeline-legend-item"
                                            onClick={() => openDetailModal('support', itemDateStr)}
                                            title="Click to view support activity"
                                          >
                                            <span className="timeline-dot" style={{ background: '#A855F7' }} />
                                            <span>Support: <strong>{formatHoursToHM(callHours)}</strong></span>
                                          </span>
                                        )}

                                        {idleHours > 0 && (
                                          <span
                                            className="timeline-legend-item"
                                            onClick={() => openDetailModal('idles', itemDateStr)}
                                            title="Click to view idle gaps"
                                          >
                                            <span className="timeline-dot" style={{ background: '#EF4444' }} />
                                            <span>Idle: <strong>{formatHoursToHM(idleHours)}</strong></span>
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.785rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}
                                  onClick={() => openDetailModal('tasks', itemDateStr)}
                                  title="View full session breakdown and timeline"
                                >
                                  <Eye size={14} />
                                  <span>Details</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {!histLoading && totalItems > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.85rem 1.25rem',
                      borderTop: '1px solid var(--border-color)',
                      background: 'var(--panel-raised)',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>Rows per page:</span>
                          <select
                            value={histPageSize}
                            onChange={(e) => {
                              setHistPageSize(Number(e.target.value));
                              setHistCurrentPage(1);
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--input)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              cursor: 'pointer'
                            }}
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>

                        <span>
                          Showing <strong>{startIndex + 1}</strong> - <strong>{Math.min(endIndex, totalItems)}</strong> of <strong>{totalItems}</strong> records
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          disabled={safeCurrentPage === 1}
                          onClick={() => setHistCurrentPage(1)}
                          title="First Page"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          disabled={safeCurrentPage === 1}
                          onClick={() => setHistCurrentPage(prev => Math.max(prev - 1, 1))}
                          title="Previous Page"
                        >
                          ‹ Previous
                        </button>

                        <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem', color: 'var(--text-main)' }}>
                          Page {safeCurrentPage} of {totalPages}
                        </span>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          disabled={safeCurrentPage >= totalPages}
                          onClick={() => setHistCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          title="Next Page"
                        >
                          Next ›
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          disabled={safeCurrentPage >= totalPages}
                          onClick={() => setHistCurrentPage(totalPages)}
                          title="Last Page"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Activity & Time Log Popup Modal */}
      {modalEmployeeId && (
        <EmployeeDailyDetailModal
          employeeId={modalEmployeeId}
          date={modalDate || (histDateMode === 'single' ? histSingleDate : undefined)}
          startDate={histDateMode === 'range' && !modalDate ? histStartDate : undefined}
          endDate={histDateMode === 'range' && !modalDate ? histEndDate : undefined}
          initialTab={modalInitialTab}
          onClose={() => setModalEmployeeId(null)}
        />
      )}
    </div>
  );
};
