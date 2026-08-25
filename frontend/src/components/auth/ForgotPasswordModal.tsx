import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2, X, ArrowLeft } from 'lucide-react';
import apiClient from '../../api/client';
import rntLogo from '../../assets/RNT-Logo.png';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  if (!isOpen) return null;

  const validateEmailFormat = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return 'Email address is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Enter a valid email address';
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError) {
      setEmailError(validateEmailFormat(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const err = validateEmailFormat(email);
    if (err) {
      setEmailError(err);
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err: any) {
      if (err.response?.status === 429 || err.response?.data?.message?.includes('Too many')) {
        setServerError('Too many reset requests. Please wait 15 minutes before trying again.');
      } else {
        // Generic success to prevent account enumeration even on client error
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetState = () => {
    setEmail('');
    setEmailError('');
    setSubmitted(false);
    setServerError('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={handleResetState}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2.25rem 2rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          position: 'relative',
          userSelect: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={handleResetState}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          <X size={16} />
        </button>

        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#f8f9fa',
              padding: '4px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <img src={rntLogo} alt="RNT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        {!submitted ? (
          <>
            {/* Title & Subtitle */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Reset Password
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.825rem', lineHeight: 1.45, marginTop: '0.4rem' }}>
                Enter your registered email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Error Banner */}
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
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#111827', fontSize: '0.825rem' }}>
                  Registered Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: emailError ? '#dc2626' : '#9ca3af',
                      transition: 'color 0.2s ease',
                    }}
                  />
                  <input
                    type="email"
                    className="form-input"
                    style={{
                      paddingLeft: '2.6rem',
                      borderRadius: '12px',
                      borderColor: emailError ? '#ef4444' : '#e5e7eb',
                      backgroundColor: emailError ? '#fef2f2' : '#ffffff',
                      color: '#111827',
                      fontSize: '0.875rem',
                      height: '42px',
                    }}
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="e.g. employee@riims.local"
                  />
                </div>
                {emailError && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500, marginTop: '0.3rem', display: 'block' }}>
                    ⚠️ {emailError}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)',
                  borderColor: 'rgba(232,135,60,0.4)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  boxShadow: loading ? 'none' : '0 8px 20px -3px rgba(232, 135, 60, 0.35)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin-animation" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Generic Success Confirmation State */
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
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
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
              Check Your Email
            </h3>

            <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              If an account exists with <strong style={{ color: '#111827' }}>{email}</strong>, a password reset link has been dispatched to your inbox.
            </p>

            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                textAlign: 'left',
                fontSize: '0.775rem',
                color: '#6b7280',
                marginBottom: '1.5rem',
                lineHeight: 1.45,
              }}
            >
              💡 <strong>Note:</strong> The link expires in 30 minutes. If you don't see it in a few minutes, check your spam or junk folder.
            </div>

            <button
              type="button"
              onClick={handleResetState}
              className="btn btn-secondary"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '12px',
                background: '#ffffff',
                borderColor: '#e5e7eb',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
