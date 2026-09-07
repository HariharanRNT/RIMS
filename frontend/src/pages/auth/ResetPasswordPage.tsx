import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Check, X } from 'lucide-react';
import apiClient from '../../api/client';
import rntLogo from '../../assets/RNT-Logo.png';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';
import { ThemeToggle } from '../../components/layout/ThemeToggle';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  // Token validation state
  const [validatingToken, setValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Redirect
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Forgot Password modal fallback state
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Password rules evaluation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const validRulesCount = [hasMinLength, hasUppercase, hasNumber, hasSymbol].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: 'Empty', color: 'var(--border)', width: '0%' };
    if (validRulesCount <= 1) return { label: 'Weak', color: 'var(--danger)', width: '33%' };
    if (validRulesCount <= 3) return { label: 'Medium', color: 'var(--warning)', width: '66%' };
    return { label: 'Strong', color: 'var(--success)', width: '100%' };
  };

  const strength = getStrengthLabel();

  // Validate Token on Mount
  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setIsTokenValid(false);
        setValidatingToken(false);
        return;
      }

      try {
        const res = await apiClient.get(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
        if (res.data.success && res.data.data === true) {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
        }
      } catch {
        setIsTokenValid(false);
      } finally {
        setValidatingToken(false);
      }
    };

    checkToken();
  }, [token]);

  // Handle Auto Redirect Countdown on Reset Success
  useEffect(() => {
    if (resetComplete) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [resetComplete, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (validRulesCount < 4) {
      setServerError('Please ensure all password strength requirements are met.');
      return;
    }

    if (!passwordsMatch) {
      setServerError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
        confirmPassword,
      });

      if (res.data.success) {
        setResetComplete(true);
      } else {
        setServerError(res.data.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to reset password. The token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-app)',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        position: 'relative',
      }}
    >
      {/* Floating Theme Switcher */}
      <div style={{ position: 'fixed', top: '18px', right: '18px', zIndex: 1000 }}>
        <ThemeToggle variant="button" />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--panel)',
          borderRadius: '20px',
          padding: '2.5rem 2.25rem',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          animation: 'fadeIn 0.25s ease-in-out',
        }}
      >
        {/* RIMS Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'var(--panel-raised)',
              padding: '5px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <img src={rntLogo} alt="RNT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        {validatingToken ? (
          /* State 1: Token Validation Loader */
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Loader2 size={36} className="spin-animation" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Validating reset link...
            </h3>
          </div>
        ) : !isTokenValid ? (
          /* State 2: Invalid / Expired Token Error Screen */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--danger-bg)',
                border: '1px solid rgba(216, 64, 74, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger)',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Link Expired or Invalid
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
              This password reset link has expired, already been used, or is invalid. Please request a new one to reset your password.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)',
                  borderColor: 'rgba(232,135,60,0.4)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                }}
              >
                Request New Link
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'var(--panel-raised)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : resetComplete ? (
          /* State 3: Reset Success Screen */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--success-bg)',
                border: '1px solid rgba(21, 154, 99, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Password Reset Successfully!
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Your password has been updated. You can now log in using your new credentials.
            </p>

            <div
              style={{
                background: 'var(--primary-tint)',
                border: '1px solid rgba(232, 135, 60, 0.3)',
                color: 'var(--primary)',
                padding: '0.75rem',
                borderRadius: '12px',
                fontSize: '0.825rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
              }}
            >
              Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)',
                borderColor: 'rgba(232,135,60,0.4)',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>Go to Login Now</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          /* State 4: Reset Password Form */
          <>
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Set New Password
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '0.3rem' }}>
                Create a strong password for your portal account.
              </p>
            </div>

            {serverError && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(216, 64, 74, 0.3)',
                  color: 'var(--danger-text)',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '12px',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* New Password Field */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{
                      paddingLeft: '2.6rem',
                      paddingRight: '2.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'var(--input)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem',
                      height: '42px',
                    }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div style={{ background: 'var(--panel-raised)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Password Strength:</span>
                    <strong style={{ color: strength.color }}>{strength.label}</strong>
                  </div>
                  <div style={{ height: '4px', width: '100%', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.65rem' }}>
                    <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.25s ease' }} />
                  </div>

                  {/* Rules Checklist */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.725rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasMinLength ? 'var(--success)' : 'var(--text-muted)' }}>
                      {hasMinLength ? <Check size={12} /> : <X size={12} />}
                      <span>Min 8 characters</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasUppercase ? 'var(--success)' : 'var(--text-muted)' }}>
                      {hasUppercase ? <Check size={12} /> : <X size={12} />}
                      <span>1 Uppercase letter</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasNumber ? 'var(--success)' : 'var(--text-muted)' }}>
                      {hasNumber ? <Check size={12} /> : <X size={12} />}
                      <span>1 Number (0-9)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasSymbol ? 'var(--success)' : 'var(--text-muted)' }}>
                      {hasSymbol ? <Check size={12} /> : <X size={12} />}
                      <span>1 Special character</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm Password Field */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{
                      paddingLeft: '2.6rem',
                      paddingRight: '2.6rem',
                      borderRadius: '12px',
                      borderColor: confirmPassword && !passwordsMatch ? 'var(--danger)' : 'var(--border)',
                      backgroundColor: confirmPassword && !passwordsMatch ? 'var(--danger-bg)' : 'var(--input)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem',
                      height: '42px',
                    }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500, marginTop: '0.3rem', display: 'block' }}>
                    ⚠️ Passwords do not match
                  </span>
                )}
              </div>

              {/* Submit Button */}
              {(() => {
                const isSubmitDisabled = loading || validRulesCount < 4 || !passwordsMatch;
                return (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '12px',
                      background: isSubmitDisabled ? 'var(--panel-raised)' : 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)',
                      border: isSubmitDisabled ? '1px solid var(--border)' : '1px solid rgba(232,135,60,0.4)',
                      color: isSubmitDisabled ? 'var(--text-muted)' : '#ffffff',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      boxShadow: isSubmitDisabled ? 'none' : '0 8px 20px -3px rgba(232, 135, 60, 0.35)',
                      cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginTop: '0.4rem',
                      transition: 'all 0.2s ease',
                    }}
                    disabled={isSubmitDisabled}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="spin-animation" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        <span>Reset Password</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </form>
          </>
        )}
      </div>

      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />
    </div>
  );
};
