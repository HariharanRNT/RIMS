import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { AlertTriangle, Eye, X } from 'lucide-react';
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

interface AttendanceBreakdownItem {
  date: string;
  type: string;
  value: string;
  details: string;
  loginTime?: string | null;
  logoutTime?: string | null;
  leaveDaysCount: number;
  presentDaysCount: number;
  isLop: boolean;
  status: string;
}

interface AttendanceBreakdownSummary {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  year: number;
  month: number;
  monthName: string;
  lateLoginCount: number;
  absentCount: number;
  approvedLeaveCount: number;
  halfDayCount: number;
  sandwichLeaveCount: number;
  permissionCount: number;
  totalLeaveCount: number;
  monthlyAllowedLeave: number;
  leaveLopDays: number;
  lateLoginLopDays: number;
  totalLopDays: number;
  lopAmount: number;
  items: AttendanceBreakdownItem[];
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

  // Details Modal State
  const [selectedBreakdown, setSelectedBreakdown] = useState<AttendanceBreakdownSummary | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [breakdownFilter, setBreakdownFilter] = useState<'all' | 'actionable' | 'leaves'>('actionable');

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

  const handleViewDetails = async (employeeId: number, dateStr?: string) => {
    setIsBreakdownOpen(true);
    setBreakdownLoading(true);
    try {
      const targetDate = dateStr ? new Date(dateStr) : (attSingleDate ? new Date(attSingleDate) : now);
      const year = targetDate.getFullYear() || now.getFullYear();
      const month = (targetDate.getMonth() + 1) || (now.getMonth() + 1);
      const res = await apiClient.get(`/reports/employee-attendance-breakdown/${employeeId}?year=${year}&month=${month}`);
      if (res.data.success) {
        setSelectedBreakdown(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load employee attendance breakdown.');
    } finally {
      setBreakdownLoading(false);
    }
  };

  const closeBreakdownModal = () => {
    setIsBreakdownOpen(false);
    setSelectedBreakdown(null);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [attDateMode, attSingleDate, attStartDate, attEndDate, attEmployeeId]);

  const formatTime = (isoStr: string | null) => formatTimeIST(isoStr);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      const day = String(dt.getDate()).padStart(2, '0');
      const month = dt.toLocaleString('en-US', { month: 'short' });
      return `${day}-${month}-${dt.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

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

  const getFilteredBreakdownItems = () => {
    if (!selectedBreakdown) return [];
    if (breakdownFilter === 'all') return selectedBreakdown.items;
    if (breakdownFilter === 'leaves') {
      return selectedBreakdown.items.filter(i => i.type === 'Absent' || i.type === 'Approved Leave' || i.type === 'Half Day' || i.type === 'Sandwich Leave');
    }
    // 'actionable' / default: show all non-present, non-weekend days (Late, Absent, Leave, Half Day, Sandwich Leave, Permission, Holiday)
    return selectedBreakdown.items.filter(i => i.type !== 'Weekend' && (i.type !== 'Present' || i.status === 'Late' || i.isLop));
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
          <div style={{ display: 'inline-flex', background: 'var(--panel-raised)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              className={`btn ${attDateMode === 'single' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
              onClick={() => setAttDateMode('single')}
            >
              Single Date
            </button>
            <button
              type="button"
              className={`btn ${attDateMode === 'range' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
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
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            borderRadius: '6px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}
                          onClick={() => handleViewDetails(item.employeeId, itemDateStr)}
                          title="View complete attendance and leave breakdown"
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>

                        {item.attendanceLogId && item.isLate && !item.isPermission && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap'
                            }}
                            onClick={() => handleMarkPermission(item.attendanceLogId!)}
                          >
                            Mark as Permission
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Employee Attendance Details Modal */}
      {isBreakdownOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.25rem'
        }}>
          <div style={{
            background: 'var(--panel)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            maxWidth: '820px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--panel-raised)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.2rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Employee Attendance Details
                  </h3>
                  {selectedBreakdown && (
                    <span style={{
                      backgroundColor: 'var(--primary-tint)',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px'
                    }}>
                      {selectedBreakdown.monthName}
                    </span>
                  )}
                </div>
                {selectedBreakdown && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {selectedBreakdown.employeeName} • {selectedBreakdown.employeeCode} • {selectedBreakdown.departmentName}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={closeBreakdownModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
              {breakdownLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading attendance breakdown...
                </div>
              ) : selectedBreakdown ? (
                <>
                  {/* Summary Metric Cards Grid */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.75rem'
                    }}>
                      Monthly Summary
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.85rem'
                    }}>
                      {/* Late Login */}
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.35rem' }}>
                          Late Login
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning-text)' }}>
                          {selectedBreakdown.lateLoginCount}
                        </div>
                      </div>

                      {/* Absent */}
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.35rem' }}>
                          Absent
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger-text)' }}>
                          {selectedBreakdown.absentCount}
                        </div>
                      </div>

                      {/* Approved Leave */}
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--info)', marginBottom: '0.35rem' }}>
                          Approved Leave
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--info)' }}>
                          {selectedBreakdown.approvedLeaveCount}
                        </div>
                      </div>

                      {/* Half Day */}
                      <div style={{
                        background: 'rgba(249, 115, 22, 0.08)',
                        border: '1px solid rgba(249, 115, 22, 0.25)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#EA580C', marginBottom: '0.35rem' }}>
                          Half Day
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#C2410C' }}>
                          {selectedBreakdown.halfDayCount}
                        </div>
                      </div>

                      {/* Sandwich Leave */}
                      <div style={{
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9333EA', marginBottom: '0.35rem' }}>
                          Sandwich Leave
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7E22CE' }}>
                          {selectedBreakdown.sandwichLeaveCount || 0}
                        </div>
                      </div>

                      {/* Permission */}
                      <div style={{
                        background: 'rgba(13, 148, 136, 0.08)',
                        border: '1px solid rgba(13, 148, 136, 0.25)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0D9488', marginBottom: '0.35rem' }}>
                          Permission
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F766E' }}>
                          {selectedBreakdown.permissionCount}
                        </div>
                      </div>

                      {/* Late Login Leave */}
                      <div style={{
                        background: 'rgba(217, 119, 6, 0.08)',
                        border: '1px solid rgba(217, 119, 6, 0.25)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.35rem' }}>
                          Late Login Leave
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning-text)' }}>
                          {selectedBreakdown.lateLoginLopDays || 0}
                        </div>
                      </div>

                      {/* Allowed Leave */}
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.35rem' }}>
                          Allowed Leave
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success-text)' }}>
                          {selectedBreakdown.monthlyAllowedLeave || 0}
                        </div>
                      </div>

                      {/* Total Leave Count */}
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1.5px solid var(--warning)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-xs)'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.2rem' }}>
                          Total Leave Count
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--warning-text)', lineHeight: 1.1 }}>
                          {selectedBreakdown.totalLeaveCount}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.25rem', opacity: 0.9 }}>
                          (Inc. Late Login Leave)
                        </div>
                      </div>

                      {/* LOP */}
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1.5px solid var(--danger)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-xs)'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.35rem' }}>
                          LOP
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--danger-text)' }}>
                          {selectedBreakdown.totalLopDays} Days
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date-wise Details Section */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem'
                    }}>
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Date-wise Breakdown
                      </div>

                      <div style={{ display: 'inline-flex', background: 'var(--panel-raised)', padding: '0.15rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          className={`btn ${breakdownFilter === 'actionable' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          onClick={() => setBreakdownFilter('actionable')}
                        >
                          Key Events
                        </button>
                        <button
                          type="button"
                          className={`btn ${breakdownFilter === 'leaves' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          onClick={() => setBreakdownFilter('leaves')}
                        >
                          Leaves & Absences
                        </button>
                        <button
                          type="button"
                          className={`btn ${breakdownFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          onClick={() => setBreakdownFilter('all')}
                        >
                          All Dates
                        </button>
                      </div>
                    </div>

                    <div style={{
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}>
                      <table className="data-table" style={{ margin: 0 }}>
                        <thead style={{ background: 'var(--panel-raised)' }}>
                          <tr>
                            <th style={{ width: '130px' }}>Date</th>
                            <th style={{ width: '150px' }}>Type</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Value</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredBreakdownItems().length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                                No records matching selected filter.
                              </td>
                            </tr>
                          ) : (
                            getFilteredBreakdownItems().map((row, rIdx) => {
                              const badgeStyle =
                                row.type === 'Absent'
                                  ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
                                  : row.type === 'Approved Leave'
                                  ? { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)' }
                                  : row.type === 'Half Day'
                                  ? { backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#F97316', border: '1px solid rgba(249, 115, 22, 0.3)' }
                                  : row.type === 'Sandwich Leave'
                                  ? { backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', border: '1px solid rgba(168, 85, 247, 0.3)' }
                                  : row.type === 'Permission'
                                  ? { backgroundColor: 'rgba(20, 184, 166, 0.15)', color: '#14B8A6', border: '1px solid rgba(20, 184, 166, 0.3)' }
                                  : row.type === 'Late Login'
                                  ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }
                                  : row.type === 'Holiday'
                                  ? { backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', border: '1px solid rgba(168, 85, 247, 0.3)' }
                                  : row.type === 'Weekend'
                                  ? { backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#94A3B8', border: '1px solid rgba(100, 116, 139, 0.3)' }
                                  : { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' };

                              return (
                                <tr key={`breakdown-${row.date}-${rIdx}`}>
                                  <td style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                                    {formatDateDisplay(row.date)}
                                  </td>
                                  <td>
                                    <span
                                      className="badge"
                                      style={{
                                        ...badgeStyle,
                                        fontWeight: 700,
                                        fontSize: '0.775rem',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '6px'
                                      }}
                                    >
                                      {row.type}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                                    <span style={{
                                      color: row.value.startsWith('+') ? '#D97706' : (row.value === '1' || row.value.includes(':') ? 'var(--text-main)' : 'var(--text-secondary)')
                                    }}>
                                      {row.value}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {row.details}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.85rem 1.75rem',
              background: 'var(--panel-raised)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 600 }}
                onClick={closeBreakdownModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
            background: 'var(--panel)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header Banner */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem'
            }}>
              <div style={{
                background: 'var(--warning-bg)',
                color: 'var(--warning)',
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
                background: 'var(--panel-raised)',
                borderLeft: '4px solid var(--warning)',
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
              background: 'var(--panel-raised)',
              borderTop: '1px solid var(--border-soft)',
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
