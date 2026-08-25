import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';

export type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  isAlert?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  showAlert: (options: ConfirmOptions | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const normalizedOptions: ConfirmOptions =
      typeof opts === 'string' ? { message: opts, type: 'warning' } : opts;

    setOptions({
      title: normalizedOptions.title || 'Confirm Action',
      message: normalizedOptions.message,
      confirmText: normalizedOptions.confirmText || 'Confirm',
      cancelText: normalizedOptions.cancelText || 'Cancel',
      type: normalizedOptions.type || 'danger',
      isAlert: false,
    });

    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const showAlert = useCallback((opts: ConfirmOptions | string): Promise<void> => {
    const normalizedOptions: ConfirmOptions =
      typeof opts === 'string' ? { message: opts, type: 'danger' } : opts;

    setOptions({
      title: normalizedOptions.title || 'Action Blocked',
      message: normalizedOptions.message,
      confirmText: normalizedOptions.confirmText || 'OK',
      cancelText: '',
      type: normalizedOptions.type || 'danger',
      isAlert: true,
    });

    setIsOpen(true);

    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  };

  // Keyboard shortcut: Esc to cancel, Enter to confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getTypeStyles = () => {
    switch (options.type) {
      case 'danger':
        return {
          icon: <AlertTriangle size={24} color="#dc2626" />,
          iconBg: '#fef2f2',
          iconBorder: '#fecaca',
          confirmBtnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          confirmBtnHover: '#b91c1c',
          confirmBtnShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
        };
      case 'warning':
        return {
          icon: <AlertCircle size={24} color="#d97706" />,
          iconBg: '#fffbeb',
          iconBorder: '#fde68a',
          confirmBtnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          confirmBtnHover: '#b45309',
          confirmBtnShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={24} color="#059669" />,
          iconBg: '#ecfdf5',
          iconBorder: '#a7f3d0',
          confirmBtnBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          confirmBtnHover: '#047857',
          confirmBtnShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
        };
      case 'info':
      default:
        return {
          icon: <Info size={24} color="#E8873C" />,
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          confirmBtnBg: 'linear-gradient(135deg, #E8873C 0%, #d4782f 100%)',
          confirmBtnHover: '#c26620',
          confirmBtnShadow: '0 4px 14px rgba(232, 135, 60, 0.35)',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <ConfirmContext.Provider value={{ confirm, showAlert }}>
      {children}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.25rem',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04)',
              padding: '1.75rem',
              color: '#0f172a',
              overflow: 'hidden',
              animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCancel}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#334155';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Header & Icon */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: styles.iconBg,
                  border: `1px solid ${styles.iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {styles.icon}
              </div>

              <div style={{ flex: 1, paddingRight: '1rem' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {options.title}
                </h3>
                <p
                  style={{
                    margin: '0.5rem 0 0 0',
                    fontSize: '0.885rem',
                    color: '#64748b',
                    lineHeight: '1.5',
                  }}
                >
                  {options.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                marginTop: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              {!options.isAlert && (
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '0.625rem 1.15rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#475569',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.color = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  {options.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                style={{
                  padding: '0.625rem 1.35rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: styles.confirmBtnBg,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: styles.confirmBtnShadow,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.filter = 'brightness(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.filter = 'none';
                }}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
