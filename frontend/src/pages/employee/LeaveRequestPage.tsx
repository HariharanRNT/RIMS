import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Send, AlertCircle, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassDatePicker } from '../../components/ui/GlassDatePicker';

interface LeaveType {
  id: number;
  name: string;
}

interface LeaveRequestItem {
  id: number;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  leaveDuration?: number; // 1 = FullDay, 2 = HalfDay
  halfDayType?: number;   // 1 = FirstHalf, 2 = SecondHalf
  leaveDays?: number;
  reason: string;
  status: string;
  approverName?: string;
  createdAt: string;
}

export const LeaveRequestPage: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId || 0;

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [history, setHistory] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [leaveTypeId, setLeaveTypeId] = useState<number | ''>('');
  const [leaveDuration, setLeaveDuration] = useState<number>(1); // 1 = Full Day, 2 = Half Day
  const [halfDayType, setHalfDayType] = useState<number | ''>(1);  // 1 = First Half, 2 = Second Half
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [typeRes, histRes] = await Promise.all([
        apiClient.get('/leave-types'),
        apiClient.get(`/leaves/my-requests/${employeeId}`),
      ]);
      if (typeRes.data.success) {
        setLeaveTypes(typeRes.data.data);
        if (typeRes.data.data.length > 0 && !leaveTypeId) {
          setLeaveTypeId(typeRes.data.data[0].id);
        }
      }
      if (histRes.data.success) setHistory(histRes.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) fetchData();
  }, [employeeId]);

  // Calculate dynamic duration in days
  const calculatedDuration = React.useMemo(() => {
    if (leaveDuration === 2) return 0.5;
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [fromDate, toDate, leaveDuration]);

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveToDate = leaveDuration === 2 ? fromDate : toDate;
    if (!leaveTypeId || !fromDate || !effectiveToDate || !reason) return;
    if (leaveDuration === 2 && !halfDayType) {
      setError('Please select Half-Day Type (First Half or Second Half).');
      return;
    }

    if (fromDate < todayStr) {
      setError('Leave request cannot be backdated to past dates. Please select today or a future date.');
      return;
    }

    if (fromDate > effectiveToDate) {
      setError('To Date must be on or after From Date.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await apiClient.post('/leaves/submit', {
        leaveTypeId: Number(leaveTypeId),
        fromDate,
        toDate: effectiveToDate,
        leaveDuration: Number(leaveDuration),
        halfDayType: leaveDuration === 2 ? Number(halfDayType) : null,
        reason,
      });

      if (res.data.success) {
        setSuccess('Leave request submitted successfully for approval.');
        setLeaveTypeId(leaveTypes.length > 0 ? leaveTypes[0].id : '');
        setFromDate('');
        setToDate('');
        setLeaveDuration(1);
        setHalfDayType(1);
        setReason('');
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2>Leave Requests</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Submit formal leave applications for manager review and approval
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: 'var(--danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
        }}>
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Submission Form Card */}
      <div className="ui-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Submit New Leave Request</h3>

          {/* Dynamic Duration Badge */}
          {calculatedDuration > 0 && (
            <span className="badge badge-info" style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}>
              <Clock size={14} />
              Duration: <strong>{calculatedDuration} {calculatedDuration === 1 ? 'Day' : 'Days'}</strong>
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <GlassSelect
              label="Leave Type"
              required
              options={leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))}
              value={leaveTypeId}
              onChange={(val) => setLeaveTypeId(val ? Number(val) : '')}
              placeholder="Select Leave Type"
            />

            <GlassSelect
              label="Leave Duration"
              required
              options={[
                { value: 1, label: 'Full Day' },
                { value: 2, label: 'Half Day' },
              ]}
              value={leaveDuration}
              onChange={(val) => {
                const dur = Number(val);
                setLeaveDuration(dur);
                if (dur === 2 && fromDate) {
                  setToDate(fromDate);
                }
              }}
              placeholder="Select Duration"
            />

            {leaveDuration === 2 && (
              <GlassSelect
                label="Half-Day Type"
                required
                options={[
                  { value: 1, label: 'First Half (Morning Shift)' },
                  { value: 2, label: 'Second Half (Afternoon Shift)' },
                ]}
                value={halfDayType}
                onChange={(val) => setHalfDayType(val ? Number(val) : '')}
                placeholder="Select Half-Day Type"
              />
            )}

            <GlassDatePicker
              label="From Date"
              required
              value={fromDate}
              onChange={(val) => {
                setFromDate(val);
                if (leaveDuration === 2 || (toDate && val > toDate)) {
                  setToDate(val);
                }
              }}
              minDate={todayStr}
              placeholder="Select From Date"
            />

            {leaveDuration === 1 && (
              <GlassDatePicker
                label="To Date"
                required
                value={toDate}
                onChange={(val) => setToDate(val)}
                minDate={fromDate || todayStr}
                placeholder="Select To Date"
              />
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Reason for Leave (Max 500 chars) *</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for leave application..."
              maxLength={500}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!leaveTypeId || !fromDate || (leaveDuration === 1 && !toDate) || (leaveDuration === 2 && !halfDayType) || !reason || submitting}
          >
            <Send size={16} />
            <span>{submitting ? 'Submitting...' : 'Submit Leave Request'}</span>
          </button>
        </form>
      </div>

      {/* Recent Leave Requests Table */}
      <h3 style={{ marginBottom: '0.85rem', fontSize: '1rem' }}>Recent Leave Requests</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Leave Type</th>
              <th>From Date</th>
              <th>To Date</th>
              <th>Duration</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Approver</th>
              <th>Submitted On</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading leave history...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No leave requests submitted yet.</td></tr>
            ) : (
              history.map((l) => {
                const isHalf = l.leaveDuration === 2;
                const numDays = l.leaveDays ?? (isHalf ? 0.5 : 1);
                const halfTypeLabel = l.halfDayType === 1 ? 'First Half' : l.halfDayType === 2 ? 'Second Half' : 'Half Day';
                return (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>#{l.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{l.leaveTypeName}</td>
                    <td>{new Date(l.fromDate).toLocaleDateString()}</td>
                    <td>{new Date(l.toDate).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>
                      {isHalf ? (
                        <span className="badge badge-info" style={{ fontSize: '0.785rem' }}>
                          0.5 Day ({halfTypeLabel})
                        </span>
                      ) : (
                        <span>{numDays} {numDays === 1 ? 'day' : 'days'}</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '240px' }}>{l.reason}</td>
                    <td>
                      <span className={`badge ${
                        l.status === 'Approved' ? 'badge-success' :
                        l.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      {l.approverName ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <UserCheck size={14} style={{ color: 'var(--success)' }} />
                          {l.approverName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
