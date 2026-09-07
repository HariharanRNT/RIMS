import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'segmented';
  className?: string;
  style?: React.CSSProperties;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  className = '',
  style,
}) => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (variant === 'segmented') {
    return (
      <div
        className={`theme-segmented-control ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'var(--panel-raised)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '2px',
          gap: '2px',
          ...style,
        }}
        role="group"
        aria-label="Theme selection"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`theme-segment-btn ${theme === 'light' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            fontSize: '0.75rem',
            fontWeight: theme === 'light' ? 600 : 500,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: theme === 'light' ? 'var(--panel)' : 'transparent',
            color: theme === 'light' ? 'var(--primary)' : 'var(--text-dim)',
            boxShadow: theme === 'light' ? 'var(--shadow-xs)' : 'none',
            transition: 'all 0.15s ease',
          }}
          title="Light Theme"
        >
          <Sun size={14} />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`theme-segment-btn ${theme === 'dark' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            fontSize: '0.75rem',
            fontWeight: theme === 'dark' ? 600 : 500,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            background: theme === 'dark' ? 'var(--panel)' : 'transparent',
            color: theme === 'dark' ? 'var(--primary)' : 'var(--text-dim)',
            boxShadow: theme === 'dark' ? 'var(--shadow-xs)' : 'none',
            transition: 'all 0.15s ease',
          }}
          title="Dark Theme"
        >
          <Moon size={14} />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', ...style }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`theme-toggle-btn ${className}`}
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            height: '34px',
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-main)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
          }}
          title={`Current theme: ${theme === 'light' ? 'Light' : 'Dark'}. Click to change.`}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {theme === 'light' ? (
            <Sun size={15} style={{ color: '#E8873C' }} />
          ) : (
            <Moon size={15} style={{ color: '#38BDF8' }} />
          )}
          <span style={{ textTransform: 'capitalize' }}>{theme}</span>
        </button>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '140px',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)',
              padding: '4px',
              zIndex: 1000,
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                fontSize: '0.785rem',
                fontWeight: theme === 'light' ? 600 : 500,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: theme === 'light' ? 'var(--panel-raised)' : 'transparent',
                color: theme === 'light' ? 'var(--primary)' : 'var(--text-main)',
                transition: 'all 0.12s ease',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sun size={14} style={{ color: '#E8873C' }} />
                <span>Light</span>
              </div>
              {theme === 'light' && <Check size={14} style={{ color: 'var(--primary)' }} />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                fontSize: '0.785rem',
                fontWeight: theme === 'dark' ? 600 : 500,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: theme === 'dark' ? 'var(--panel-raised)' : 'transparent',
                color: theme === 'dark' ? 'var(--primary)' : 'var(--text-main)',
                transition: 'all 0.12s ease',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Moon size={14} style={{ color: '#38BDF8' }} />
                <span>Dark</span>
              </div>
              {theme === 'dark' && <Check size={14} style={{ color: 'var(--primary)' }} />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default button variant
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme (Currently: ${theme})`}
      aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        width: '34px',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme === 'dark' ? '#E8873C' : '#676D7A',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: 'var(--shadow-xs)',
        ...style,
      }}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
};

