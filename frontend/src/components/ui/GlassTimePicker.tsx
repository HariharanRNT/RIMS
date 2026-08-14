import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

interface GlassTimePickerProps {
  value: string; // 'HH:mm' 24-hour format e.g. '09:30' or '14:15'
  onChange: (timeStr: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

export const GlassTimePicker: React.FC<GlassTimePickerProps> = ({
  value,
  onChange,
  label,
  required,
  disabled,
  error,
  placeholder = 'Select time',
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

  // Helper to parse 'HH:mm' into 12h components
  const parseTime = (valStr: string) => {
    if (!valStr || !valStr.includes(':')) {
      return { hour12: '09', minute: '00', period: 'AM' };
    }
    const [hStr, mStr] = valStr.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    if (isNaN(h)) h = 9;
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;

    const formattedH = String(h12).padStart(2, '0');
    const formattedM = isNaN(m) ? '00' : String(m).padStart(2, '0');

    return { hour12: formattedH, minute: formattedM, period };
  };

  const { hour12: currentH, minute: currentM, period: currentP } = parseTime(value);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupHeight = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < popupHeight && rect.top > popupHeight;

      const popupWidth = 260;
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

  // Construct 'HH:mm' 24h format string
  const buildTimeString = (h12: string, min: string, p: string) => {
    let h = parseInt(h12, 10);
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;

    const formattedH24 = String(h).padStart(2, '0');
    return `${formattedH24}:${min}`;
  };

  const handleHourSelect = (h12: string) => {
    const timeStr = buildTimeString(h12, currentM, currentP);
    onChange(timeStr);
  };

  const handleMinuteSelect = (min: string) => {
    const timeStr = buildTimeString(currentH, min, currentP);
    onChange(timeStr);
  };

  const handlePeriodSelect = (p: string) => {
    const timeStr = buildTimeString(currentH, currentM, p);
    onChange(timeStr);
  };

  // Format displayed string e.g. "09:30 AM"
  const displayFormatted = value ? `${currentH}:${currentM} ${currentP}` : '';

  const hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      {label && (
        <label className="form-label" style={{ display: 'block', marginBottom: '0.3rem' }}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      {/* Trigger Display Button */}
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
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: error
            ? '1px solid var(--danger)'
            : isOpen
            ? '1px solid #E8873C'
            : '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: 'var(--radius-sm)',
          color: value ? '#F5F5F5' : 'rgba(255, 255, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          outline: 'none',
          boxShadow: isOpen ? '0 0 12px rgba(232, 135, 60, 0.3)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <span>{displayFormatted ? displayFormatted : placeholder}</span>
        <Clock
          size={16}
          style={{
            color: isOpen ? '#E8873C' : 'rgba(255, 255, 255, 0.6)',
            transition: 'color 0.15s ease',
          }}
        />
      </button>

      {/* Custom Portal Glass Time Picker Overlay */}
      {isOpen && !disabled &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
              width: '260px',
              background: 'rgba(20, 30, 28, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '16px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
              padding: '0.85rem',
              userSelect: 'none',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Header label */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Select Time
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(232, 135, 60, 0.15)',
                  border: '1px solid rgba(232, 135, 60, 0.3)',
                  color: '#E8873C',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>

            {/* 3 Column Scroll Grid (Hours : Minutes : AM/PM) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', height: '180px' }}>
              {/* Column 1: Hours */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto', paddingRight: '2px' }}>
                <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '0.2rem' }}>
                  HOUR
                </span>
                {hoursList.map((h) => {
                  const isSelected = currentH === h;
                  return (
                    <button
                      key={`h-${h}`}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      style={{
                        padding: '0.35rem 0',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 600 : 400,
                        borderRadius: '6px',
                        border: isSelected ? '1px solid rgba(232, 135, 60, 0.6)' : '1px solid transparent',
                        backgroundColor: isSelected ? 'rgba(232, 135, 60, 0.20)' : 'transparent',
                        color: isSelected ? '#E8873C' : 'rgba(255, 255, 255, 0.75)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>

              {/* Column 2: Minutes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto', paddingRight: '2px', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '0.3rem' }}>
                <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '0.2rem' }}>
                  MIN
                </span>
                {minutesList.map((m) => {
                  const isSelected = currentM === m;
                  return (
                    <button
                      key={`m-${m}`}
                      type="button"
                      onClick={() => handleMinuteSelect(m)}
                      style={{
                        padding: '0.35rem 0',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 600 : 400,
                        borderRadius: '6px',
                        border: isSelected ? '1px solid rgba(232, 135, 60, 0.6)' : '1px solid transparent',
                        backgroundColor: isSelected ? 'rgba(232, 135, 60, 0.20)' : 'transparent',
                        color: isSelected ? '#E8873C' : 'rgba(255, 255, 255, 0.75)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {/* Column 3: AM / PM */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', paddingLeft: '0.3rem' }}>
                <span style={{ fontSize: '0.675rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '0.2rem' }}>
                  PERIOD
                </span>
                {['AM', 'PM'].map((p) => {
                  const isSelected = currentP === p;
                  return (
                    <button
                      key={`p-${p}`}
                      type="button"
                      onClick={() => handlePeriodSelect(p)}
                      style={{
                        padding: '0.45rem 0',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 600 : 500,
                        borderRadius: '6px',
                        border: isSelected ? '1px solid rgba(232, 135, 60, 0.6)' : '1px solid transparent',
                        backgroundColor: isSelected ? 'rgba(232, 135, 60, 0.20)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#E8873C' : 'rgba(255, 255, 255, 0.75)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
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
