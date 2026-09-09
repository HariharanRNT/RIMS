import React, { useEffect, useState, useMemo } from 'react';
import {
  Clock,
  Coffee,
  FileText,
  RefreshCw,
  Sun,
  UserCheck,
  UserX,
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarDays,
  Table as TableIcon,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  AlertTriangle,
  X,
  Briefcase,
} from 'lucide-react';
import {
  attendanceCalendarApi,
  AttendanceDayType,
} from '../../api/attendanceCalendarApi';
import type {
  EmployeeMonthlyAttendanceReportDto,
  EmployeeDailyAttendanceSummaryDto,
} from '../../api/attendanceCalendarApi';
import { formatTimeIST } from '../../utils/dateUtils';

const MONTH_OPTIONS = [
  { id: 1, name: 'January' },
  { id: 2, name: 'February' },
  { id: 3, name: 'March' },
  { id: 4, name: 'April' },
  { id: 5, name: 'May' },
  { id: 6, name: 'June' },
  { id: 7, name: 'July' },
  { id: 8, name: 'August' },
  { id: 9, name: 'September' },
  { id: 10, name: 'October' },
  { id: 11, name: 'November' },
  { id: 12, name: 'December' },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EmployeeCalendarPage: React.FC = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [report, setReport] = useState<EmployeeMonthlyAttendanceReportDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View Mode: 'table' or 'calendar'
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Selected Day for Detail Popover / Modal
  const [selectedDayDetail, setSelectedDayDetail] = useState<EmployeeDailyAttendanceSummaryDto | null>(null);

  const currentMonthName = MONTH_OPTIONS.find((m) => m.id === selectedMonth)?.name || 'Month';

  const loadAttendance = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await attendanceCalendarApi.getEmployeeMonthlyAttendanceReport(selectedYear, selectedMonth);
      setReport(data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load attendance calendar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedYear, selectedMonth]);

  // Status Badge Helper
  const getStatusBadge = (status: string, compact = false) => {
    switch (status) {
      case 'Present':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <UserCheck size={12} /> {compact ? 'Present' : 'Present'}
          </span>
        );
      case 'Late':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {compact ? 'Late' : 'Late Login'}
          </span>
        );
      case 'Permission':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {compact ? 'Perm' : 'Permission'}
          </span>
        );
      case 'Absent':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <UserX size={12} /> {compact ? 'Absent' : 'Absent'}
          </span>
        );
      case 'Leave':
        return (
          <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FileText size={12} /> {compact ? 'Leave' : 'Approved Leave'}
          </span>
        );
      case 'Sandwich Leave':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FileText size={12} /> {compact ? 'Sandwich' : 'Sandwich Leave'}
          </span>
        );
      case 'Holiday':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Sun size={12} /> {compact ? 'Holiday' : 'Holiday'}
          </span>
        );
      case 'Weekend':
        return (
          <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Coffee size={12} /> {compact ? 'Weekend' : 'Weekend'}
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  // Color mappings for Trend Strip and Calendar Grid
  const getStatusColor = (item: EmployeeDailyAttendanceSummaryDto) => {
    if (item.isLop || item.status === 'Absent') return 'var(--danger, #ef4444)';
    if (item.isSandwichLeave || item.status === 'Late' || item.status === 'Permission') return 'var(--warning, #f59e0b)';
    if (item.status === 'Present') return 'var(--success, #10b981)';
    if (item.isLeave || item.status === 'Leave') return 'var(--primary, #3b82f6)';
    if (item.holidayName || item.status === 'Holiday') return 'var(--violet, #8b5cf6)';
    if (item.status === 'Weekend' || item.dayType === AttendanceDayType.Weekend) return 'var(--text-muted, #64748b)';
    return 'var(--border, #475569)';
  };

  // Calendar Grid Calculation
  const calendarGridCells = useMemo(() => {
    if (!report || !report.dailySummaries || report.dailySummaries.length === 0) return [];

    // First day of month day-of-week (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDateObj = new Date(selectedYear, selectedMonth - 1, 1);
    const startDayOfWeek = firstDateObj.getDay();

    const cells: (EmployeeDailyAttendanceSummaryDto | null)[] = [];

    // Leading empty slots
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(null);
    }

    // Days of the month
    report.dailySummaries.forEach((day) => {
      cells.push(day);
    });

    // Trailing empty slots to make full weeks of 7
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [report, selectedYear, selectedMonth]);

  // Export to Excel (CSV with UTF-8 BOM)
  const handleExportCSV = () => {
    if (!report || !report.dailySummaries.length) return;

    const headers = [
      'Date',
      'Day',
      'Calendar Type',
      'Status',
      'Login Time (IST)',
      'Logout Time (IST)',
      'Leave Approved',
      'Sandwich Leave',
      'LOP Penalty',
      'LOP Reason / Notes',
    ];

    const rows = report.dailySummaries.map((item) => {
      const dateObj = new Date(item.date);
      const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const loginStr = item.loginTime ? formatTimeIST(item.loginTime) : '—';
      const logoutStr = item.logoutTime ? formatTimeIST(item.logoutTime) : '—';
      const leaveStr = item.isLeave ? 'Yes' : 'No';
      const sandwichStr = item.isSandwichLeave ? 'Yes' : 'No';
      const lopStr = item.isLop ? 'Yes' : 'No';
      const notes = [
        item.holidayName ? `[Holiday: ${item.holidayName}]` : '',
        item.lopReason ? `[LOP: ${item.lopReason}]` : '',
        item.leaveReason ? `[Leave: ${item.leaveReason}]` : '',
      ]
        .filter(Boolean)
        .join(' ');

      return [
        `"${formattedDate}"`,
        `"${dayOfWeek}"`,
        `"${item.dayTypeName || ''}"`,
        `"${item.status || ''}"`,
        `"${loginStr}"`,
        `"${logoutStr}"`,
        `"${leaveStr}"`,
        `"${sandwichStr}"`,
        `"${lopStr}"`,
        `"${notes.replace(/"/g, '""') || '—'}"`,
      ].join(',');
    });

    // Summary metadata row
    const summaryRows = [
      `"MONTHLY ATTENDANCE SUMMARY - ${currentMonthName} ${selectedYear}"`,
      `"Working Days: ${report.workingDays}","Present Days: ${report.presentDays}","Approved Leaves: ${report.approvedLeaveDays}","Allowed Leaves: ${report.monthlyAllowedLeave}","Total LOP Days: ${report.totalLOPDays}","Total LOP Amount: INR ${report.totalLOPAmount}"`,
      '',
    ];

    const csvContent = '\uFEFF' + summaryRows.join('\n') + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${currentMonthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* 1. Header & Controls Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--primary)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '0.2rem',
            }}
          >
            My Workspace
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Attendance Calendar
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Daily login records, approved leaves, sandwich leaves, company holidays, and monthly LOP summary.
          </p>
        </div>

        {/* Filter Controls & Actions */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Year Select */}
          <div style={{ minWidth: '105px' }}>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                padding: '0.42rem 0.75rem',
                fontSize: '0.82rem',
                borderRadius: '8px',
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
              }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div style={{ minWidth: '135px' }}>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{
                padding: '0.42rem 0.75rem',
                fontSize: '0.82rem',
                borderRadius: '8px',
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
              }}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadAttendance}
            disabled={loading}
            title="Refresh Attendance Data"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '0.42rem 0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCSV}
            disabled={loading || !report}
            title="Export Attendance to Excel (CSV)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '0.42rem 0.85rem',
              color: 'var(--green)',
              borderColor: 'var(--border)',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border, rgba(239, 68, 68, 0.3))',
            color: 'var(--danger-text)',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Restyled Colored Stat Cards */}
      {report && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Working Days */}
          <div className="kpi" style={{ '--accent': '#64748b', '--accent-dim': 'rgba(100, 116, 139, 0.15)', padding: '14px 16px' } as React.CSSProperties}>
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label">Working Days</div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <Briefcase size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.5rem' }}>{report.workingDays}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>Expected shift floor</div>
          </div>

          {/* Present Days */}
          <div className="kpi" style={{ '--accent': '#10b981', '--accent-dim': 'rgba(16, 185, 129, 0.15)', padding: '14px 16px' } as React.CSSProperties}>
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label">Present Days</div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <UserCheck size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{report.presentDays}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--success-text)', marginTop: '4px' }}>Logged in on time</div>
          </div>

          {/* Approved Leave */}
          <div className="kpi" style={{ '--accent': '#3b82f6', '--accent-dim': 'rgba(59, 130, 246, 0.15)', padding: '14px 16px' } as React.CSSProperties}>
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label">Approved Leave</div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <FileText size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{report.approvedLeaveDays}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>Sanctioned leaves</div>
          </div>

          {/* Allowed Leave */}
          <div className="kpi" style={{ '--accent': '#06b6d4', '--accent-dim': 'rgba(6, 182, 212, 0.15)', padding: '14px 16px' } as React.CSSProperties}>
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label">Allowed Leave</div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <ShieldCheck size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', color: 'var(--cyan, #06b6d4)' }}>{report.monthlyAllowedLeave}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>Monthly entitlement</div>
          </div>

          {/* Sandwich Days */}
          <div className="kpi" style={{ '--accent': '#f59e0b', '--accent-dim': 'rgba(245, 158, 11, 0.15)', padding: '14px 16px' } as React.CSSProperties}>
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label">Sandwich Days</div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <Layers size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', color: 'var(--warning)' }}>{report.sandwichLeaveDays}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>Adjacent bridge gaps</div>
          </div>

          {/* Leave LOP Days */}
          <div className="kpi" style={{ '--accent': '#f97316', '--accent-dim': 'rgba(249, 115, 22, 0.15)', padding: '14px 16px' } as React.CSSProperties}>
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label">Leave LOP Days</div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <UserX size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', color: report.leaveLOPDays > 0 ? 'var(--danger)' : 'inherit' }}>
              {report.leaveLOPDays}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>Unapproved absence</div>
          </div>

          {/* Late LOP Days */}
          <div className="kpi" style={{ '--accent': '#ef4444', '--accent-dim': 'rgba(239, 68, 68, 0.15)', padding: '14px 16px' } as React.CSSProperties}>
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label">Late LOP Days</div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <Clock size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', color: report.lateLoginLOPDays > 0 ? 'var(--danger)' : 'inherit' }}>
              {report.lateLoginLOPDays}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>Grace time violations</div>
          </div>

          {/* Total LOP Days (Promoted Red-Tinted Priority Card) */}
          <div
            className="kpi"
            style={{
              '--accent': '#ef4444',
              '--accent-dim': 'rgba(239, 68, 68, 0.25)',
              padding: '14px 16px',
              background: report.totalLOPDays > 0 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.05))' : undefined,
              borderColor: report.totalLOPDays > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined,
            } as React.CSSProperties}
          >
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label" style={{ color: report.totalLOPDays > 0 ? 'var(--danger-text)' : undefined, fontWeight: 700 }}>
                Total LOP Days
              </div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <AlertTriangle size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', color: report.totalLOPDays > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {report.totalLOPDays}
            </div>
            <div style={{ fontSize: '0.7rem', color: report.totalLOPDays > 0 ? 'var(--danger-text)' : 'var(--text-faint)', marginTop: '4px', fontWeight: 600 }}>
              {report.totalLOPDays > 0 ? '⚠️ Deductions applied' : 'Zero penalties'}
            </div>
          </div>

          {/* LOP Amount (Promoted Red-Tinted Priority Card) */}
          <div
            className="kpi"
            style={{
              '--accent': '#ef4444',
              '--accent-dim': 'rgba(239, 68, 68, 0.25)',
              padding: '14px 16px',
              background: report.totalLOPAmount > 0 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.05))' : undefined,
              borderColor: report.totalLOPAmount > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined,
            } as React.CSSProperties}
          >
            <div className="kpi-top" style={{ marginBottom: '8px' }}>
              <div className="kpi-label" style={{ color: report.totalLOPAmount > 0 ? 'var(--danger-text)' : undefined, fontWeight: 700 }}>
                LOP Amount
              </div>
              <div className="kpi-icon" style={{ width: '26px', height: '26px' }}>
                <AlertCircle size={13} />
              </div>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.35rem', color: report.totalLOPAmount > 0 ? 'var(--danger)' : 'var(--success)' }}>
              ₹{report.totalLOPAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: report.totalLOPAmount > 0 ? 'var(--danger-text)' : 'var(--text-faint)', marginTop: '4px', fontWeight: 600 }}>
              Salary loss impact
            </div>
          </div>
        </div>
      )}

      {/* 3. Monthly Trend Heatmap Strip */}
      {report && report.dailySummaries.length > 0 && (
        <div
          className="panel"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            background: 'var(--panel)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDays size={15} color="var(--primary)" />
              <span>Monthly Attendance Trend Heatmap</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                ({currentMonthName} {selectedYear})
              </span>
            </div>

            {/* Status Legend */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--success)' }} /> Present
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--warning)' }} /> Late / Sandwich
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--danger)' }} /> Absent / LOP
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary)' }} /> Leave
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--violet)' }} /> Holiday
              </span>
            </div>
          </div>

          {/* Segment Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${report.dailySummaries.length}, 1fr)`, gap: '3px', height: '34px' }}>
            {report.dailySummaries.map((item) => {
              const dayNum = new Date(item.date).getDate();
              const color = getStatusColor(item);
              const isToday = item.date.startsWith(todayIso);

              return (
                <div
                  key={`strip-${item.date}`}
                  onClick={() => setSelectedDayDetail(item)}
                  title={`${dayNum} ${currentMonthName}: ${item.status}${item.loginTime ? ` (In: ${formatTimeIST(item.loginTime)})` : ''}${item.lopReason ? ` - LOP: ${item.lopReason}` : ''}`}
                  style={{
                    background: color,
                    opacity: item.status === 'Weekend' ? 0.35 : 0.85,
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isToday ? '0 0 0 2px var(--primary)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.zIndex = '5';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.zIndex = '1';
                    e.currentTarget.style.opacity = item.status === 'Weekend' ? '0.35' : '0.85';
                  }}
                >
                  <span>{dayNum}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Connected View Section (Header with View Switcher) */}
      <div
        className="panel"
        style={{
          padding: 0,
          overflow: 'hidden',
          marginBottom: '1.5rem',
          borderRadius: '12px',
        }}
      >
        {/* Sub-Header with View Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--panel-raised)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
              Daily Log Detail — {currentMonthName} {selectedYear}
            </span>
            {report && (
              <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                {report.dailySummaries.length} Days Tracked
              </span>
            )}
          </div>

          {/* Table vs Calendar View Mode Toggle */}
          <div
            style={{
              display: 'inline-flex',
              padding: '3px',
              borderRadius: '8px',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'table' ? 700 : 500,
                border: 'none',
                background: viewMode === 'table' ? 'var(--primary-tint)' : 'transparent',
                color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <TableIcon size={14} />
              <span>Table View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: viewMode === 'calendar' ? 700 : 500,
                border: 'none',
                background: viewMode === 'calendar' ? 'var(--primary-tint)' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <CalendarIcon size={14} />
              <span>Calendar View</span>
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <RefreshCw size={28} className="spin-animation" style={{ color: 'var(--primary)', margin: '0 auto 10px auto' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading monthly attendance records...</div>
          </div>
        ) : !report ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CalendarDays size={36} style={{ opacity: 0.4, margin: '0 auto 10px auto' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>No attendance records found</div>
            <div style={{ fontSize: '0.8rem' }}>Please select a published year and month.</div>
          </div>
        ) : viewMode === 'calendar' ? (
          /* ════════════════════════════════════════════════════════════════
             5. CALENDAR MONTH GRID VIEW (7 Columns)
             ════════════════════════════════════════════════════════════════ */
          <div style={{ padding: '1rem 1.25rem' }}>
            {/* Weekday Column Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                marginBottom: '8px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.76rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-muted)',
              }}
            >
              {WEEKDAY_NAMES.map((name) => (
                <div key={name} style={{ padding: '4px 0' }}>
                  {name}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
              }}
            >
              {calendarGridCells.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      style={{
                        minHeight: '100px',
                        background: 'transparent',
                        border: '1px dashed var(--border-soft)',
                        borderRadius: '10px',
                        opacity: 0.4,
                      }}
                    />
                  );
                }

                const dateObj = new Date(cell.date);
                const dayNum = dateObj.getDate();
                const isToday = cell.date.startsWith(todayIso);
                const statusColor = getStatusColor(cell);
                const isWeekend = cell.status === 'Weekend';
                const hasLOP = cell.isLop;

                return (
                  <div
                    key={cell.date}
                    onClick={() => setSelectedDayDetail(cell)}
                    style={{
                      minHeight: '100px',
                      background: isWeekend
                        ? 'var(--panel-raised)'
                        : hasLOP
                        ? 'rgba(239, 68, 68, 0.08)'
                        : 'var(--panel)',
                      border: isToday
                        ? '2px solid var(--primary)'
                        : hasLOP
                        ? '1px solid rgba(239, 68, 68, 0.35)'
                        : '1px solid var(--border)',
                      borderLeft: `4px solid ${statusColor}`,
                      borderRadius: '10px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Top Row: Date Number + Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: isToday ? 'var(--primary)' : 'var(--text-main)',
                        }}
                      >
                        {dayNum}
                      </span>
                      <div>{getStatusBadge(cell.status, true)}</div>
                    </div>

                    {/* Middle Info: Times or Day Type */}
                    <div style={{ margin: '6px 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {cell.loginTime ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontFamily: 'monospace' }}>
                          <span style={{ color: 'var(--text-main)' }}>In: {formatTimeIST(cell.loginTime)}</span>
                          {cell.logoutTime && <span>Out: {formatTimeIST(cell.logoutTime)}</span>}
                        </div>
                      ) : cell.holidayName ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{cell.holidayName}</span>
                      ) : cell.leaveReason ? (
                        <span style={{ color: 'var(--primary)' }}>{cell.leaveReason}</span>
                      ) : (
                        <span style={{ color: 'var(--text-faint)' }}>{cell.dayTypeName}</span>
                      )}
                    </div>

                    {/* Bottom Flags (LOP/Leave/Sandwich) */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {cell.isLop && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                          }}
                        >
                          LOP ⚠️
                        </span>
                      )}
                      {cell.isLeave && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                          }}
                        >
                          Leave
                        </span>
                      )}
                      {cell.isSandwichLeave && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          Sandwich
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════
             6. DETAILED TABLE VIEW (Sticky Header & Flagged Rows)
             ════════════════════════════════════════════════════════════════ */
          <div style={{ overflowX: 'auto', maxHeight: '680px', overflowY: 'auto' }}>
            <table
              className="data-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.82rem',
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  background: 'var(--bg-table-header)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <tr
                  style={{
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    fontSize: '0.72rem',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                  }}
                >
                  <th style={{ padding: '0.65rem 0.85rem' }}>Date</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Day</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Calendar Type</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Login Time</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Logout Time</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Approved Leave</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Sandwich Leave</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>LOP Penalty</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Notes / LOP Reason</th>
                </tr>
              </thead>
              <tbody>
                {report.dailySummaries.map((item, index) => {
                  const dateObj = new Date(item.date);
                  const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const isToday = item.date.startsWith(todayIso);
                  const hasLOP = item.isLop || item.status === 'Absent';
                  const isSandwich = item.isSandwichLeave;

                  return (
                    <tr
                      key={item.date}
                      onClick={() => setSelectedDayDetail(item)}
                      style={{
                        borderBottom: '1px solid var(--border-soft)',
                        background: isToday
                          ? 'var(--primary-tint)'
                          : hasLOP
                          ? 'rgba(239, 68, 68, 0.05)'
                          : isSandwich
                          ? 'rgba(245, 158, 11, 0.05)'
                          : index % 2 === 1
                          ? 'var(--bg-table-stripe)'
                          : 'transparent',
                        borderLeft: isToday
                          ? '4px solid var(--primary)'
                          : hasLOP
                          ? '4px solid var(--danger)'
                          : isSandwich
                          ? '4px solid var(--warning)'
                          : '4px solid transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isToday
                          ? 'var(--primary-tint)'
                          : hasLOP
                          ? 'rgba(239, 68, 68, 0.05)'
                          : isSandwich
                          ? 'rgba(245, 158, 11, 0.05)'
                          : index % 2 === 1
                          ? 'var(--bg-table-stripe)'
                          : 'transparent';
                      }}
                    >
                      {/* Date */}
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {formattedDate}
                      </td>

                      {/* Day */}
                      <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>
                        {dayOfWeek}
                      </td>

                      {/* Calendar Type */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {item.dayTypeName}
                          {item.dayType === AttendanceDayType.SpecialWorkingDay && ' (Special)'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>{getStatusBadge(item.status)}</td>

                      {/* Login Time */}
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {item.loginTime ? (
                          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatTimeIST(item.loginTime)}</span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* Logout Time */}
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {item.logoutTime ? (
                          <span style={{ color: 'var(--text-secondary)' }}>{formatTimeIST(item.logoutTime)}</span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* Approved Leave (Informational Blue Chip) */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        {item.isLeave ? (
                          <span
                            className="badge badge-info"
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            Leave: Yes
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* Sandwich Leave (Amber Chip) */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        {item.isSandwichLeave ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                            Sandwich: Yes
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* LOP Penalty (Strong Red Penalty Badge) */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        {item.isLop ? (
                          <span
                            className="badge badge-danger"
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.18)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <span>LOP: Yes</span>
                            <AlertTriangle size={11} />
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* Notes / LOP Reason */}
                      <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                        {item.holidayName && (
                          <strong style={{ color: 'var(--danger)', marginRight: '0.5rem' }}>
                            {item.holidayName}
                          </strong>
                        )}
                        {item.lopReason && (
                          <span style={{ color: item.isLop ? 'var(--danger)' : 'inherit', fontWeight: item.isLop ? 600 : 400 }}>
                            {item.lopReason}
                          </span>
                        )}
                        {!item.holidayName && !item.lopReason && item.leaveReason && (
                          <span style={{ color: 'var(--primary)' }}>{item.leaveReason}</span>
                        )}
                        {!item.holidayName && !item.lopReason && !item.leaveReason && (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
         7. DAY DETAIL POPOVER / MODAL
         ════════════════════════════════════════════════════════════════ */}
      {selectedDayDetail && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDayDetail(null);
          }}
          style={{ zIndex: 10000, pointerEvents: 'auto' }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '460px',
              width: '90vw',
              borderRadius: '16px',
              padding: '1.4rem',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 10001,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-soft)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Daily Attendance Detail
                </div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                  {new Date(selectedDayDetail.date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedDayDetail(null)}
                style={{ padding: '4px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Status & Day Type Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-raised)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance Status</div>
                  <div style={{ marginTop: '3px' }}>{getStatusBadge(selectedDayDetail.status)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Day Classification</div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '3px' }}>
                    {selectedDayDetail.dayTypeName}
                  </div>
                </div>
              </div>

              {/* Login & Logout Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div style={{ background: 'var(--panel-raised)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Login Time (IST)</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: selectedDayDetail.loginTime ? 'var(--text-main)' : 'var(--text-faint)', marginTop: '2px' }}>
                    {selectedDayDetail.loginTime ? formatTimeIST(selectedDayDetail.loginTime) : 'Not Logged'}
                  </div>
                </div>

                <div style={{ background: 'var(--panel-raised)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logout Time (IST)</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: selectedDayDetail.logoutTime ? 'var(--text-main)' : 'var(--text-faint)', marginTop: '2px' }}>
                    {selectedDayDetail.logoutTime ? formatTimeIST(selectedDayDetail.logoutTime) : 'Not Logged'}
                  </div>
                </div>
              </div>

              {/* Leave & LOP Information */}
              {(selectedDayDetail.isLeave || selectedDayDetail.isLop || selectedDayDetail.isSandwichLeave || selectedDayDetail.holidayName) && (
                <div style={{ background: 'var(--panel-raised)', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {selectedDayDetail.holidayName && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                      🎉 Company Holiday: {selectedDayDetail.holidayName}
                    </div>
                  )}
                  {selectedDayDetail.isLeave && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                      📝 Approved Leave: {selectedDayDetail.leaveReason || 'Sanctioned leave request'}
                    </div>
                  )}
                  {selectedDayDetail.isSandwichLeave && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                      🥪 Sandwich Leave Policy triggered
                    </div>
                  )}
                  {selectedDayDetail.isLop && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                      ⚠️ Loss of Pay (LOP): {selectedDayDetail.lopReason || 'Absence / late policy penalty'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSelectedDayDetail(null)}
                style={{ padding: '0.45rem 1rem', borderRadius: '8px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
