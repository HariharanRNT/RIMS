import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Coffee,
  Edit2,
  FileText,
  History,
  Info,
  Lock,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sun,
  AlertCircle,
  X
} from 'lucide-react';
import {
  attendanceCalendarApi,
  AttendanceDayType
} from '../../../api/attendanceCalendarApi';
import type {
  AttendanceCalendarDto,
  MonthCalendarStatusDto,
  AttendanceCalendarAuditDto
} from '../../../api/attendanceCalendarApi';

const MONTH_OPTIONS = [
  { id: 1, name: 'January' }, { id: 2, name: 'February' }, { id: 3, name: 'March' },
  { id: 4, name: 'April' }, { id: 5, name: 'May' }, { id: 6, name: 'June' },
  { id: 7, name: 'July' }, { id: 8, name: 'August' }, { id: 9, name: 'September' },
  { id: 10, name: 'October' }, { id: 11, name: 'November' }, { id: 12, name: 'December' }
];

export const MonthlyCalendarPage: React.FC = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [calendarDays, setCalendarDays] = useState<AttendanceCalendarDto[]>([]);
  const [status, setStatus] = useState<MonthCalendarStatusDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDayType, setFilterDayType] = useState<string>('ALL');

  // Modals & Confirmation Dialogs
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [editingDay, setEditingDay] = useState<AttendanceCalendarDto | null>(null);

  // Form State for Day Editing
  const [editDayType, setEditDayType] = useState<AttendanceDayType>(AttendanceDayType.WorkingDay);
  const [editHolidayName, setEditHolidayName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  // Audit Log Modal State
  const [auditLogs, setAuditLogs] = useState<AttendanceCalendarAuditDto[]>([]);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [auditModalTitle, setAuditModalTitle] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentMonthName = MONTH_OPTIONS.find(m => m.id === selectedMonth)?.name || 'Month';

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [daysData, statusData] = await Promise.all([
        attendanceCalendarApi.getMonthlyCalendar(selectedYear, selectedMonth),
        attendanceCalendarApi.getCalendarStatus(selectedYear, selectedMonth)
      ]);
      setCalendarDays(daysData);
      setStatus(statusData);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Unable to retrieve monthly attendance calendar from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const handleConfirmGenerate = async () => {
    setShowGenerateModal(false);
    setGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const days = await attendanceCalendarApi.generateCalendar(selectedYear, selectedMonth);
      setCalendarDays(days);
      const statusData = await attendanceCalendarApi.getCalendarStatus(selectedYear, selectedMonth);
      setStatus(statusData);
      setSuccessMessage(`Calendar generated successfully for ${currentMonthName} ${selectedYear}.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to generate monthly calendar.');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmPublish = async () => {
    setShowPublishModal(false);
    setPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updatedStatus = await attendanceCalendarApi.publishCalendar(selectedYear, selectedMonth);
      setStatus(updatedStatus);
      await loadData();
      setSuccessMessage(`Monthly calendar for ${currentMonthName} ${selectedYear} is now PUBLISHED.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to publish monthly calendar.');
    } finally {
      setPublishing(false);
    }
  };

  const openEditModal = (day: AttendanceCalendarDto) => {
    setEditingDay(day);
    setEditDayType(day.dayType);
    setEditHolidayName(day.holidayName || '');
    setEditDescription(day.description || '');
    setEditReason('');
  };

  const handleSaveDay = async () => {
    if (!editingDay) return;
    if (editingDay.isPublished && !editReason.trim()) {
      setErrorMessage('A mandatory reason for change is required when modifying a published calendar entry.');
      return;
    }

    setSavingId(editingDay.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const req = {
        id: editingDay.id,
        dayType: editDayType,
        holidayName: editHolidayName,
        description: editDescription,
        reasonForChange: editReason
      };

      if (editingDay.isPublished) {
        await attendanceCalendarApi.changePublishedCalendarDay(editingDay.id, req);
      } else {
        await attendanceCalendarApi.updateCalendarDay(editingDay.id, req);
      }

      setEditingDay(null);
      await loadData();
      setSuccessMessage(`Successfully updated date ${editingDay.calendarDate}.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update calendar day.');
    } finally {
      setSavingId(null);
    }
  };

  const openAuditLogs = async (day: AttendanceCalendarDto) => {
    try {
      const logs = await attendanceCalendarApi.getAuditLogs(day.id);
      setAuditLogs(logs);
      setAuditModalTitle(`Audit History — ${day.calendarDate}`);
      setShowAuditModal(true);
    } catch {
      setErrorMessage('Failed to load audit logs.');
    }
  };

  const getDayTypeBadge = (type: AttendanceDayType) => {
    switch (type) {
      case AttendanceDayType.WorkingDay:
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            Working Day
          </span>
        );
      case AttendanceDayType.Weekend:
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' }}>
            Weekend
          </span>
        );
      case AttendanceDayType.CompanyHoliday:
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
            Company Holiday
          </span>
        );
      case AttendanceDayType.OptionalHoliday:
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            Optional Holiday
          </span>
        );
      case AttendanceDayType.SpecialWorkingDay:
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            Special Working Day
          </span>
        );
      default:
        return <span className="badge badge-neutral">Unknown</span>;
    }
  };

  const renderWorkingDayPill = (isWorkingDay: boolean) => {
    if (isWorkingDay) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          color: '#4ade80',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          Yes
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.65rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: 'rgba(255, 255, 255, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        No
      </span>
    );
  };

  const getStatusBadge = (statusStr?: string, isPublished?: boolean, isGenerated?: boolean) => {
    if (isPublished || statusStr === 'Published') {
      return (
        <span
          className="badge"
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            cursor: 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
          title="Published calendar — modifications require a mandatory audit reason."
        >
          <Lock size={12} /> Published
        </span>
      );
    }
    if (isGenerated || statusStr === 'Draft') {
      return (
        <span
          className="badge badge-warning"
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            cursor: 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
          title="Draft calendar — unpublished edits in progress."
        >
          <FileText size={12} /> Draft
        </span>
      );
    }
    return (
      <span
        className="badge badge-neutral"
        style={{
          padding: '0.35rem 0.75rem',
          fontSize: '0.8rem',
          cursor: 'default',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}
        title="Calendar not yet generated for this month."
      >
        <Info size={12} /> Not Generated
      </span>
    );
  };

  // Filtered calendar days based on Search Query & Day Type Chip
  const filteredDays = calendarDays.filter((day) => {
    const dateObj = new Date(day.calendarDate);
    const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    if (filterDayType !== 'ALL' && day.dayType !== Number(filterDayType)) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDate = day.calendarDate.toLowerCase().includes(q) || formattedDate.toLowerCase().includes(q);
      const matchDay = dayOfWeek.toLowerCase().includes(q);
      const matchHoliday = (day.holidayName || '').toLowerCase().includes(q);
      const matchDesc = (day.description || '').toLowerCase().includes(q);
      if (!matchDate && !matchDay && !matchHoliday && !matchDesc) {
        return false;
      }
    }

    return true;
  });

  return (
    <div>
      <style>{`
        .calendar-table-row:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
        }
        .stat-card-badge {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .summary-cards-5-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 1024px) {
          .summary-cards-5-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          }
        }
      `}</style>

      {/* 1. Page Header */}
      <div className="header">
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Attendance & Policy Configuration
          </div>
          <h2>Monthly Attendance Calendar</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Configure monthly working days, weekends, holidays, leave eligibility and LOP calculation rules.
          </p>
        </div>

        <div>
          {getStatusBadge(status?.status, status?.isPublished, status?.isGenerated)}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid rgba(34, 197, 139, 0.3)',
          color: 'var(--success-text)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{
          background: 'var(--danger-bg)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger-text)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* 2. Filter & Actions Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', flex: 1 }}>
            <div style={{ minWidth: '160px' }}>
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
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

            <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {!status?.isPublished && (
              <button
                className="btn btn-primary"
                onClick={() => setShowGenerateModal(true)}
                disabled={generating}
              >
                <CalendarDays size={16} />
                <span>{generating ? 'Generating...' : status?.isGenerated ? 'Regenerate Draft' : 'Generate Calendar'}</span>
              </button>
            )}

            {status?.isGenerated && !status?.isPublished && (
              <button
                className="btn btn-primary"
                onClick={() => setShowPublishModal(true)}
                disabled={publishing}
                style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
              >
                <Send size={16} />
                <span>{publishing ? 'Publishing...' : 'Publish Calendar'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Summary Cards Grid (5 cards in single row) */}
      <div className="summary-cards-5-grid">
        {/* Card 1: Working Days (Green) */}
        <div className="ui-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Working Days
            </span>
            <div className="stat-card-badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {status?.workingDays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            +{status?.specialWorkingDays ?? 0} Special Working Days
          </div>
        </div>

        {/* Card 2: Special Working Days (Amber) */}
        <div className="ui-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Special Working Days
            </span>
            <div className="stat-card-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
            {status?.specialWorkingDays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Weekend Overrides
          </div>
        </div>

        {/* Card 3: Weekends (Neutral Gray) */}
        <div className="ui-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weekends
            </span>
            <div className="stat-card-badge" style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
              <Coffee size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {status?.weekendDays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Non-Working Days
          </div>
        </div>

        {/* Card 4: Company Holidays (Gold/Declared) */}
        <div className="ui-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Company Holidays
            </span>
            <div className="stat-card-badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
              <Sun size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#eab308' }}>
            {status?.companyHolidays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Declared Holidays
          </div>
        </div>

        {/* Card 5: Optional Holidays (Muted Purple) */}
        <div className="ui-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Optional Holidays
            </span>
            <div className="stat-card-badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Info size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#c084fc' }}>
            {status?.optionalHolidays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Floating Holidays
          </div>
        </div>
      </div>

      {/* 4. Calendar Status Card */}
      <div className="ui-card" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Calendar Status
            </div>
            <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {status?.isPublished ? (
                <span
                  className="badge"
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.3rem 0.8rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    cursor: 'default'
                  }}
                  title="Published calendar — modifications require an audit reason."
                >
                  ● Published
                </span>
              ) : status?.isGenerated ? (
                <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', cursor: 'default' }} title="Draft status — calendar is pending publication.">
                  ● Draft
                </span>
              ) : (
                <span className="badge badge-neutral" style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', cursor: 'default' }} title="Calendar not generated.">
                  ● Not Generated
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Calendar Days</div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{status?.totalDays ?? DateTimeDaysInMonth(selectedYear, selectedMonth)} Days</div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Published</div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{status?.isPublished ? 'Yes' : 'No'}</div>
          </div>

          {status?.isPublished && (
            <>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Published On</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {status.publishedAt ? new Date(status.publishedAt).toLocaleDateString() : '-'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Published By</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {status.publishedByName || 'System Admin'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Monthly Calendar Table & Main Content */}
      {loading ? (
        /* Loading Skeleton */
        <div className="table-container" style={{ padding: '2rem' }}>
          <div className="skeleton" style={{ height: '300px', width: '100%' }} />
        </div>
      ) : !status?.isGenerated || calendarDays.length === 0 ? (
        /* Empty State */
        <div className="ui-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-tint)',
            color: 'var(--primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <CalendarDays size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            No Attendance Calendar
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            The attendance calendar for <strong>{currentMonthName} {selectedYear}</strong> has not been generated yet.
            Generate the calendar to configure working days, weekends and holidays.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowGenerateModal(true)}
            disabled={generating}
            style={{ padding: '0.65rem 1.4rem' }}
          >
            <CalendarDays size={18} />
            <span>Generate Calendar</span>
          </button>
        </div>
      ) : (
        /* Calendar Table & Search/Filter Toolbar */
        <div>
          {/* Search & Filter Bar */}
          <div className="glass-card" style={{ marginBottom: '1rem', padding: '0.85rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.8125rem' }}
                placeholder="Search date, day name, holiday..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.25rem' }}>
                Filter:
              </span>
              {[
                { label: 'All', value: 'ALL' },
                { label: 'Working Day', value: String(AttendanceDayType.WorkingDay) },
                { label: 'Weekend', value: String(AttendanceDayType.Weekend) },
                { label: 'Company Holiday', value: String(AttendanceDayType.CompanyHoliday) },
                { label: 'Optional Holiday', value: String(AttendanceDayType.OptionalHoliday) },
                { label: 'Special Working', value: String(AttendanceDayType.SpecialWorkingDay) },
              ].map(chip => {
                const isActive = filterDayType === chip.value;
                return (
                  <button
                    key={chip.value}
                    onClick={() => setFilterDayType(chip.value)}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 600 : 500,
                      background: isActive ? 'var(--primary-tint)' : 'rgba(255, 255, 255, 0.06)',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      border: isActive ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Data Table */}
          <div className="glass-card table-container" style={{ padding: 0, maxHeight: '650px', overflowY: 'auto' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {currentMonthName} {selectedYear} Attendance Calendar
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Configure each date before publishing the monthly calendar.
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Showing {filteredDays.length} of {calendarDays.length} Dates
              </span>
            </div>

            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 30, 28, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 30, 28, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>Day</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 30, 28, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>Day Type</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 30, 28, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>Working Day</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 30, 28, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>Holiday Name</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 30, 28, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15, 30, 28, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDays.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No matching dates found for search "{searchQuery}" or selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredDays.map((day, index) => {
                    const dateObj = new Date(day.calendarDate);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                      <tr
                        key={day.id}
                        className="calendar-table-row"
                        style={{
                          background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {formattedDate}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {dayOfWeek}
                        </td>
                        <td>
                          {getDayTypeBadge(day.dayType)}
                        </td>
                        <td>
                          {renderWorkingDayPill(day.isWorkingDay)}
                        </td>
                        <td>
                          {day.holidayName ? (
                            <strong style={{ color: 'var(--text-main)' }}>{day.holidayName}</strong>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>
                          )}
                          {day.description && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{day.description}</div>
                          )}
                        </td>
                        <td>
                          {getDayTypeBadge(day.dayType)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(day)}
                              title="Edit this day"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openAuditLogs(day)}
                              title="View change history"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <History size={12} />
                              <span>History</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Generate Calendar Confirmation Modal */}
      {showGenerateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Generate {currentMonthName} {selectedYear} Calendar?
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowGenerateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              This will create default calendar entries for <strong>{currentMonthName} {selectedYear}</strong>:
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                <li>Monday – Friday → <strong>Working Day</strong></li>
                <li>Saturday → <strong>Weekend</strong></li>
                <li>Sunday → <strong>Weekend</strong></li>
              </ul>
              <p style={{ marginTop: '0.75rem' }}>You can customize holidays and special working days after generation.</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConfirmGenerate} disabled={generating}>
                <CalendarDays size={16} />
                <span>{generating ? 'Generating...' : 'Generate Calendar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Publish Calendar Confirmation Modal */}
      {showPublishModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
                Publish {currentMonthName} {selectedYear} Calendar?
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPublishModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Once published, this calendar will be used as the single source of truth for:
              <div style={{ background: 'var(--bg-app)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <div>✓ Attendance Login Eligibility</div>
                <div>✓ Leave Balance Calculation</div>
                <div>✓ Absence & Half-Day Classification</div>
                <div>✓ LOP Days Calculation</div>
                <div>✓ Payroll Processing Engine</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowPublishModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmPublish}
                disabled={publishing}
                style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
              >
                <Send size={16} />
                <span>{publishing ? 'Publishing...' : 'Publish Calendar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Day Edit Modal / 9. Published Edit Modal */}
      {editingDay && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {editingDay.isPublished ? 'Change Published Calendar' : 'Edit Attendance Calendar Day'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {editingDay.calendarDate} ({new Date(editingDay.calendarDate).toLocaleDateString('en-US', { weekday: 'long' })})
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingDay(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Calendar Day Type *</label>
                <select
                  className="form-select"
                  value={editDayType}
                  onChange={(e) => setEditDayType(parseInt(e.target.value) as AttendanceDayType)}
                >
                  <option value={AttendanceDayType.WorkingDay}>Working Day (Login Required)</option>
                  <option value={AttendanceDayType.Weekend}>Weekend (No Login Required)</option>
                  <option value={AttendanceDayType.CompanyHoliday}>Company Holiday (No Login Required)</option>
                  <option value={AttendanceDayType.OptionalHoliday}>Optional Holiday (Employee Opt-in)</option>
                  <option value={AttendanceDayType.SpecialWorkingDay}>Special Working Day (Weekend Override)</option>
                </select>
              </div>

              {(editDayType === AttendanceDayType.CompanyHoliday || editDayType === AttendanceDayType.OptionalHoliday) && (
                <div className="form-group">
                  <label className="form-label">Holiday Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editHolidayName}
                    onChange={(e) => setEditHolidayName(e.target.value)}
                    placeholder="e.g. Independence Day, Ganesh Chaturthi"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Description / Remarks (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Additional context or notes..."
                />
              </div>

              {/* Published Calendar Audit Reason Requirement */}
              {editingDay.isPublished && (
                <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245, 165, 36, 0.4)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  <label className="form-label" style={{ color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <ShieldAlert size={14} /> Reason for Change * (Mandatory for Published Dates)
                  </label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Mandatory reason for auditing payroll & attendance change..."
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setEditingDay(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveDay}
                disabled={savingId === editingDay.id || (editingDay.isPublished && !editReason.trim())}
              >
                <span>{savingId === editingDay.id ? 'Saving...' : 'Save Change'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} color="var(--primary)" />
                <span>{auditModalTitle}</span>
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAuditModal(false)}>
                <X size={16} />
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No audit changes recorded for this date.
              </div>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ background: 'var(--bg-app)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.changedByUserName}</span>
                      <span>{new Date(log.changedAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{log.oldDayTypeName}</span>
                      <span>→</span>
                      <span style={{ color: 'var(--primary)' }}>{log.newDayTypeName}</span>
                      {log.newHolidayName && <span className="badge badge-danger">{log.newHolidayName}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <strong>Reason:</strong> "{log.reasonForChange}"
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAuditModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function
function DateTimeDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
