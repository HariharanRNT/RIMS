import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, CalendarDays, CreditCard, Play, Clock, CheckCircle2, Coffee, Activity, PhoneCall, Briefcase, Calendar } from 'lucide-react';
import { formatTimeIST, formatDurationToHoursMinutes } from '../../utils/dateUtils';

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

export const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId || 0;
  const navigate = useNavigate();

  // Compute Yesterday's date string (default for historical report)
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [metrics, setMetrics] = useState<EmployeeMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Historical Daily Report State (Starts from Yesterday)
  const [selectedHistDate, setSelectedHistDate] = useState<string>(getYesterdayStr());
  const [histDetail, setHistDetail] = useState<EmployeeDailyDetail | null>(null);
  const [histLoading, setHistLoading] = useState(true);
  const [histTab, setHistTab] = useState<'tasks' | 'breaks' | 'support' | 'idles' | 'timeline'>('tasks');

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
      const res = await apiClient.get(`/reports/daily-detail/${employeeId}?date=${selectedHistDate}`);
      if (res.data.success) {
        setHistDetail(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch historical daily detail:', err);
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
    if (employeeId && selectedHistDate) {
      fetchHistDetail();
    }
  }, [employeeId, selectedHistDate]);

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
                {metrics.hasGraceViolationToday ? (
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
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Logout-login gaps</span>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select date:</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8125rem' }}
                  value={selectedHistDate}
                  onChange={(e) => setSelectedHistDate(e.target.value)}
                />
              </div>
            </div>

            {histLoading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading activity breakdown for {selectedHistDate}...
              </div>
            ) : !histDetail ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger-text)' }}>
                No performance data recorded for {selectedHistDate}.
              </div>
            ) : (
              <>
                {/* Historical Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Login / logout (IST)</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success-text)' }}>
                      In: {formatTimeIST(histDetail.loginTime)}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      Out: {formatTimeIST(histDetail.logoutTime)}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Productive time</span>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--success-text)' }}>
                      {formatDurationToHoursMinutes(histDetail.productiveHours)}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Break time</span>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--warning-text)' }}>
                      {formatDurationToHoursMinutes(histDetail.breakHours)}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Idle time</span>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                      {formatDurationToHoursMinutes(histDetail.idleHours || 0)}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Non-productive time</span>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--warning-text)' }}>
                      {formatDurationToHoursMinutes(histDetail.nonProductiveHours || (histDetail.breakHours + (histDetail.idleHours || 0)))}
                    </span>
                  </div>
                </div>

                {/* Historical Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className={`btn ${histTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setHistTab('tasks')}
                  >
                    <Briefcase size={15} />
                    <span>Work Tasks ({histDetail.tasks.length})</span>
                  </button>

                  <button
                    className={`btn ${histTab === 'breaks' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setHistTab('breaks')}
                  >
                    <Coffee size={15} />
                    <span>Breaks ({histDetail.breaks.length})</span>
                  </button>

                  <button
                    className={`btn ${histTab === 'support' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setHistTab('support')}
                  >
                    <PhoneCall size={15} />
                    <span>Support Calls ({histDetail.supportActivities.length})</span>
                  </button>

                  <button
                    className={`btn ${histTab === 'idles' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setHistTab('idles')}
                  >
                    <Clock size={15} />
                    <span>Idle Gaps ({(histDetail.idles || []).length})</span>
                  </button>

                  <button
                    className={`btn ${histTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setHistTab('timeline')}
                  >
                    <Activity size={15} />
                    <span>Full Activity Stream ({histDetail.timeline.length})</span>
                  </button>
                </div>

                {/* Sub Tab 3.5: Idle Gaps */}
                {histTab === 'idles' && (
                  <div className="table-container" style={{ padding: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Gap Type</th>
                          <th>Time Slot (Logout ➔ Login IST)</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!histDetail.idles || histDetail.idles.length === 0) ? (
                          <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>No logout-login idle gaps logged on {selectedHistDate}.</td></tr>
                        ) : (
                          histDetail.idles.map((idle, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>⏸️ {idle.type || 'Logout-Login Gap'}</td>
                              <td>{formatTimeIST(idle.startTime)} ➔ {formatTimeIST(idle.endTime)}</td>
                              <td style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{idle.duration}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub Tab 1: Tasks & Work Sessions */}
                {histTab === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {histDetail.tasks.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        No work tasks recorded on {selectedHistDate}.
                      </p>
                    ) : (
                      histDetail.tasks.map((task) => (
                        <div key={task.taskId} style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-primary)' }}>{task.moduleName}</h4>
                              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {task.description}
                              </p>
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
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                              Session Timestamps (Start ➔ End IST):
                            </span>
                            {task.sessions.map((s, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.2rem 0', borderBottom: idx < task.sessions.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                                <span>
                                  🕒 {formatTimeIST(s.startTime)} ➔ {s.endTime ? formatTimeIST(s.endTime) : 'In Progress'}
                                </span>
                                <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                                  Duration: {s.duration}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sub Tab 2: Break Logs */}
                {histTab === 'breaks' && (
                  <div className="table-container" style={{ padding: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Break Type</th>
                          <th>Start Time (IST)</th>
                          <th>End Time (IST)</th>
                          <th>Duration</th>
                          <th>Held Task Module</th>
                        </tr>
                      </thead>
                      <tbody>
                        {histDetail.breaks.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No break logs on {selectedHistDate}.</td></tr>
                        ) : (
                          histDetail.breaks.map((b, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, color: 'var(--warning)' }}>☕ {b.breakTypeName}</td>
                              <td>{formatTimeIST(b.startTime)}</td>
                              <td>{formatTimeIST(b.endTime)}</td>
                              <td style={{ fontWeight: 700 }}>{b.duration}</td>
                              <td>{b.heldTaskModule || 'None'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub Tab 3: Support Calls */}
                {histTab === 'support' && (
                  <div className="table-container" style={{ padding: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th>Product</th>
                          <th>Client</th>
                          <th>Time Slot (IST)</th>
                          <th>Duration</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {histDetail.supportActivities.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No support activity logged on {selectedHistDate}.</td></tr>
                        ) : (
                          histDetail.supportActivities.map((s, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, color: 'var(--info)' }}>📞 {s.activityTypeName}</td>
                              <td>{s.productName || '--'}</td>
                              <td>{s.clientName || '--'}</td>
                              <td>{formatTimeIST(s.startTime)} - {formatTimeIST(s.endTime)}</td>
                              <td style={{ fontWeight: 700 }}>{s.duration}</td>
                              <td style={{ fontSize: '0.85rem' }}>{s.remarks || '--'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub Tab 4: Full Timeline Stream */}
                {histTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '0.5rem' }}>
                    {histDetail.timeline.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No activity stream recorded on {selectedHistDate}.</p>
                    ) : (
                      histDetail.timeline.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: '85px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', paddingTop: '0.2rem' }}>
                            {formatTimeIST(item.startTime)}
                          </div>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.activityType}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.duration || ''}</span>
                            </div>
                            {item.remarks && (
                              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {item.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
