import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { CheckCircle2, XCircle, CalendarDays, Clock } from 'lucide-react';

interface PendingLeave {
  id: number;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  createdAt: string;
}

interface PendingPermission {
  id: number;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  requestDate: string;
  fromTime: string;
  toTime: string;
  reason: string;
  createdAt: string;
}

export const ApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'leaves' | 'permissions'>('leaves');
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<PendingPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const [leaveRes, permRes] = await Promise.all([
        apiClient.get('/leaves/pending-approvals'),
        apiClient.get('/permissions/pending-approvals'),
      ]);

      if (leaveRes.data.success) setPendingLeaves(leaveRes.data.data);
      if (permRes.data.success) setPendingPermissions(permRes.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApproveLeave = async (id: number) => {
    setActionId(id);
    try {
      await apiClient.post(`/leaves/${id}/approve`);
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve leave.');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectLeave = async (id: number) => {
    setActionId(id);
    try {
      await apiClient.post(`/leaves/${id}/reject`);
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject leave.');
    } finally {
      setActionId(null);
    }
  };

  const handleApprovePermission = async (id: number) => {
    setActionId(id);
    try {
      await apiClient.post(`/permissions/${id}/approve`);
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve permission.');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectPermission = async (id: number) => {
    setActionId(id);
    try {
      await apiClient.post(`/permissions/${id}/reject`);
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject permission.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2>Approval Queue</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Review pending leave and permission requests for your reportees & department
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('leaves')}
        >
          <CalendarDays size={16} />
          <span>Pending Leaves ({pendingLeaves.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'permissions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('permissions')}
        >
          <Clock size={16} />
          <span>Pending Permissions ({pendingPermissions.length})</span>
        </button>
      </div>

      {/* Leaves Queue */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {loading ? (
            <div className="glass-card">Loading approval queue...</div>
          ) : pendingLeaves.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
              <h3>All clear! No pending leave requests.</h3>
            </div>
          ) : (
            pendingLeaves.map((item) => (
              <div key={item.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{item.employeeName}</span>
                    <span className="badge badge-info">{item.employeeCode}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.departmentName}</span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{item.leaveTypeName}</span>: {' '}
                    {new Date(item.fromDate).toLocaleDateString()} to {new Date(item.toDate).toLocaleDateString()}
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    "{item.reason}"
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRejectLeave(item.id)}
                    disabled={actionId === item.id}
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    <XCircle size={16} />
                    <span>Reject</span>
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApproveLeave(item.id)}
                    disabled={actionId === item.id}
                    style={{ background: 'var(--success)' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Permissions Queue */}
      {activeTab === 'permissions' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {loading ? (
            <div className="glass-card">Loading approval queue...</div>
          ) : pendingPermissions.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
              <h3>All clear! No pending permission requests.</h3>
            </div>
          ) : (
            pendingPermissions.map((item) => (
              <div key={item.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{item.employeeName}</span>
                    <span className="badge badge-info">{item.employeeCode}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.departmentName}</span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Short Permission</span>: {' '}
                    {new Date(item.requestDate).toLocaleDateString()} ({item.fromTime} - {item.toTime})
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    "{item.reason}"
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRejectPermission(item.id)}
                    disabled={actionId === item.id}
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    <XCircle size={16} />
                    <span>Reject</span>
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApprovePermission(item.id)}
                    disabled={actionId === item.id}
                    style={{ background: 'var(--success)' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
