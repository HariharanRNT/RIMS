import React, { useEffect, useState } from 'react';
import {
  Clock,
  Coffee,
  FileText,
  RefreshCw,
  Sun,
  UserCheck,
  UserX,
  AlertCircle
} from 'lucide-react';
import {
  attendanceCalendarApi,
  AttendanceDayType
} from '../../api/attendanceCalendarApi';
import type { EmployeeMonthlyAttendanceReportDto } from '../../api/attendanceCalendarApi';
import { formatTimeIST } from '../../utils/dateUtils';

const MONTH_OPTIONS = [
  { id: 1, name: 'January' }, { id: 2, name: 'February' }, { id: 3, name: 'March' },
  { id: 4, name: 'April' }, { id: 5, name: 'May' }, { id: 6, name: 'June' },
  { id: 7, name: 'July' }, { id: 8, name: 'August' }, { id: 9, name: 'September' },
  { id: 10, name: 'October' }, { id: 11, name: 'November' }, { id: 12, name: 'December' }
];

export const EmployeeCalendarPage: React.FC = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [report, setReport] = useState<EmployeeMonthlyAttendanceReportDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentMonthName = MONTH_OPTIONS.find(m => m.id === selectedMonth)?.name || 'Month';

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return <span className="badge badge-success"><UserCheck size={12} /> Present</span>;
      case 'Late':
        return <span className="badge badge-warning"><Clock size={12} /> Late Login</span>;
      case 'Permission':
        return <span className="badge badge-info"><Clock size={12} /> Permission</span>;
      case 'Absent':
        return <span className="badge badge-danger"><UserX size={12} /> Absent</span>;
      case 'Leave':
        return <span className="badge badge-primary"><FileText size={12} /> Approved Leave</span>;
      case 'Sandwich Leave':
        return <span className="badge badge-warning"><FileText size={12} /> Sandwich Leave</span>;
      case 'Holiday':
        return <span className="badge badge-danger"><Sun size={12} /> Holiday</span>;
      case 'Weekend':
        return <span className="badge badge-neutral"><Coffee size={12} /> Weekend</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            My Workspace
          </div>
          <h2>Monthly Attendance Calendar</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            View daily login records, approved leaves, sandwich leaves, company holidays, and monthly LOP summary.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger-text)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '160px' }}>
            <label className="form-label">Year</label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {MONTH_OPTIONS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-secondary" onClick={loadAttendance} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Full Summary Cards (as specified in Section 20) */}
      {report && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div className="ui-card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Working Days</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>{report.workingDays}</div>
          </div>

          <div className="ui-card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Present Days</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.15rem' }}>{report.presentDays}</div>
          </div>

          <div className="ui-card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Approved Leave</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.15rem' }}>{report.approvedLeaveDays}</div>
          </div>

          <div className="ui-card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Allowed Leave</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--info)', marginTop: '0.15rem' }}>{report.monthlyAllowedLeave}</div>
          </div>

          <div className="ui-card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sandwich Days</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--warning)', marginTop: '0.15rem' }}>{report.sandwichLeaveDays}</div>
          </div>

          <div className="ui-card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Leave LOP Days</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: report.leaveLOPDays > 0 ? 'var(--danger)' : 'var(--text-main)', marginTop: '0.15rem' }}>{report.leaveLOPDays}</div>
          </div>

          <div className="ui-card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Late LOP Days</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: report.lateLoginLOPDays > 0 ? 'var(--danger)' : 'var(--text-main)', marginTop: '0.15rem' }}>{report.lateLoginLOPDays}</div>
          </div>

          <div className="ui-card" style={{ padding: '0.85rem 1rem', background: report.totalLOPDays > 0 ? '#fef2f2' : undefined }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total LOP Days</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: report.totalLOPDays > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '0.15rem' }}>{report.totalLOPDays}</div>
          </div>

          <div className="ui-card" style={{ padding: '0.85rem 1rem', background: report.totalLOPAmount > 0 ? '#fef2f2' : undefined }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>LOP Amount</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: report.totalLOPAmount > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '0.15rem' }}>
              ₹{report.totalLOPAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      {loading ? (
        <div className="table-container" style={{ padding: '2rem' }}>
          <div className="skeleton" style={{ height: '300px', width: '100%' }} />
        </div>
      ) : !report ? (
        <div className="ui-card" style={{ padding: '2rem', textAlign: 'center' }}>No attendance records found for this period.</div>
      ) : (
        <div className="table-container">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: 700, color: 'var(--text-main)' }}>
            Daily Log Detail — {currentMonthName} {selectedYear}
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Calendar Type</th>
                <th>Status</th>
                <th>Login Time</th>
                <th>Logout Time</th>
                <th>Leave</th>
                <th>Sandwich Leave</th>
                <th>LOP</th>
                <th>Notes / LOP Reason</th>
              </tr>
            </thead>
            <tbody>
              {report.dailySummaries.map((item) => {
                const dateObj = new Date(item.date);
                const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <tr key={item.date} style={{ backgroundColor: item.isSandwichLeave ? '#fffbeb' : undefined }}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{formattedDate}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{dayOfWeek}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        {item.dayTypeName}
                        {item.dayType === AttendanceDayType.SpecialWorkingDay && ' (Special)'}
                      </span>
                    </td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {item.loginTime ? formatTimeIST(item.loginTime) : '-'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {item.logoutTime ? formatTimeIST(item.logoutTime) : '-'}
                    </td>
                    <td>
                      {item.isLeave ? (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Yes</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No</span>
                      )}
                    </td>
                    <td>
                      {item.isSandwichLeave ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Yes</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No</span>
                      )}
                    </td>
                    <td>
                      {item.isLop ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                          Yes{item.isSandwichLeave ? '*' : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {item.holidayName && <strong style={{ color: 'var(--danger)', marginRight: '0.5rem' }}>{item.holidayName}</strong>}
                      {item.lopReason && <span style={{ color: item.isLop ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: item.isLop ? 600 : 400 }}>{item.lopReason}</span>}
                      {!item.holidayName && !item.lopReason && item.leaveReason && <span>{item.leaveReason}</span>}
                      {!item.holidayName && !item.lopReason && !item.leaveReason && '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
