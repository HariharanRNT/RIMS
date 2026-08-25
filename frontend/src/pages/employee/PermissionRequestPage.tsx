import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Send, AlertCircle, CheckCircle, UserCheck } from 'lucide-react';
import { GlassDatePicker } from '../../components/ui/GlassDatePicker';
import { GlassTimePicker } from '../../components/ui/GlassTimePicker';

interface PermissionRequestItem {
  id: number;
  requestDate: string;
  fromTime: string;
  toTime: string;
  reason: string;
  status: string;
  approverName?: string;
  createdAt: string;
}

export const PermissionRequestPage: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId || 0;

  const [history, setHistory] = useState<PermissionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [requestDate, setRequestDate] = useState('');
  const [fromTime, setFromTime] = useState('09:00');
  const [toTime, setToTime] = useState('11:00');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const res = await apiClient.get(`/permissions/my-requests/${employeeId}`);
      if (res.data.success) setHistory(res.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) fetchData();
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDate || !fromTime || !toTime || !reason) return;

    if (fromTime >= toTime) {
      setError('From Time must be earlier than To Time.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await apiClient.post('/permissions/submit', {
        requestDate,
        fromTime,
        toTime,
        reason,
      });

      if (res.data.success) {
        setSuccess('Permission request submitted successfully for approval.');
        setRequestDate('');
        setFromTime('09:00');
        setToTime('11:00');
        setReason('');
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit permission request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div>
          <h2>Permission Requests</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Request short duration permissions during regular working hours
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

      {/* Form Card */}
      <div className="ui-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Submit Permission Request</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <GlassDatePicker
              label="Request Date"
              required
              value={requestDate}
              onChange={(val) => setRequestDate(val)}
              minDate={new Date().toISOString().split('T')[0]}
              placeholder="Select Date"
            />

            <GlassTimePicker
              label="From Time"
              required
              value={fromTime}
              onChange={(val) => setFromTime(val)}
              placeholder="Select From Time"
            />

            <GlassTimePicker
              label="To Time"
              required
              value={toTime}
              onChange={(val) => setToTime(val)}
              placeholder="Select To Time"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Reason for Permission (Max 500 chars) *</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State clear reason for permission..."
              maxLength={500}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!requestDate || !fromTime || !toTime || !reason || submitting}
          >
            <Send size={16} />
            <span>{submitting ? 'Submitting...' : 'Submit Permission Request'}</span>
          </button>
        </form>
      </div>

      {/* History Table */}
      <h3 style={{ marginBottom: '0.85rem', fontSize: '1rem' }}>Permission History</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Date</th>
              <th>Time Window</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Approver</th>
              <th>Submitted Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading permission history...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No permission requests submitted yet.</td></tr>
            ) : (
              history.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>#{p.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{new Date(p.requestDate).toLocaleDateString()}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.fromTime} - {p.toTime}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '240px' }}>{p.reason}</td>
                  <td>
                    <span className={`badge ${
                      p.status === 'Approved' ? 'badge-success' :
                      p.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.approverName ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <UserCheck size={14} style={{ color: 'var(--success)' }} />
                        {p.approverName}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
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
