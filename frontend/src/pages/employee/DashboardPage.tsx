import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { CelebrationBanner } from '../../components/dashboard/CelebrationBanner';
import { AlertTriangle, CalendarDays, CreditCard, Play, Clock, CheckCircle2, Coffee, PhoneCall, Briefcase, Calendar, Eye, Download } from 'lucide-react';
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

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div>
          <h2>Employee Workspace</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Welcome back, <strong>{user?.employeeName}</strong>! Here is your daily work summary and historical activity logs.
          </p>
        </div>
      </div>

      {/* 🎉 Today's Employee Celebrations Banner */}
      <CelebrationBanner />

      {loading ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          Loading workspace metrics...
        </div>
      ) : !metrics ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--danger)' }}>
          Failed to load workspace metrics.
        </div>
      ) : (
        <>
          {/* Today Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Login Time Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className="icon-badge icon-badge-primary">
                <Clock size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Login time today</span>
                <h3 style={{ fontSize: '1.05rem', marginTop: '0.1rem', color: 'var(--text-main)' }}>
                  {metrics.todayLoginTime ? formatTimeIST(metrics.todayLoginTime) : 'Not Logged In'}
                </h3>
                {metrics.isHalfDayToday || metrics.todayStatus === 'HalfDay Attendance' ? (
                  <span style={{ fontSize: '0.7rem', color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem', fontWeight: 600 }}>
                    <AlertTriangle size={12} /> Half Day (Late {metrics.minutesLateToday}m)
                  </span>
                ) : metrics.hasGraceViolationToday ? (
                  <span style={{ fontSize: '0.7rem', color: 'var(--danger-text)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem', fontWeight: 600 }}>
                    <AlertTriangle size={12} /> Late ({metrics.minutesLateToday}m)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--success-text)', fontWeight: 600, marginTop: '0.1rem' }}>On time</span>
                )}
              </div>
            </div>

            {/* Productive Time Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className="icon-badge icon-badge-success">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Productive time</span>
                <h3 style={{ fontSize: '1.15rem', marginTop: '0.1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {formatDurationToHoursMinutes(metrics.todayProductiveHours)}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tasks & support</span>
              </div>
            </div>

            {/* Break Time Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className="icon-badge icon-badge-warning">
                <Coffee size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Break time</span>
                <h3 style={{ fontSize: '1.15rem', marginTop: '0.1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {formatDurationToHoursMinutes(metrics.todayBreakHours)}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Break logs</span>
              </div>
            </div>

            {/* Idle Time Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className="icon-badge icon-badge-secondary">
                <Clock size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Idle time</span>
                <h3 style={{ fontSize: '1.15rem', marginTop: '0.1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {formatDurationToHoursMinutes(metrics.todayIdleHours || 0)}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Portal Idle Logs</span>
              </div>
            </div>

            {/* Non-Productive Time Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className="icon-badge icon-badge-warning">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Non-productive time</span>
                <h3 style={{ fontSize: '1.15rem', marginTop: '0.1rem', color: 'var(--warning-text)', fontWeight: 700 }}>
                  {formatDurationToHoursMinutes(metrics.todayNonProductiveHours || (metrics.todayBreakHours + (metrics.todayIdleHours || 0)))}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Break + Idle</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <h3 style={{ marginBottom: '0.85rem', fontSize: '1rem' }}>Quick shortcuts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div
              className="ui-card"
              onClick={() => navigate('/work-task')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div className="icon-badge icon-badge-primary">
                <Play size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem' }}>Work Task Engine</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Start, hold, or complete work tasks</p>
              </div>
            </div>

            <div
              className="ui-card"
              onClick={() => navigate('/leave')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div className="icon-badge icon-badge-warning">
                <CalendarDays size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem' }}>Leave Requests</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Submit and track leave applications</p>
              </div>
            </div>

            <div
              className="ui-card"
              onClick={() => navigate('/payslip')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div className="icon-badge icon-badge-success">
                <CreditCard size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem' }}>Monthly Payslips</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>View and print salary statements</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HISTORICAL DAILY PERFORMANCE & TIME BREAKDOWN */}
          {/* ========================================================================= */}
          <div className="ui-card" style={{ marginTop: '2rem', padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} style={{ color: 'var(--primary)' }} />
                  <span>Daily performance & activity history</span>
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Detailed breakdown of productive time, breaks, task sessions, and login timestamps.
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
                      gap: '0.4rem',
                      padding: '0.45rem 0.95rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: exporting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
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
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading activity breakdown...
              </div>
            ) : dailyData.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger-text)' }}>
                No performance data recorded for the selected date range.
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
                          <th style={{ minWidth: '130px' }}>LOGIN / LOGOUT</th>
                          <th style={{ minWidth: '120px' }}>STATUS</th>
                          <th style={{ minWidth: '280px' }}>ACTIVITY BREAKDOWN</th>
                          <th style={{ minWidth: '110px', textAlign: 'center' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDailyData.map((item, idx) => {
                          const itemDateStr = item.date ? item.date.split('T')[0] : (histDateMode === 'single' ? histSingleDate : histStartDate);

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
                                  <span style={{ color: item.loginTime ? 'var(--success)' : 'var(--text-muted)' }}>
                                    In: {formatTimeIST(item.loginTime)}
                                  </span>
                                  <br />
                                  <span style={{ color: item.logoutTime ? 'var(--text-muted)' : 'var(--warning)' }}>
                                    Out: {formatTimeIST(item.logoutTime)}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${
                                  item.status === 'Normal' || item.status === 'Present (Logged Out)' ? 'badge-success' :
                                  item.status === 'Permission' ? 'badge-info' :
                                  item.status === 'Late' ? 'badge-warning' :
                                  item.status?.includes('Working') ? 'badge-success' : 'badge-secondary'
                                }`}>
                                  {item.status}
                                </span>
                              </td>

                              {/* Activity Breakdown Column */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  {/* Work Tasks Chip */}
                                  <button
                                    type="button"
                                    className="activity-chip chip-task"
                                    onClick={() => openDetailModal('tasks', itemDateStr)}
                                    title={`Work Tasks: ${item.workTaskCount ?? 0} (${formatHoursToHM(item.workTaskHours)}) — Click to view log`}
                                  >
                                    <Briefcase size={13} />
                                    <span>{item.workTaskCount ?? 0}</span>
                                    <span className="chip-time">({formatHoursToHM(item.workTaskHours)})</span>
                                  </button>

                                  {/* Break Chip */}
                                  <button
                                    type="button"
                                    className="activity-chip chip-break"
                                    onClick={() => openDetailModal('breaks', itemDateStr)}
                                    title={`Breaks: ${item.breakCount ?? 0} (${formatHoursToHM(item.breakHours)}) — Click to view log`}
                                  >
                                    <Coffee size={13} />
                                    <span>{item.breakCount ?? 0}</span>
                                    <span className="chip-time">({formatHoursToHM(item.breakHours)})</span>
                                  </button>

                                  {/* Support / Call Chip */}
                                  <button
                                    type="button"
                                    className="activity-chip chip-call"
                                    onClick={() => openDetailModal('support', itemDateStr)}
                                    title={`Support Calls / Activities: ${item.callCount ?? 0} (${formatHoursToHM(item.callHours)}) — Click to view log`}
                                  >
                                    <PhoneCall size={13} />
                                    <span>{item.callCount ?? 0}</span>
                                    <span className="chip-time">({formatHoursToHM(item.callHours)})</span>
                                  </button>

                                  {/* Idle Time Chip (if idle time recorded) */}
                                  {(item.idleHours && item.idleHours > 0) ? (
                                    <button
                                      type="button"
                                      className="activity-chip chip-idle"
                                      onClick={() => openDetailModal('idles', itemDateStr)}
                                      title={`Idle Time: ${formatHoursToHM(item.idleHours)} — Click to view idle gaps`}
                                    >
                                      <Clock size={13} />
                                      <span className="chip-time">{formatHoursToHM(item.idleHours)}</span>
                                    </button>
                                  ) : null}
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderRadius: '6px' }}
                                  onClick={() => openDetailModal('tasks', itemDateStr)}
                                  title="View full session breakdown and timeline"
                                >
                                  <Eye size={13} />
                                  <span>View Details</span>
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
