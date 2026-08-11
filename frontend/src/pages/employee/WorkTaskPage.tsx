import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  Play,
  Pause,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Coffee,
  Activity,
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  code: string;
}

interface Client {
  id: number;
  companyName: string;
}

interface ActiveTask {
  taskId: number;
  productId: number;
  productName: string;
  clientId: number;
  clientCompanyName: string;
  moduleName: string;
  description: string;
  status: string;
  startTime?: string;
  accumulatedSeconds: number;
}

interface TaskItem {
  id: number;
  productName: string;
  clientCompanyName: string;
  moduleName: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  duration?: string;
}

interface DemoFollowUpItem {
  id: number;
  productName: string;
  clientCompanyName: string;
  reviewRemarks: string;
  followUpDate: string;
  status: string;
  createdAt: string;
}

interface ProductClientMappingItem {
  id: number;
  productId: number;
  clientId: number;
  isActive?: boolean;
}

export const WorkTaskPage: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId || 0;

  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<ProductClientMappingItem[]>([]);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskItem[]>([]);
  const [demoFollowUps, setDemoFollowUps] = useState<DemoFollowUpItem[]>([]);

  // Summary Metrics State
  const [summaryWorkHours, setSummaryWorkHours] = useState(0);
  const [summaryBreakHours, setSummaryBreakHours] = useState(0);
  const [summaryActivitiesCount, setSummaryActivitiesCount] = useState(0);

  // Task creation form
  const [productId, setProductId] = useState<number | ''>('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Live timer counter
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [activeBreakName, setActiveBreakName] = useState<string | null>(null);
  const [activeSupportName, setActiveSupportName] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [prodRes, clientRes, activeRes, historyRes, breakRes, supportRes, followUpRes, mappingRes, metricsRes] = await Promise.all([
        apiClient.get('/products').catch(() => ({ data: { success: false } })),
        apiClient.get('/clients').catch(() => ({ data: { success: false } })),
        apiClient.get(`/tasks/active/${employeeId}`).catch(() => ({ data: { success: false } })),
        apiClient.get(`/tasks/history/${employeeId}`).catch(() => ({ data: { success: false } })),
        apiClient.get(`/breaks/active/${employeeId}`).catch(() => ({ data: { success: false } })),
        apiClient.get(`/support/active/${employeeId}`).catch(() => ({ data: { success: false } })),
        apiClient.get('/support/demo-followups/my-pending').catch(() => ({ data: { success: false } })),
        apiClient.get('/mappings').catch(() => ({ data: { success: false } })),
        apiClient.get(`/reports/employee-dashboard/${employeeId}`).catch(() => ({ data: { success: false } })),
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (clientRes.data.success) setClients(clientRes.data.data);
      if (activeRes.data.success) setActiveTask(activeRes.data.data);
      if (historyRes.data.success) setTaskHistory(historyRes.data.data);
      if (followUpRes.data.success) setDemoFollowUps(followUpRes.data.data);
      if (mappingRes.data.success) setMappings(mappingRes.data.data);
      if (metricsRes.data.success) {
        setSummaryWorkHours(metricsRes.data.data.todayProductiveHours || 0);
        setSummaryBreakHours(metricsRes.data.data.todayBreakHours || 0);
        setSummaryActivitiesCount(metricsRes.data.data.todayActivitiesCount ?? (metricsRes.data.data.todayActivities?.length || 0));
      }
      setActiveBreakName(breakRes.data?.data?.breakTypeName || null);
      setActiveSupportName(supportRes.data?.data?.activityTypeName || null);
    } catch {
      // Ignore
    }
  };

  const availableClients = React.useMemo(() => {
    if (!productId) return [];
    const mappedClientIds = mappings
      .filter((m) => m.productId === Number(productId) && m.isActive !== false)
      .map((m) => m.clientId);

    return clients.filter((c) => mappedClientIds.includes(c.id));
  }, [productId, clients, mappings]);

  const filteredTaskHistory = React.useMemo(() => {
    const isSameLocalDate = (dateStr?: string) => {
      if (!dateStr) return false;
      const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
      const d = new Date(str);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    };

    return taskHistory.filter((t) => {
      // Non-completed tasks (OnHold, Running, etc.) are displayed AT ALL TIMES, regardless of date
      if (t.status !== 'Completed') return true;

      // Completed tasks are displayed ONLY if completed on the current date (today)
      const dateToCheck = t.updatedAt || t.createdAt;
      return isSameLocalDate(dateToCheck);
    });
  }, [taskHistory]);

  const handleCompleteFollowUp = async (id: number) => {
    try {
      await apiClient.post(`/support/demo-followups/${id}/complete`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete follow-up.');
    }
  };

  useEffect(() => {
    if (employeeId > 0) {
      fetchData();
      window.addEventListener('activity-changed', fetchData);
      return () => {
        window.removeEventListener('activity-changed', fetchData);
      };
    }
  }, [employeeId]);

  const parseUtcMs = (dateStr: string) => {
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(str).getTime();
  };

  // Live timer calculation
  useEffect(() => {
    let interval: any = null;
    if (activeTask) {
      const baseSec = activeTask.accumulatedSeconds || 0;

      if (activeTask.status === 'Running' && activeTask.startTime) {
        const startMs = parseUtcMs(activeTask.startTime);
        const updateTimer = () => {
          const nowMs = Date.now();
          const currentSessionSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
          setElapsedSeconds(baseSec + currentSessionSec);
        };
        updateTimer();
        interval = setInterval(updateTimer, 1000);
      } else {
        setElapsedSeconds(baseSec);
      }
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeTask]);

  const handleStartTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !clientId || !moduleName || !description) return;

    setError('');
    setLoading(true);

    try {
      if (activeTask && activeTask.status === 'Running') {
        setToastMsg(`Task "${activeTask.moduleName}" was automatically placed on hold.`);
      }

      const res = await apiClient.post('/tasks/start', {
        productId: Number(productId),
        clientId: Number(clientId),
        moduleName,
        description,
      });

      if (res.data.success) {
        setModuleName('');
        setDescription('');
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start task.');
    } finally {
      setLoading(false);
    }
  };

  const handleHold = async () => {
    if (!activeTask) return;
    try {
      await apiClient.post(`/tasks/${activeTask.taskId}/hold`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to hold task');
    }
  };

  const handleResume = async () => {
    if (!activeTask) return;
    try {
      await apiClient.post(`/tasks/${activeTask.taskId}/resume`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume task');
    }
  };

  const handleComplete = async () => {
    if (!activeTask) return;
    try {
      await apiClient.post(`/tasks/${activeTask.taskId}/complete`);
      setActiveTask(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete task');
    }
  };

  const handleResumeById = async (taskId: number) => {
    try {
      await apiClient.post(`/tasks/${taskId}/resume`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume task');
    }
  };

  const handleHoldById = async (taskId: number) => {
    try {
      await apiClient.post(`/tasks/${taskId}/hold`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to hold task');
    }
  };


  const formatSeconds = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatWorkTime = (hours: number) => {
    const totalMins = Math.round(hours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  const formatBreakTime = (hours: number) => {
    const totalMins = Math.round(hours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      {/* Header Info */}
      <div className="header">
        <div>
          <h2>Work Task Engine</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Log productive work sessions and track real-time activity duration
          </p>
        </div>
      </div>

      {/* Alert Banners */}
      {toastMsg && (
        <div style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          color: 'var(--warning)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
        }}>
          <AlertCircle size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {activeBreakName && (
        <div style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          color: '#92400E',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}>
          <AlertCircle size={18} />
          <span>Task Paused: You are currently on <strong>{activeBreakName}</strong>. Click "Stop Break" in the bar above to resume task tracking.</span>
        </div>
      )}

      {activeSupportName && (
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          color: '#1E40AF',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}>
          <AlertCircle size={18} />
          <span>Task Paused: You are currently in Support Activity (<strong>{activeSupportName}</strong>). Complete the activity to resume work task.</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: 'var(--danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Pending Demo Follow-Up Reminders Widget */}
      {demoFollowUps.length > 0 && (
        <div className="ui-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1rem' }}>Pending Demo Follow-Up Reminders</h3>
          </div>

          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {demoFollowUps.map((item) => (
              <div key={item.id} style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className={`badge ${item.status === 'ReminderSent' ? 'badge-warning' : 'badge-info'}`}>
                      {item.status === 'ReminderSent' ? 'Reminder Sent' : 'Pending'}
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.productName}</strong>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>• {item.clientCompanyName}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', margin: '0.2rem 0' }}>
                    "{item.reviewRemarks}"
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Follow-Up Date: <strong style={{ color: 'var(--warning)' }}>{new Date(item.followUpDate).toLocaleDateString()}</strong>
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleCompleteFollowUp(item.id)}
                >
                  <Check size={14} />
                  <span>Mark Completed</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Task Card Widget */}
      {activeTask && (
        <div className="ui-card" style={{
          marginBottom: '1.5rem',
          borderLeft: `4px solid ${activeTask.status === 'Running' ? 'var(--success)' : 'var(--warning)'}`,
          backgroundColor: '#FFFFFF',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.4rem' }}>
                <span className={`badge ${activeTask.status === 'Running' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.825rem', padding: '0.3rem 0.65rem' }}>
                  {activeTask.status === 'Running' ? 'Running' : 'On Hold'}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Product: {activeTask.productName}
                </span>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  • Client: {activeTask.clientCompanyName}
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {activeTask.moduleName}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {activeTask.description}
              </p>
            </div>

            {/* Live Duration Timer & Task Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '1.85rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '0.02em',
                  color: activeTask.status === 'Running' ? 'var(--success)' : '#D97706',
                  lineHeight: 1.1,
                }}>
                  {formatSeconds(elapsedSeconds)}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Running Duration
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {activeTask.status === 'Running' ? (
                  <button className="btn btn-secondary" onClick={handleHold} style={{ color: '#D97706', borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
                    <Pause size={16} />
                    <span>Pause / Hold</span>
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={handleResume} style={{ color: 'var(--primary)', borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}>
                    <RotateCcw size={16} />
                    <span>Resume Task</span>
                  </button>
                )}

                <button className="btn btn-primary" onClick={handleComplete} style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
                  <CheckCircle2 size={16} />
                  <span>Complete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="ui-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#EEF2FF', color: 'var(--primary)' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Work Time</span>
            <h3 style={{ fontSize: '1.2rem', marginTop: '0.1rem', color: 'var(--text-main)', fontWeight: 700 }}>
              {formatWorkTime(summaryWorkHours)}
            </h3>
          </div>
        </div>

        <div className="ui-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#FFFBEB', color: 'var(--warning)' }}>
            <Coffee size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Break Time</span>
            <h3 style={{ fontSize: '1.2rem', marginTop: '0.1rem', color: 'var(--text-main)', fontWeight: 700 }}>
              {formatBreakTime(summaryBreakHours)}
            </h3>
          </div>
        </div>

        <div className="ui-card" style={{ padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#ECFDF5', color: 'var(--success)' }}>
            <Activity size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Activities</span>
            <h3 style={{ fontSize: '1.2rem', marginTop: '0.1rem', color: 'var(--text-main)', fontWeight: 700 }}>
              {summaryActivitiesCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Task Creation Form */}
      <div className="ui-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Start New Work Task</h3>

        <form onSubmit={handleStartTask}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <select
                className="form-select"
                value={productId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  setProductId(val);
                  setClientId('');
                }}
                required
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Client Name *</label>
              <select
                className="form-select"
                value={clientId}
                onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}
                required
                disabled={!productId}
              >
                <option value="">
                  {!productId
                    ? 'Select Product First'
                    : availableClients.length === 0
                    ? 'No Clients Mapped to Product'
                    : 'Select Client'}
                </option>
                {availableClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Module / Feature *</label>
              <input
                type="text"
                className="form-input"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="e.g. Employee Portal Redesign"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Task Description (Max 500 chars) *</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide clear details of work being performed..."
              maxLength={500}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!productId || !clientId || !moduleName || !description || loading}
          >
            <Play size={16} />
            <span>{loading ? 'Starting...' : 'Start Task'}</span>
          </button>
        </form>
      </div>

      {/* On-Hold Tasks Dedicated Quick-Resume Widget */}
      {taskHistory.filter(t => t.status === 'OnHold').length > 0 && (
        <div className="ui-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #F59E0B', backgroundColor: '#FFFBEB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <Pause size={18} style={{ color: '#F59E0B' }} />
            <h3 style={{ fontSize: '1rem', color: '#92400E', margin: 0 }}>
              Tasks Currently On Hold ({taskHistory.filter(t => t.status === 'OnHold').length})
            </h3>
          </div>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {taskHistory.filter(t => t.status === 'OnHold').map(t => (
              <div key={t.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #FDE68A',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="badge badge-warning">On Hold</span>
                    <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>#{t.id} - {t.productName}</strong>
                    <span style={{ fontSize: '0.825rem', color: '#64748B' }}>• Client: {t.clientCompanyName}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    Module: {t.moduleName}
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                    {t.description}
                  </p>
                </div>

                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleResumeById(t.id)}
                  style={{ backgroundColor: '#7B61FF', borderColor: '#7B61FF', color: '#FFFFFF' }}
                >
                  <RotateCcw size={14} />
                  <span>Resume This Task</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task History Table */}
      <h3 style={{ marginBottom: '0.85rem', fontSize: '1rem' }}>Task History</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Product</th>
              <th>Client</th>
              <th>Module</th>
              <th>Description</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTaskHistory.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No task history found for today.</td></tr>
            ) : (
              filteredTaskHistory.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>#{t.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.productName}</td>
                  <td>{t.clientCompanyName}</td>
                  <td>{t.moduleName}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '240px' }}>{t.description}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.duration || '--'}</td>
                  <td>
                    <span className={`badge ${
                      t.status === 'Completed' ? 'badge-success' :
                      t.status === 'Running' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {t.status === 'OnHold' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleResumeById(t.id)}
                        style={{ color: '#7B61FF', borderColor: '#7B61FF', fontWeight: 600, fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        <RotateCcw size={13} />
                        <span>Resume</span>
                      </button>
                    )}
                    {t.status === 'Running' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleHoldById(t.id)}
                        style={{ color: '#D97706', borderColor: '#F59E0B', fontWeight: 600, fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        <Pause size={13} />
                        <span>Hold</span>
                      </button>
                    )}
                    {t.status === 'Completed' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>✓ Completed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
