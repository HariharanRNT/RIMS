import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { AlertTriangle } from 'lucide-react';
import { formatTimeIST } from '../../../utils/dateUtils';

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
  permissionCount?: number;
  lateCount?: number;
  leaveCount?: number;
  lopDays?: number;
  isLate?: boolean;
  isPermission?: boolean;
}

interface EmployeeOption {
  id: number;
  name: string;
  employeeCode: string;
  departmentName?: string;
}

interface WarningModalState {
  isOpen: boolean;
  attendanceId: number | null;
  message: string;
}

export const AttendancePermissionsPage: React.FC = () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Filters for Attendance & Permissions
  const [attDateMode, setAttDateMode] = useState<'single' | 'range'>('single');
  const [attSingleDate, setAttSingleDate] = useState<string>(todayStr);
  const [attStartDate, setAttStartDate] = useState<string>(todayStr);
  const [attEndDate, setAttEndDate] = useState<string>(todayStr);
  const [attEmployeeId, setAttEmployeeId] = useState<number | ''>('');

  // Custom Warning Modal State
  const [warningModal, setWarningModal] = useState<WarningModalState>({
    isOpen: false,
    attendanceId: null,
    message: ''
  });

  // Data States
  const [attendanceData, setAttendanceData] = useState<DailyItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/employees?pageSize=1000');
      if (res.data.success) {
        const items = res.data.data.items || res.data.data;
        setEmployees(items.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          employeeCode: emp.employeeCode,
          departmentName: emp.departmentName
        })));
      }
    } catch {
      // Ignore
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let url = `/reports/attendance-permissions?`;
      if (attDateMode === 'single') {
        url += `date=${attSingleDate}`;
      } else {
        url += `startDate=${attStartDate}&endDate=${attEndDate}`;
      }
      if (attEmployeeId) url += `&employeeId=${attEmployeeId}`;
      const res = await apiClient.get(url);
      if (res.data.success) setAttendanceData(res.data.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [attDateMode, attSingleDate, attStartDate, attEndDate, attEmployeeId]);

  const formatTime = (isoStr: string | null) => formatTimeIST(isoStr);

  const handleMarkPermission = async (attendanceId: number, force: boolean = false) => {
    try {
      const url = `/attendance/${attendanceId}/mark-permission${force ? '?force=true' : ''}`;
      const res = await apiClient.post(url);
      if (res.data.success) {
        const payload = res.data.data;
        if (payload?.warningNeeded && !force) {
          setWarningModal({
            isOpen: true,
            attendanceId,
            message: payload.warningMessage || 'This employee has already taken their monthly allowed permission limit. Do you still want to mark an extra permission for this day?'
          });
          return;
        }
        fetchAttendance();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark permission.');
    }
  };

  const confirmForcePermission = async () => {
    if (warningModal.attendanceId) {
      const id = warningModal.attendanceId;
      setWarningModal({ isOpen: false, attendanceId: null, message: '' });
      await handleMarkPermission(id, true);
    }
  };

  const closeWarningModal = () => {
    setWarningModal({ isOpen: false, attendanceId: null, message: '' });
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2>Attendance & Permissions Queue</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Overview of employee login status, lateness count, LOP calculations, and permission marking actions
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Date Mode</label>
          <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className={`btn ${attDateMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', border: 'none' }}
              onClick={() => setAttDateMode('single')}
            >
              Single Date
            </button>
            <button
              type="button"
              className={`btn ${attDateMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', border: 'none' }}
              onClick={() => setAttDateMode('range')}
            >
              Custom Range
            </button>
          </div>
        </div>

        {attDateMode === 'single' ? (
          <div style={{ minWidth: '180px' }}>
            <label className="form-label">Select Date</label>
            <input
              type="date"
              className="form-input"
              value={attSingleDate}
              onChange={(e) => setAttSingleDate(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div style={{ minWidth: '170px' }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={attStartDate}
                onChange={(e) => setAttStartDate(e.target.value)}
              />
            </div>
            <div style={{ minWidth: '170px' }}>
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={attEndDate}
                onChange={(e) => setAttEndDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div style={{ minWidth: '220px' }}>
          <label className="form-label">Employee Filter</label>
          <select
            className="form-select"
            value={attEmployeeId}
            onChange={(e) => setAttEmployeeId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance & Permissions Table */}
      <div className="glass-card table-container" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              {attDateMode === 'range' && <th>Date</th>}
              <th>Employee</th>
              <th>Login / Logout</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Permission</th>
              <th style={{ textAlign: 'center' }}>Late Count</th>
              <th style={{ textAlign: 'center' }}>Leave Count</th>
              <th>LOP</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={attDateMode === 'range' ? 9 : 8} style={{ textAlign: 'center', padding: '2rem' }}>Loading attendance & permissions report...</td></tr>
            ) : attendanceData.length === 0 ? (
              <tr><td colSpan={attDateMode === 'range' ? 9 : 8} style={{ textAlign: 'center', padding: '2rem' }}>No attendance records found.</td></tr>
            ) : (
              attendanceData.map((item, idx) => {
                const itemDateStr = item.date ? item.date.split('T')[0] : (attDateMode === 'single' ? attSingleDate : attStartDate);

                return (
                  <tr key={`${item.employeeId}-${itemDateStr}-${idx}`}>
                    {attDateMode === 'range' && (
                      <td style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                        {itemDateStr}
                      </td>
                    )}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.employeeName}</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                        {item.employeeCode} • {item.departmentName}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.825rem' }}>
                        <span style={{ color: item.loginTime ? 'var(--success)' : 'var(--text-muted)' }}>
                          In: {formatTime(item.loginTime)}
                        </span>
                        <br />
                        <span style={{ color: item.logoutTime ? 'var(--text-muted)' : 'var(--warning)' }}>
                          Out: {formatTime(item.logoutTime)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        item.status === 'Normal' || item.status === 'Present (Logged Out)' ? 'badge-success' :
                        item.status === 'Permission' ? 'badge-info' :
                        item.status === 'HalfDay Attendance' || item.status === 'Half Day' ? 'badge-warning' :
                        item.status === 'Late' ? 'badge-warning' : 'badge-secondary'
                      }`} style={
                        item.status === 'HalfDay Attendance' || item.status === 'Half Day'
                          ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }
                          : undefined
                      }>
                        {item.status === 'HalfDay Attendance' ? 'Half Day' : item.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 700, textAlign: 'center' }}>
                      <span style={{ color: (item.permissionCount ?? 0) > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {item.permissionCount ?? 0}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 700, textAlign: 'center' }}>
                      {item.lateCount ?? 0}
                    </td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 700, textAlign: 'center' }}>
                      <span style={{ color: (item.leaveCount ?? 0) > 0 ? '#D97706' : 'var(--text-muted)' }}>
                        {item.leaveCount ?? 0}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      {item.lopDays && item.lopDays > 0 ? (
                        <span style={{ color: 'var(--danger)' }}>{item.lopDays} Day</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.attendanceLogId && item.isLate && !item.isPermission ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => handleMarkPermission(item.attendanceLogId!)}
                        >
                          Mark Permission
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Unique Confirmation Modal for Permission Limit Warning */}
      {warningModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.08))',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem'
            }}>
              <div style={{
                background: '#FEF3C7',
                color: '#D97706',
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Permission Limit Warning
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Monthly allowance limit reached
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{
                fontSize: '0.9rem',
                lineHeight: '1.5',
                color: 'var(--text-main)',
                marginBottom: '1rem',
                fontWeight: 500
              }}>
                {warningModal.message}
              </p>

              <div style={{
                background: 'var(--bg-secondary, #F8FAFC)',
                borderLeft: '4px solid #F59E0B',
                borderRadius: '6px',
                padding: '0.85rem 1rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.4'
              }}>
                <strong>Note:</strong> Granting an extra permission converts this record to <em>Permission</em> status. Excess permissions beyond monthly allowance will be calculated in late LOP (2 late logins = 0.5 Day LOP).
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{
              padding: '1rem 1.5rem',
              background: 'var(--bg-secondary, #F8FAFC)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1.1rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  fontWeight: 600
                }}
                onClick={closeWarningModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)',
                  cursor: 'pointer'
                }}
                onClick={confirmForcePermission}
              >
                Yes, Grant Extra Permission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
