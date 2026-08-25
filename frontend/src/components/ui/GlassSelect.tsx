import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface GlassSelectOption {
  value: string | number;
  label: string;
  isAction?: boolean;
  dividerAbove?: boolean;
}

interface GlassSelectProps {
  options: GlassSelectOption[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  searchable?: boolean;
  style?: React.CSSProperties;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  required,
  disabled,
  error,
  searchable = false,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 200,
    openUpward: false,
  });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = searchable && searchQuery.trim() !== ''
    ? options.filter((opt) => opt.isAction || opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupHeight = Math.min(280, filteredOptions.length * 38 + (searchable ? 55 : 20));
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < popupHeight && rect.top > popupHeight;

      setCoords({
        top: openUpward ? Math.max(10, rect.top - popupHeight - 6) : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        openUpward,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
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
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      {label && (
        <label className="form-label" style={{ display: 'block', marginBottom: '0.3rem' }}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      {/* Trigger Button */}
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
          color: selectedOption ? (selectedOption.isAction ? '#E8873C' : '#111827') : '#9ca3af',
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
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: isOpen ? '#E8873C' : '#6b7280',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease, color 0.15s ease',
            flexShrink: 0,
            marginLeft: '0.5rem',
          }}
        />
      </button>

      {/* Portal Options Panel */}
      {isOpen && !disabled &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '280px',
              display: 'flex',
              flexDirection: 'column',
              padding: '0.35rem 0',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {searchable && (
              <div style={{ padding: '0.35rem 0.5rem 0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type="text"
                  placeholder="Type to filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.785rem',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  const isAction = opt.isAction;
                  return (
                    <div
                      key={String(opt.value)}
                      onClick={() => handleSelect(opt.value)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.8125rem',
                        color: isAction
                          ? '#E8873C'
                          : isSelected
                          ? '#E8873C'
                          : '#374151',
                        backgroundColor: isSelected ? '#fff4e6' : 'transparent',
                        borderLeft: isSelected ? '3px solid #E8873C' : '3px solid transparent',
                        borderTop: opt.dividerAbove ? '1px solid #f0f0f0' : 'none',
                        marginTop: opt.dividerAbove ? '0.35rem' : 0,
                        paddingTop: opt.dividerAbove ? '0.65rem' : '0.65rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: isAction || isSelected ? 600 : 400,
                        transition: 'background-color 0.12s ease, color 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.color = isAction ? '#d4782f' : '#111827';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = isAction
                            ? '#E8873C'
                            : '#374151';
                        }
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} style={{ color: '#E8873C', marginLeft: '0.5rem' }} />}
                    </div>
                  );
                })
              )}
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
