import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, CalendarDays, CreditCard, Play, Clock, CheckCircle2, Coffee, Activity, PhoneCall, Briefcase, Calendar } from 'lucide-react';
import { formatTimeIST } from '../../utils/dateUtils';

interface EmployeeMetrics {
  employeeId: number;
  employeeName: string;
  todayLoginTime?: string;
  todayLogoutTime?: string;
  todayProductiveHours: number;
  todayBreakHours: number;
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
  minutesLate: number;
  tasks: TaskDetail[];
  breaks: BreakDetail[];
  supportActivities: SupportDetail[];
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
  const [histTab, setHistTab] = useState<'tasks' | 'breaks' | 'support' | 'timeline'>('tasks');

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Login Time Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#EEF2FF', color: 'var(--primary)' }}>
                <Clock size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Login Time Today</span>
                <h3 style={{ fontSize: '1.15rem', marginTop: '0.1rem', color: 'var(--text-main)' }}>
                  {metrics.todayLoginTime ? formatTimeIST(metrics.todayLoginTime) : 'Not Logged In'}
                </h3>
                {metrics.hasGraceViolationToday ? (
                  <span style={{ fontSize: '0.725rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                    <AlertTriangle size={12} /> Late ({metrics.minutesLateToday}m)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.725rem', color: 'var(--success)', marginTop: '0.1rem' }}>On Time</span>
                )}
              </div>
            </div>

            {/* Productive Time Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#ECFDF5', color: 'var(--success)' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Today Productive Time</span>
                <h3 style={{ fontSize: '1.25rem', marginTop: '0.1rem', color: 'var(--text-main)' }}>
                  {metrics.todayProductiveHours} <span style={{ fontSize: '0.825rem', fontWeight: 500 }}>hrs</span>
                </h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Tasks & Support</span>
              </div>
            </div>

            {/* Break Time Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FFFBEB', color: 'var(--warning)' }}>
                <Coffee size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Today Break Time</span>
                <h3 style={{ fontSize: '1.25rem', marginTop: '0.1rem', color: 'var(--text-main)' }}>
                  {metrics.todayBreakHours} <span style={{ fontSize: '0.825rem', fontWeight: 500 }}>hrs</span>
                </h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Non-productive time</span>
              </div>
            </div>

            {/* Current Status Card */}
            <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#EFF6FF', color: 'var(--info)' }}>
                <Activity size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Current Status</span>
                <h3 style={{ fontSize: '1.15rem', marginTop: '0.1rem', color: 'var(--text-main)' }}>
                  {metrics.activeTask ? metrics.activeTask.status : 'Idle'}
                </h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                  {metrics.activeTask ? metrics.activeTask.moduleName : 'No Active Task'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <h3 style={{ marginBottom: '0.85rem', fontSize: '1rem' }}>Quick Shortcuts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div
              className="ui-card"
              onClick={() => navigate('/work-task')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#EEF2FF', color: 'var(--primary)' }}>
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
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FFFBEB', color: 'var(--warning)' }}>
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
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#ECFDF5', color: 'var(--success)' }}>
                <CreditCard size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem' }}>Monthly Payslips</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>View and print salary statements</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* NEW SECTION: HISTORICAL DAILY PERFORMANCE & TIME BREAKDOWN */}
          {/* ========================================================================= */}
          <div className="glass-card" style={{ marginTop: '2rem', padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
                  <span>Daily Performance & Activity History</span>
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Detailed breakdown of productive time, breaks, task sessions, and login timestamps. (Starts from previous day)
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Date:</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.875rem' }}
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
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
                No performance data recorded for {selectedHistDate}.
              </div>
            ) : (
              <>
                {/* Historical Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Login / Logout (IST)</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)' }}>
                      In: {formatTimeIST(histDetail.loginTime)}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Out: {formatTimeIST(histDetail.logoutTime)}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Productive Time</span>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--success)' }}>
                      {histDetail.productiveHours} hrs
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Break Time (Non-Productive)</span>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--warning)' }}>
                      {histDetail.breakHours} hrs
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Late Login Status</span>
                    {histDetail.minutesLate > 0 ? (
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--danger)' }}>
                        {histDetail.minutesLate} Mins Late
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--success)' }}>
                        On Time
                      </span>
                    )}
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
                    <span>Work Tasks & Sessions ({histDetail.tasks.length})</span>
                  </button>

                  <button
                    className={`btn ${histTab === 'breaks' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setHistTab('breaks')}
                  >
                    <Coffee size={15} />
                    <span>Break Logs ({histDetail.breaks.length})</span>
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
                    className={`btn ${histTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setHistTab('timeline')}
                  >
                    <Clock size={15} />
                    <span>Full Activity Stream ({histDetail.timeline.length})</span>
                  </button>
                </div>

                {/* Sub Tab 1: Tasks & Work Sessions */}
                {histTab === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {histDetail.tasks.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        No work tasks recorded on {selectedHistDate}.
                      </p>
                    ) : (
                      histDetail.tasks.map((task) => (
                        <div key={task.taskId} style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)' }}>
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
                            <span><strong>Total Worked:</strong> {task.totalTaskHours} hrs</span>
                          </div>

                          {/* Sessions List */}
                          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px' }}>
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
                          <div style={{ flex: 1, background: 'var(--bg-primary)', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
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
