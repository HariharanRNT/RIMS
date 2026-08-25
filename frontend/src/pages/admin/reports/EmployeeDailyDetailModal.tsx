import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { X, Clock, Coffee, Briefcase, PhoneCall } from 'lucide-react';
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

  if (!employeeId) return null;

  const formatTime = (isoStr: string | null) => formatTimeIST(isoStr);

  const resolveHeldTaskModule = (b: BreakDetail) => {
    if (b.heldTaskModule && b.heldTaskModule !== 'None') {
      return b.heldTaskModule;
    }

    if (!detail || !detail.tasks || detail.tasks.length === 0) {
      return 'None';
    }

    const breakStartMs = new Date(b.startTime.endsWith('Z') ? b.startTime : b.startTime + 'Z').getTime();

    // 1. Find a task that has a session starting before or at the break start
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

    // 2. Fallback to the first task worked on that day
    return detail.tasks[0]?.moduleName || 'None';
  };

  const displayDateStr = startDate && endDate
    ? (startDate === endDate ? startDate : `${startDate} to ${endDate}`)
    : (date || '');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
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
          >
            <X size={20} />
          </button>
        </div>

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
            {/* Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Login / Logout</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)' }}>
                  In: {formatTime(detail.loginTime)}
                </span>
                <br />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Out: {formatTime(detail.logoutTime)}
                </span>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Productive Time</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>
                  {formatDurationToHoursMinutes(detail.productiveHours)}
                </span>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Break Time</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--warning)' }}>
                  {formatDurationToHoursMinutes(detail.breakHours)}
                </span>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Idle Time</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                  {formatDurationToHoursMinutes(detail.idleHours || 0)}
                </span>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Non-Productive Time</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--warning)' }}>
                  {formatDurationToHoursMinutes(detail.nonProductiveHours || (detail.breakHours + (detail.idleHours || 0)))}
                </span>
              </div>
            </div>

            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className={`btn ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setActiveTab('tasks')}
              >
                <Briefcase size={15} />
                <span>Work Tasks ({detail.tasks.length})</span>
              </button>

              <button
                className={`btn ${activeTab === 'breaks' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setActiveTab('breaks')}
              >
                <Coffee size={15} />
                <span>Breaks ({detail.breaks.length})</span>
              </button>

              <button
                className={`btn ${activeTab === 'support' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setActiveTab('support')}
              >
                <PhoneCall size={15} />
                <span>Support Calls ({detail.supportActivities.length})</span>
              </button>

              <button
                className={`btn ${activeTab === 'idles' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setActiveTab('idles')}
              >
                <Clock size={15} />
                <span>Idle Gaps ({(detail.idles || []).length})</span>
              </button>

              <button
                className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setActiveTab('timeline')}
              >
                <Clock size={15} />
                <span>Full Timeline ({detail.timeline.length})</span>
              </button>
            </div>

            {/* Sub Tab: Idle Gaps */}
            {activeTab === 'idles' && (
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
                    {(!detail.idles || detail.idles.length === 0) ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>No idle time logged on {date}.</td></tr>
                    ) : (
                      detail.idles.map((idle, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>⏸️ {idle.type || 'Logout-Login Gap'}</td>
                          <td>{formatTime(idle.startTime)} ➔ {formatTime(idle.endTime)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--warning)' }}>{formatDurationString(idle.duration)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 1: Tasks & Work Sessions */}
            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {detail.tasks.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    No work tasks recorded on this date.
                  </p>
                ) : (
                  detail.tasks.map((task) => (
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

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', gap: '1.5rem' }}>
                        <span><strong>Product:</strong> {task.productName || 'N/A'}</span>
                        <span><strong>Client:</strong> {task.clientName || 'N/A'}</span>
                        <span><strong>Total Worked:</strong> {formatDurationToHoursMinutes(task.totalTaskHours)}</span>
                      </div>

                      {/* Sessions List */}
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                          Work Time Sessions (Start ➔ End):
                        </span>
                        {(!task.sessions || task.sessions.length === 0) ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No work time sessions logged for this task.
                          </span>
                        ) : (
                          task.sessions.map((s, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.2rem 0', borderBottom: idx < task.sessions.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                              <span>
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
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Break Logs */}
            {activeTab === 'breaks' && (
              <div className="table-container" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Break Type</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Duration</th>
                      <th>Held Task Module</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.breaks.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No break logs on this date.</td></tr>
                    ) : (
                      detail.breaks.map((b, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: 'var(--warning)' }}>☕ {b.breakTypeName}</td>
                          <td>{formatTime(b.startTime)}</td>
                          <td>{formatTime(b.endTime)}</td>
                          <td style={{ fontWeight: 700 }}>{formatDurationString(b.duration)}</td>
                          <td>{resolveHeldTaskModule(b)}</td>
                        </tr>
                      ))
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

            {/* Tab 4: Full Timeline */}
            {activeTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '0.5rem' }}>
                {detail.timeline.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No timeline events recorded.</p>
                ) : (
                  detail.timeline.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: '75px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', paddingTop: '0.2rem' }}>
                        {formatTime(item.startTime)}
                      </div>
                      <div style={{ flex: 1, background: 'var(--bg-primary)', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.activityType}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDurationString(item.duration) || ''}</span>
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
    </div>
  );
};
