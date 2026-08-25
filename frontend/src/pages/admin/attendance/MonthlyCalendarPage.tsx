import React, { useEffect, useState, useMemo } from 'react';
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
  X,
  AlertTriangle,
  Sparkles,
  ChevronRight
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
  const todayIso = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

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

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkDayType, setBulkDayType] = useState<AttendanceDayType>(AttendanceDayType.WorkingDay);
  const [bulkHolidayName, setBulkHolidayName] = useState<string>('');
  const [bulkDescription, setBulkDescription] = useState<string>('');
  const [bulkReason, setBulkReason] = useState<string>('');
  const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Modals & Confirmation Dialogs
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [editingDay, setEditingDay] = useState<AttendanceCalendarDto | null>(null);

  // Form State for Single Day Editing
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
  const isCurrentMonthActive = selectedYear === currentDate.getFullYear() && selectedMonth === (currentDate.getMonth() + 1);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSelectedIds([]);
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

  const handleJumpToToday = () => {
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth() + 1);
    setTimeout(() => {
      const todayEl = document.getElementById(`calendar-row-${todayIso}`);
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

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
      setSelectedIds([]);
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
      setSuccessMessage(`Successfully updated date ${editingDay.calendarDate.slice(0, 10)}.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update calendar day.');
    } finally {
      setSavingId(null);
    }
  };

  // Bulk Edit Handler
  const handleOpenBulkModal = (dayType?: AttendanceDayType) => {
    if (selectedIds.length === 0) return;
    if (dayType !== undefined) {
      setBulkDayType(dayType);
    }
    setBulkHolidayName('');
    setBulkDescription('');
    setBulkReason('');
    setShowBulkModal(true);
  };

  const handleExecuteBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    if (status?.isPublished && !bulkReason.trim()) {
      setErrorMessage('A mandatory reason for change is required when modifying published calendar dates.');
      return;
    }

    setBulkProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setBulkProgress({ current: 0, total: selectedIds.length });

    let successCount = 0;
    const isPub = !!status?.isPublished;

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      const req = {
        id,
        dayType: bulkDayType,
        holidayName: bulkHolidayName,
        description: bulkDescription,
        reasonForChange: bulkReason || 'Bulk modification'
      };

      try {
        if (isPub) {
          await attendanceCalendarApi.changePublishedCalendarDay(id, req);
        } else {
          await attendanceCalendarApi.updateCalendarDay(id, req);
        }
        successCount++;
      } catch (err) {
        console.error(`Failed to update day ${id}`, err);
      }
      setBulkProgress({ current: i + 1, total: selectedIds.length });
    }

    setBulkProcessing(false);
    setShowBulkModal(false);
    setSelectedIds([]);
    await loadData();
    setSuccessMessage(`Successfully updated ${successCount} of ${selectedIds.length} selected calendar days.`);
  };

  const openAuditLogs = async (day: AttendanceCalendarDto) => {
    try {
      const logs = await attendanceCalendarApi.getAuditLogs(day.id);
      setAuditLogs(logs);
      setAuditModalTitle(`Audit History — ${day.calendarDate.slice(0, 10)}`);
      setShowAuditModal(true);
    } catch {
      setErrorMessage('Failed to load audit logs.');
    }
  };

  // Color Tokens for Badges
  const getDayTypeBadge = (type: AttendanceDayType) => {
    switch (type) {
      case AttendanceDayType.WorkingDay:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              fontWeight: 600,
              padding: '0.25rem 0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <CheckCircle2 size={12} /> Working Day
          </span>
        );
      case AttendanceDayType.Weekend:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              padding: '0.25rem 0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Coffee size={12} /> Weekend
          </span>
        );
      case AttendanceDayType.CompanyHoliday:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#fefce8',
              color: '#ca8a04',
              border: '1px solid #fde047',
              fontWeight: 600,
              padding: '0.25rem 0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Sun size={12} /> Company Holiday
          </span>
        );
      case AttendanceDayType.OptionalHoliday:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#faf5ff',
              color: '#9333ea',
              border: '1px solid #d8b4fe',
              fontWeight: 600,
              padding: '0.25rem 0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Info size={12} /> Optional Holiday
          </span>
        );
      case AttendanceDayType.SpecialWorkingDay:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#fffbeb',
              color: '#d97706',
              border: '1px solid #fde68a',
              fontWeight: 600,
              padding: '0.25rem 0.65rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Calendar size={12} /> Special Working Day
          </span>
        );
      default:
        return <span className="badge badge-neutral">Unknown</span>;
    }
  };

  const getStatusBadge = (statusStr?: string, isPublished?: boolean, isGenerated?: boolean) => {
    if (isPublished || statusStr === 'Published') {
      return (
        <span
          className="badge"
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.8125rem',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
            cursor: 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600
          }}
          title="Published calendar — modifications require a mandatory audit reason and will trigger payroll recalculation."
        >
          <Lock size={14} /> Published
        </span>
      );
    }
    if (isGenerated || statusStr === 'Draft') {
      return (
        <span
          className="badge badge-warning"
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.8125rem',
            cursor: 'default',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600
          }}
          title="Draft calendar — unpublished edits in progress."
        >
          <FileText size={14} /> Draft
        </span>
      );
    }
    return (
      <span
        className="badge badge-neutral"
        style={{
          padding: '0.4rem 0.85rem',
          fontSize: '0.8125rem',
          cursor: 'default',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontWeight: 600
        }}
        title="Calendar not yet generated for this month."
      >
        <Info size={14} /> Not Generated
      </span>
    );
  };

  // Filtered calendar days based on Search Query & Day Type Chip
  const filteredDays = useMemo(() => {
    return calendarDays.filter((day) => {
      const dateObj = new Date(day.calendarDate);
      const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
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
  }, [calendarDays, filterDayType, searchQuery]);

  // Bulk Selection Helpers
  const isAllFilteredSelected = filteredDays.length > 0 && filteredDays.every(d => selectedIds.includes(d.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredDays.map(d => d.id));
      setSelectedIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredDays.map(d => d.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const handleToggleRowSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectWeekends = () => {
    const weekendIds = filteredDays
      .filter(d => {
        const dayOfWeek = new Date(d.calendarDate).getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      })
      .map(d => d.id);
    setSelectedIds(weekendIds);
  };

  const handleSelectWeekdays = () => {
    const weekdayIds = filteredDays
      .filter(d => {
        const dayOfWeek = new Date(d.calendarDate).getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
      })
      .map(d => d.id);
    setSelectedIds(weekdayIds);
  };

  return (
    <div>
      <style>{`
        .calendar-table-row {
          transition: all 0.15s ease;
        }
        .calendar-table-row:hover {
          background-color: rgba(232, 135, 60, 0.04) !important;
        }
        .calendar-table-row.is-today {
          background-color: rgba(232, 135, 60, 0.07) !important;
          border-left: 3px solid var(--primary) !important;
        }
        .calendar-table-row.is-selected {
          background-color: rgba(232, 135, 60, 0.1) !important;
        }
        .kpi-stat-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: var(--radius-md);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          padding: 1.15rem 1.25rem;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .kpi-stat-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        .kpi-stat-badge {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .summary-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        @media (max-width: 1024px) {
          .summary-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          }
        }
        .icon-action-btn {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-xs);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .icon-action-btn:hover {
          background: var(--primary-tint);
          border-color: var(--primary);
          color: var(--primary);
        }
        .sticky-table-header th {
          position: sticky;
          top: 0;
          z-index: 20;
          background: #f8fafc;
          border-bottom: 2px solid var(--border-color);
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .bulk-action-bar {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--primary);
          box-shadow: 0 4px 20px rgba(232, 135, 60, 0.15);
          border-radius: var(--radius-md);
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1rem;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 1. Page Header */}
      <div className="header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Attendance & Policy Configuration
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>Monthly Attendance Calendar</h2>
            {status?.isPublished && (
              <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-xs)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                <Lock size={12} /> Single Source of Truth
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Configure working days, weekends, holidays, leave eligibility and LOP calculation rules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {getStatusBadge(status?.status, status?.isPublished, status?.isGenerated)}
        </div>
      </div>

      {/* Published Policy Warning Banner */}
      {status?.isPublished && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.8125rem',
          color: '#92400e'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, color: '#d97706' }} />
          <div style={{ flex: 1 }}>
            <strong>Calendar is Published:</strong> Date updates are monitored. Any individual or bulk change requires a mandatory change justification for payroll & leave audit trails.
          </div>
        </div>
      )}

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
          justifyContent: 'space-between',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', color: 'var(--success-text)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>
              <RefreshCw size={12} /> Retry
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              style={{ background: 'none', border: 'none', color: 'var(--danger-text)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Reactive Month / Year Selector & Actions Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {/* Year Dropdown */}
            <div style={{ minWidth: '110px' }}>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ fontWeight: 600, height: '38px' }}
                title="Year"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month Dropdown */}
            <div style={{ minWidth: '150px' }}>
              <select
                className="form-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ fontWeight: 600, height: '38px' }}
                title="Month"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Reactive Refresh Indicator Button */}
            <button
              className="icon-action-btn"
              onClick={loadData}
              disabled={loading}
              title="Refresh calendar data"
              style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)' }}
            >
              <RefreshCw size={15} className={loading ? 'spin-animation' : ''} />
            </button>

            {/* Quick "Jump to Today" shortcut if viewing another month */}
            {!isCurrentMonthActive && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleJumpToToday}
                title="Jump to current month and highlight today"
                style={{ height: '38px', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Sparkles size={14} color="var(--primary)" />
                <span>Jump to Today</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {!status?.isPublished && (
              <button
                className="btn btn-secondary"
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

      {/* 3. Summary Cards Grid (Clean single rounded border, no seam lines, consistent captions) */}
      <div className="summary-stats-grid">
        {/* Card 1: Working Days (Green) */}
        <div className="kpi-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Working Days
            </span>
            <div className="kpi-stat-badge" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: (status?.workingDays ?? 0) === 0 ? 'var(--text-muted)' : 'var(--text-main)',
            opacity: (status?.workingDays ?? 0) === 0 ? 0.45 : 1
          }}>
            {status?.workingDays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            +{status?.specialWorkingDays ?? 0} Special Working Days
          </div>
        </div>

        {/* Card 2: Special Working Days (Amber) */}
        <div className="kpi-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Special Working
            </span>
            <div className="kpi-stat-badge" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: (status?.specialWorkingDays ?? 0) === 0 ? 'var(--text-muted)' : '#d97706',
            opacity: (status?.specialWorkingDays ?? 0) === 0 ? 0.45 : 1
          }}>
            {status?.specialWorkingDays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Weekend Overrides
          </div>
        </div>

        {/* Card 3: Weekends (Neutral Gray/Slate) */}
        <div className="kpi-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weekends
            </span>
            <div className="kpi-stat-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
              <Coffee size={18} />
            </div>
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: (status?.weekendDays ?? 0) === 0 ? 'var(--text-muted)' : 'var(--text-main)',
            opacity: (status?.weekendDays ?? 0) === 0 ? 0.45 : 1
          }}>
            {status?.weekendDays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Non-Working Days
          </div>
        </div>

        {/* Card 4: Company Holidays (Yellow/Gold) */}
        <div className="kpi-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Company Holidays
            </span>
            <div className="kpi-stat-badge" style={{ backgroundColor: '#fefce8', color: '#ca8a04' }}>
              <Sun size={18} />
            </div>
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: (status?.companyHolidays ?? 0) === 0 ? 'var(--text-muted)' : '#ca8a04',
            opacity: (status?.companyHolidays ?? 0) === 0 ? 0.45 : 1
          }}>
            {status?.companyHolidays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Declared Holidays
          </div>
        </div>

        {/* Card 5: Optional Holidays (Purple) */}
        <div className="kpi-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Optional Holidays
            </span>
            <div className="kpi-stat-badge" style={{ backgroundColor: '#faf5ff', color: '#9333ea' }}>
              <Info size={18} />
            </div>
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: (status?.optionalHolidays ?? 0) === 0 ? 'var(--text-muted)' : '#9333ea',
            opacity: (status?.optionalHolidays ?? 0) === 0 ? 0.45 : 1
          }}>
            {status?.optionalHolidays ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Floating Holidays
          </div>
        </div>
      </div>

      {/* 4. Calendar Main Table Section */}
      {loading ? (
        <div className="table-container" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '350px', width: '100%', borderRadius: 'var(--radius-md)' }} />
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
            No Attendance Calendar Generated
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            The attendance calendar for <strong>{currentMonthName} {selectedYear}</strong> has not been generated yet.
            Generate default working days and weekends to begin policy setup.
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
        <div>
          {/* Floating / Inline Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="bulk-action-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="badge" style={{ backgroundColor: 'var(--primary)', color: '#ffffff', fontWeight: 700, padding: '0.35rem 0.65rem' }}>
                  {selectedIds.length} Selected
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  Apply bulk action to selected dates:
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenBulkModal(AttendanceDayType.WorkingDay)}
                  style={{ fontSize: '0.75rem', borderColor: '#a7f3d0', color: '#059669' }}
                >
                  <CheckCircle2 size={13} /> Mark as Working Day
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenBulkModal(AttendanceDayType.Weekend)}
                  style={{ fontSize: '0.75rem', borderColor: '#cbd5e1', color: '#475569' }}
                >
                  <Coffee size={13} /> Mark as Weekend
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenBulkModal(AttendanceDayType.CompanyHoliday)}
                  style={{ fontSize: '0.75rem', borderColor: '#fde047', color: '#ca8a04' }}
                >
                  <Sun size={13} /> Mark as Holiday
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenBulkModal(AttendanceDayType.SpecialWorkingDay)}
                  style={{ fontSize: '0.75rem', borderColor: '#fde68a', color: '#d97706' }}
                >
                  <Calendar size={13} /> Special Working
                </button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedIds([])}
                  style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Search, Filter & Quick Selectors Toolbar */}
          <div className="glass-card" style={{ marginBottom: '1rem', padding: '0.85rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.8125rem' }}
                placeholder="Search date, day of week, holiday..."
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

            {/* Quick Bulk Selectors */}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.2rem' }}>
                Select:
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSelectWeekends}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                title="Select all Saturdays and Sundays"
              >
                Weekends
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSelectWeekdays}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                title="Select all Monday to Friday"
              >
                Weekdays
              </button>
            </div>

            {/* Day Type Filter Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.2rem' }}>
                Filter:
              </span>
              {[
                { label: 'All', value: 'ALL' },
                { label: 'Working', value: String(AttendanceDayType.WorkingDay) },
                { label: 'Weekend', value: String(AttendanceDayType.Weekend) },
                { label: 'Holiday', value: String(AttendanceDayType.CompanyHoliday) },
                { label: 'Optional', value: String(AttendanceDayType.OptionalHoliday) },
                { label: 'Special', value: String(AttendanceDayType.SpecialWorkingDay) },
              ].map(chip => {
                const isActive = filterDayType === chip.value;
                return (
                  <button
                    key={chip.value}
                    onClick={() => setFilterDayType(chip.value)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 600 : 500,
                      background: isActive ? 'var(--primary-tint)' : '#ffffff',
                      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      border: isActive ? '1px solid var(--primary)' : '1px solid #e2e8f0',
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

          {/* Sticky Header Table Container */}
          <div className="ui-card table-container" style={{ padding: 0, maxHeight: 'calc(100vh - 300px)', minHeight: '400px', overflowY: 'auto' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', position: 'sticky', top: 0, zIndex: 25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  {currentMonthName} {selectedYear} ({filteredDays.length} Dates)
                </h3>
                {isCurrentMonthActive && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, background: 'var(--primary-tint)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                    Current Month
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedIds.length > 0 ? `${selectedIds.length} of ${calendarDays.length} selected` : `Showing all ${calendarDays.length} calendar days`}
                </span>
              </div>
            </div>

            <table className="data-table sticky-table-header" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center', padding: '0.65rem 0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      title="Select all filtered dates"
                    />
                  </th>
                  <th style={{ width: '140px' }}>Date</th>
                  <th style={{ width: '110px' }}>Day</th>
                  <th style={{ width: '190px' }}>Day Type & Policy</th>
                  <th>Holiday Name & Remarks</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDays.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                      No calendar dates match search query "{searchQuery}" or selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredDays.map((day, index) => {
                    const dateObj = new Date(day.calendarDate);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const isToday = day.calendarDate.startsWith(todayIso);
                    const isSelected = selectedIds.includes(day.id);
                    const isWeekendDay = day.dayType === AttendanceDayType.Weekend;

                    return (
                      <tr
                        key={day.id}
                        id={`calendar-row-${day.calendarDate.slice(0, 10)}`}
                        className={`calendar-table-row ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                        style={{
                          background: isToday ? 'rgba(232, 135, 60, 0.06)' : isSelected ? 'rgba(232, 135, 60, 0.08)' : index % 2 === 0 ? '#ffffff' : '#fcfcfd',
                          borderLeft: isToday ? '3px solid var(--primary)' : '3px solid transparent'
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRowSelect(day.id)}
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        </td>

                        {/* Date Column with Today Highlight */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', color: isToday ? 'var(--primary)' : 'var(--text-main)' }}>
                              {formattedDate}
                            </span>
                            {isToday && (
                              <span style={{
                                backgroundColor: 'var(--primary)',
                                color: '#ffffff',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                              }}>
                                TODAY
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {day.calendarDate.slice(0, 10)}
                          </div>
                        </td>

                        {/* Day of Week */}
                        <td style={{ color: isWeekendDay ? '#64748b' : 'var(--text-main)', fontWeight: isWeekendDay ? 500 : 600, fontSize: '0.8125rem' }}>
                          {dayOfWeek}
                        </td>

                        {/* Day Type Badge */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}>
                            {getDayTypeBadge(day.dayType)}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {day.isWorkingDay ? '• Attendance Login Required' : '• Off / No Login Required'}
                            </span>
                          </div>
                        </td>

                        {/* Holiday & Remarks (Merged cleanly) */}
                        <td>
                          {day.holidayName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Sun size={13} color="#ca8a04" />
                              <strong style={{ color: 'var(--text-main)', fontSize: '0.8125rem' }}>{day.holidayName}</strong>
                            </div>
                          ) : null}

                          {day.description ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: day.holidayName ? '0.15rem' : '0' }}>
                              {day.description}
                            </div>
                          ) : !day.holidayName ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                          ) : null}
                        </td>

                        {/* Status / Published Indicator */}
                        <td>
                          {day.isPublished ? (
                            <span style={{ fontSize: '0.75rem', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                              <Lock size={12} /> Published
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <FileText size={12} /> Draft
                            </span>
                          )}
                        </td>

                        {/* Compact Row Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'center' }}>
                            <button
                              className="icon-action-btn"
                              onClick={() => openEditModal(day)}
                              title="Edit Day Type / Holiday"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="icon-action-btn"
                              onClick={() => openAuditLogs(day)}
                              title="View Audit Change History"
                            >
                              <History size={13} />
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

      {/* 5. Generate Calendar Modal */}
      {showGenerateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Generate {currentMonthName} {selectedYear} Calendar?
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowGenerateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              This will populate standard calendar dates for <strong>{currentMonthName} {selectedYear}</strong>:
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                <li>Monday – Friday → <strong>Working Days</strong></li>
                <li>Saturday & Sunday → <strong>Weekends</strong></li>
              </ul>
              <p style={{ marginTop: '0.75rem' }}>You can configure company holidays, optional holidays, and special weekend working days afterwards.</p>
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

      {/* 6. Publish Calendar Modal */}
      {showPublishModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={18} /> Publish {currentMonthName} {selectedYear} Calendar?
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPublishModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Once published, this calendar becomes the authoritative source of truth for:
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>✓ <strong>Attendance Login:</strong> Enforces login requirements on working days</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>✓ <strong>Leave Eligibility:</strong> Controls sandwich leave & holiday balances</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>✓ <strong>LOP Deductions:</strong> Calculates loss-of-pay penalties</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>✓ <strong>Payroll Engine:</strong> Feeds into monthly salary disbursement</div>
              </div>
              <p style={{ marginTop: '0.75rem', color: '#b45309', fontSize: '0.8rem' }}>
                * Any subsequent modifications will require an audit justification and re-evaluation of payroll logs.
              </p>
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

      {/* 7. Single Day Edit Modal */}
      {editingDay && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {editingDay.isPublished && <Lock size={16} color="var(--primary)" />}
                  {editingDay.isPublished ? 'Edit Published Date' : 'Edit Calendar Date'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {new Date(editingDay.calendarDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingDay(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Published Warning in Modal */}
            {editingDay.isPublished && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem', color: '#92400e', display: 'flex', gap: '0.5rem' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0, color: '#d97706', marginTop: '2px' }} />
                <div>
                  <strong>Published Calendar Entry:</strong> Modifying this date affects active leave balances and LOP calculations. An audit reason is mandatory.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Day Classification *</label>
                <select
                  className="form-select"
                  value={editDayType}
                  onChange={(e) => setEditDayType(parseInt(e.target.value) as AttendanceDayType)}
                >
                  <option value={AttendanceDayType.WorkingDay}>Working Day (Login Required)</option>
                  <option value={AttendanceDayType.Weekend}>Weekend (No Login Required)</option>
                  <option value={AttendanceDayType.CompanyHoliday}>Company Holiday (Declared Off)</option>
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
                    placeholder="e.g. Independence Day, New Year's Day"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Remarks / Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional context or memo..."
                />
              </div>

              {/* Published Audit Reason */}
              {editingDay.isPublished && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldAlert size={14} /> Reason for Change * (Audit Requirement)
                  </label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Explain why this published date is being changed (e.g. government declared holiday)..."
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
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

      {/* 8. Bulk Edit Modal */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Bulk Update ({selectedIds.length} Dates)
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Apply new day classification across all selected dates simultaneously.
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBulkModal(false)} disabled={bulkProcessing}>
                <X size={16} />
              </button>
            </div>

            {status?.isPublished && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem', color: '#92400e', display: 'flex', gap: '0.5rem' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0, color: '#d97706', marginTop: '2px' }} />
                <div>
                  <strong>Bulk Modifying Published Dates:</strong> Changes will generate individual audit records and trigger recalculation. A mandatory reason is required.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Set Day Classification To *</label>
                <select
                  className="form-select"
                  value={bulkDayType}
                  onChange={(e) => setBulkDayType(parseInt(e.target.value) as AttendanceDayType)}
                  disabled={bulkProcessing}
                >
                  <option value={AttendanceDayType.WorkingDay}>Working Day (Login Required)</option>
                  <option value={AttendanceDayType.Weekend}>Weekend (No Login Required)</option>
                  <option value={AttendanceDayType.CompanyHoliday}>Company Holiday (Declared Off)</option>
                  <option value={AttendanceDayType.OptionalHoliday}>Optional Holiday (Employee Opt-in)</option>
                  <option value={AttendanceDayType.SpecialWorkingDay}>Special Working Day (Weekend Override)</option>
                </select>
              </div>

              {(bulkDayType === AttendanceDayType.CompanyHoliday || bulkDayType === AttendanceDayType.OptionalHoliday) && (
                <div className="form-group">
                  <label className="form-label">Holiday Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bulkHolidayName}
                    onChange={(e) => setBulkHolidayName(e.target.value)}
                    placeholder="e.g. Festival Holidays"
                    disabled={bulkProcessing}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Description / Remarks (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={bulkDescription}
                  onChange={(e) => setBulkDescription(e.target.value)}
                  placeholder="Optional bulk memo or policy reference..."
                  disabled={bulkProcessing}
                />
              </div>

              {status?.isPublished && (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldAlert size={14} /> Reason for Bulk Change * (Mandatory)
                  </label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    placeholder="Reason for modifying these published dates..."
                    disabled={bulkProcessing}
                  />
                </div>
              )}

              {bulkProgress && (
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontWeight: 600 }}>
                    <span>Updating dates...</span>
                    <span>{bulkProgress.current} / {bulkProgress.total}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setShowBulkModal(false)} disabled={bulkProcessing}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExecuteBulkUpdate}
                disabled={bulkProcessing || (status?.isPublished && !bulkReason.trim())}
              >
                <span>{bulkProcessing ? 'Applying Changes...' : `Update ${selectedIds.length} Dates`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Audit Log Modal */}
      {showAuditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <History size={18} color="var(--primary)" />
                <span>{auditModalTitle}</span>
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAuditModal(false)}>
                <X size={16} />
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Info size={28} style={{ opacity: 0.4, marginBottom: '0.5rem', display: 'block', margin: '0 auto' }} />
                No change audits recorded for this date. Default configuration intact.
              </div>
            ) : (
              <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.changedByUserName || 'Administrator'}</span>
                      <span>{new Date(log.changedAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{log.oldDayTypeName}</span>
                      <ChevronRight size={14} color="var(--text-muted)" />
                      <span style={{ color: 'var(--primary)' }}>{log.newDayTypeName}</span>
                      {log.newHolidayName && <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>{log.newHolidayName}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: '#ffffff', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-xs)', border: '1px solid #e2e8f0' }}>
                      <strong>Audit Reason:</strong> "{log.reasonForChange}"
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
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
