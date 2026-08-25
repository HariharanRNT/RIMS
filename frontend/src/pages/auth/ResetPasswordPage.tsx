import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Check, X } from 'lucide-react';
import apiClient from '../../api/client';
import rntLogo from '../../assets/RNT-Logo.png';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

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
    if (newPassword.length === 0) return { label: 'Empty', color: 'rgba(255,255,255,0.3)', width: '0%' };
    if (validRulesCount <= 1) return { label: 'Weak', color: '#EF4444', width: '33%' };
    if (validRulesCount <= 3) return { label: 'Medium', color: '#F59E0B', width: '66%' };
    return { label: 'Strong', color: '#10B981', width: '100%' };
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
        backgroundColor: '#f5f7fa',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
          border: '1px solid #e5e7eb',
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
              background: '#f8f9fa',
              padding: '5px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <img src={rntLogo} alt="RNT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        {validatingToken ? (
          /* State 1: Token Validation Loader */
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Loader2 size={36} className="spin-animation" style={{ color: '#E8873C', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
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
                background: '#fef2f2',
                border: '1px solid #fecaca',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
              Link Expired or Invalid
            </h3>

            <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
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
                  background: '#ffffff',
                  borderColor: '#e5e7eb',
                  color: '#374151',
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
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
              Password Reset Successfully!
            </h3>

            <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Your password has been updated. You can now log in using your new credentials.
            </p>

            <div
              style={{
                background: '#fff4e6',
                border: '1px solid #fed7aa',
                color: '#E8873C',
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
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Set New Password
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.825rem', marginTop: '0.3rem' }}>
                Create a strong password for your portal account.
              </p>
            </div>

            {serverError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
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
                <label className="form-label" style={{ fontWeight: 600, color: '#111827', fontSize: '0.825rem' }}>
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
                      color: '#9ca3af',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{
                      paddingLeft: '2.6rem',
                      paddingRight: '2.6rem',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      borderColor: '#e5e7eb',
                      color: '#111827',
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
                      color: '#9ca3af',
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
                <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                    <span style={{ color: '#6b7280' }}>Password Strength:</span>
                    <strong style={{ color: strength.color }}>{strength.label}</strong>
                  </div>
                  <div style={{ height: '4px', width: '100%', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.65rem' }}>
                    <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.25s ease' }} />
                  </div>

                  {/* Rules Checklist */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.725rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasMinLength ? '#059669' : '#9ca3af' }}>
                      {hasMinLength ? <Check size={12} /> : <X size={12} />}
                      <span>Min 8 characters</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasUppercase ? '#059669' : '#9ca3af' }}>
                      {hasUppercase ? <Check size={12} /> : <X size={12} />}
                      <span>1 Uppercase letter</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasNumber ? '#059669' : '#9ca3af' }}>
                      {hasNumber ? <Check size={12} /> : <X size={12} />}
                      <span>1 Number (0-9)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasSymbol ? '#059669' : '#9ca3af' }}>
                      {hasSymbol ? <Check size={12} /> : <X size={12} />}
                      <span>1 Special character</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm Password Field */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#111827', fontSize: '0.825rem' }}>
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
                      color: '#9ca3af',
                    }}
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{
                      paddingLeft: '2.6rem',
                      paddingRight: '2.6rem',
                      borderRadius: '12px',
                      borderColor: confirmPassword && !passwordsMatch ? '#ef4444' : '#e5e7eb',
                      backgroundColor: confirmPassword && !passwordsMatch ? '#fef2f2' : '#ffffff',
                      color: '#111827',
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
                      color: '#9ca3af',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500, marginTop: '0.3rem', display: 'block' }}>
                    ⚠️ Passwords do not match
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  background: loading || validRulesCount < 4 || !passwordsMatch ? '#e5e7eb' : 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)',
                  borderColor: 'rgba(232,135,60,0.4)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  boxShadow: loading || validRulesCount < 4 || !passwordsMatch ? 'none' : '0 8px 20px -3px rgba(232, 135, 60, 0.35)',
                  cursor: loading || validRulesCount < 4 || !passwordsMatch ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.4rem',
                }}
                disabled={loading || validRulesCount < 4 || !passwordsMatch}
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
            </form>
          </>
        )}
      </div>

      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />
    </div>
  );
};
