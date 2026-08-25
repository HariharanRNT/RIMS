import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface GlassDatePickerProps {
  value: string; // ISO format 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  minDate?: string | Date;
  maxDate?: string | Date;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  style?: React.CSSProperties;
}

export const GlassDatePicker: React.FC<GlassDatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date',
  label,
  required,
  disabled,
  error,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    openUpward: false,
  });

  // Parse current date value or default to current month/year
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()
  );

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupHeight = 350;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < popupHeight && rect.top > popupHeight;

      const popupWidth = 280;
      let left = rect.left;
      if (left + popupWidth > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - popupWidth - 10);
      }

      setCoords({
        top: openUpward ? Math.max(10, rect.top - popupHeight - 6) : rect.bottom + 6,
        left,
        openUpward,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Normalize minDate & maxDate strings YYYY-MM-DD
  const normalizeDateStr = (d?: string | Date): string => {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0];
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const minStr = normalizeDateStr(minDate);
  const maxStr = normalizeDateStr(maxDate);
  const todayStr = normalizeDateStr(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (yyyy: number, mm: number, dd: number) => {
    const monthFormatted = String(mm + 1).padStart(2, '0');
    const dayFormatted = String(dd).padStart(2, '0');
    const dateStr = `${yyyy}-${monthFormatted}-${dayFormatted}`;

    if (minStr && dateStr < minStr) return;
    if (maxStr && dateStr > maxStr) return;

    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    if (minStr && todayStr < minStr) return;
    if (maxStr && todayStr > maxStr) return;
    onChange(todayStr);
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Calendar matrix calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const calendarCells: Array<{ year: number; month: number; day: number; isCurrentMonth: boolean }> = [];

  // Trailing days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarCells.push({ year: prevY, month: prevM, day: prevMonthDays - i, isCurrentMonth: false });
  }

  // Days in current month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push({ year: viewYear, month: viewMonth, day, isCurrentMonth: true });
  }

  // Leading days for next month to complete 35 or 42 grid cells
  const totalGridCells = calendarCells.length > 35 ? 42 : 35;
  const remainingCells = totalGridCells - calendarCells.length;
  for (let day = 1; day <= remainingCells; day++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarCells.push({ year: nextY, month: nextM, day, isCurrentMonth: false });
  }

  const isNextMonthDisabled = maxStr
    ? normalizeDateStr(new Date(viewYear, viewMonth + 1, 1)) > maxStr
    : false;
  const isPrevMonthDisabled = minStr
    ? normalizeDateStr(new Date(viewYear, viewMonth, 0)) < minStr
    : false;

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      {label && (
        <label className="form-label" style={{ display: 'block', marginBottom: '0.3rem' }}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      {/* Trigger Input Display Box */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.55rem 0.85rem',
          fontSize: '0.8125rem',
          fontFamily: 'inherit',
          background: '#ffffff',
          border: error
            ? '1px solid var(--danger)'
            : isOpen
            ? '1px solid #E8873C'
            : '1px solid #e5e7eb',
          borderRadius: 'var(--radius-sm)',
          color: value ? '#111827' : '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(232, 135, 60, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <span>{value ? value : placeholder}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              style={{
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              title="Clear date"
            >
              <X size={14} />
            </span>
          )}
          <CalendarIcon
            size={16}
            style={{
              color: isOpen ? '#E8873C' : '#6b7280',
              transition: 'color 0.15s ease',
            }}
          />
        </div>
      </button>

      {/* Custom Portal Calendar Overlay */}
      {isOpen && !disabled &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
              width: '280px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '0.85rem',
              userSelect: 'none',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Header Controls: Month/Year Nav + Quick Links */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <button
                type="button"
                disabled={isPrevMonthDisabled}
                onClick={handlePrevMonth}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  color: isPrevMonthDisabled ? '#d1d5db' : '#374151',
                  padding: '0.3rem',
                  cursor: isPrevMonthDisabled ? 'not-allowed' : 'pointer',
                  opacity: isPrevMonthDisabled ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                {monthNames[viewMonth]} {viewYear}
              </span>

              <button
                type="button"
                disabled={isNextMonthDisabled}
                onClick={handleNextMonth}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  color: isNextMonthDisabled ? '#d1d5db' : '#374151',
                  padding: '0.3rem',
                  cursor: isNextMonthDisabled ? 'not-allowed' : 'pointer',
                  opacity: isNextMonthDisabled ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Action Links */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', padding: '0 0.2rem' }}>
              <button
                type="button"
                onClick={handleSelectToday}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#E8873C',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '0.725rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear
              </button>
            </div>

            {/* Day of Week Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.2rem',
                textAlign: 'center',
                marginBottom: '0.4rem',
              }}
            >
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <span key={d} style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
              {calendarCells.map((cell, idx) => {
                const mFormatted = String(cell.month + 1).padStart(2, '0');
                const dFormatted = String(cell.day).padStart(2, '0');
                const cellDateStr = `${cell.year}-${mFormatted}-${dFormatted}`;

                const isSelected = value === cellDateStr;
                const isToday = cellDateStr === todayStr;

                const isBeforeMin = minStr ? cellDateStr < minStr : false;
                const isAfterMax = maxStr ? cellDateStr > maxStr : false;
                const isDisabled = isBeforeMin || isAfterMax || !cell.isCurrentMonth;

                return (
                  <button
                    key={`${cellDateStr}-${idx}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDate(cell.year, cell.month, cell.day)}
                    style={{
                      height: '32px',
                      width: '100%',
                      fontSize: '0.785rem',
                      fontFamily: 'inherit',
                      fontWeight: isSelected ? 600 : cell.isCurrentMonth ? 500 : 400,
                      borderRadius: '8px',
                      border: isSelected
                        ? '1px solid #E8873C'
                        : isToday && cell.isCurrentMonth
                        ? '1px solid #E8873C'
                        : '1px solid transparent',
                      backgroundColor: isSelected
                        ? '#fff4e6'
                        : 'transparent',
                      color: isSelected
                        ? '#E8873C'
                        : isDisabled
                        ? '#d1d5db'
                        : cell.isCurrentMonth
                        ? '#111827'
                        : '#d1d5db',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.35 : 1,
                      pointerEvents: isDisabled ? 'none' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.12s ease',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled && !isSelected) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.color = '#111827';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDisabled && !isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = cell.isCurrentMonth
                          ? '#111827'
                          : '#d1d5db';
                      }
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {error && (
        <span style={{ fontSize: '0.725rem', color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
};
