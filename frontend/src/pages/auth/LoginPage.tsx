import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, AlertCircle, Mail, Lock, Eye, EyeOff, Loader2, X } from 'lucide-react';
import rntLogo from '../../assets/RNT-Logo.png';

interface FieldErrors {
  email?: string;
  password?: string;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Field validation & interaction states
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [shakeState, setShakeState] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });

  // Server error banner state
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Refs for auto-focusing first invalid input
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Helper validators
  const validateEmail = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return 'Email address is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Enter a valid email address';
    return '';
  };

  const validatePassword = (val: string): string => {
    if (!val) return 'Password is required';
    if (val.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  // Blur event handlers (validate when user leaves field)
  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    const err = validateEmail(email);
    setFieldErrors(prev => ({ ...prev, email: err }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    const err = validatePassword(password);
    setFieldErrors(prev => ({ ...prev, password: err }));
  };

  // Change handlers (clear/re-validate live as user fixes error)
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (touched.email || fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: validateEmail(val) }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (touched.password || fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: validatePassword(val) }));
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    // Validate all fields simultaneously on submit
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (emailErr || passErr) {
      setFieldErrors({ email: emailErr, password: passErr });
      setTouched({ email: true, password: true });
      setShakeState({ email: !!emailErr, password: !!passErr });

      // Reset shake animation after 400ms
      setTimeout(() => setShakeState({ email: false, password: false }), 450);

      // Auto-focus first invalid field
      if (emailErr) {
        emailInputRef.current?.focus();
      } else if (passErr) {
        passwordInputRef.current?.focus();
      }
      return;
    }

    setLoading(true);

    try {
      const user = await login(email.trim(), password);
      if (user.mustChangePassword) {
        navigate('/change-password');
      } else if (user.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      {/* Single Centered Glass Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        borderRadius: '20px',
        padding: '2.5rem 2.25rem',
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.12)',
        animation: 'fadeIn 0.25s ease-in-out'
      }}>
        
        {/* 1. Small Centered RIMS Logo Icon */}
        <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.10)',
            padding: '5px',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 6px 16px rgba(232, 135, 60, 0.15)'
          }}>
            <img src={rntLogo} alt="RNT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        {/* 2. RIMS V2 Heading + Small Subtitle */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>
            RIMS V2
          </h1>
          <p style={{ color: '#E8873C', fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.05em', marginTop: '0.2rem' }}>
            INTEGRATED INFORMATION SYSTEM
          </p>
        </div>

        {/* 3. Welcome Back Heading + Subtitle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.825rem', lineHeight: 1.4 }}>
            Sign in with your email credentials to access your portal.
          </p>
        </div>

        {/* Server Auth Error Banner */}
        {serverError && (
          <div style={{
            background: 'rgba(240, 96, 96, 0.12)',
            border: '1px solid rgba(240, 96, 96, 0.30)',
            color: '#FF7B7B',
            padding: '0.7rem 0.9rem',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            fontSize: '0.825rem',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{serverError}</span>
            </div>
            <button
              type="button"
              onClick={() => setServerError('')}
              style={{ background: 'none', border: 'none', color: '#FF7B7B', cursor: 'pointer', padding: 0 }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* 4. Email Address Field */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
              Email Address
            </label>
            <div className={shakeState.email ? 'shake-field' : ''} style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: fieldErrors.email ? '#FF7B7B' : 'rgba(255,255,255,0.35)',
                transition: 'color 0.2s ease'
              }} />
              <input
                ref={emailInputRef}
                type="email"
                className="form-input"
                style={{
                  paddingLeft: '2.6rem',
                  borderRadius: '12px',
                  borderColor: fieldErrors.email ? 'rgba(240,96,96,0.5)' : 'rgba(255,255,255,0.15)',
                  backgroundColor: fieldErrors.email ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)',
                  fontSize: '0.875rem',
                  height: '42px',
                  transition: 'all 0.2s ease'
                }}
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="admin@riims.local"
              />
            </div>
            {fieldErrors.email && (
              <span style={{ fontSize: '0.75rem', color: '#FF7B7B', fontWeight: 500, marginTop: '0.3rem', display: 'block' }}>
                ⚠️ {fieldErrors.email}
              </span>
            )}
          </div>

          {/* 5. Password Field */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.825rem' }}>
              Password
            </label>
            <div className={shakeState.password ? 'shake-field' : ''} style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: fieldErrors.password ? '#FF7B7B' : 'rgba(255,255,255,0.35)',
                transition: 'color 0.2s ease'
              }} />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{
                  paddingLeft: '2.6rem',
                  paddingRight: '2.6rem',
                  borderRadius: '12px',
                  borderColor: fieldErrors.password ? 'rgba(240,96,96,0.5)' : 'rgba(255,255,255,0.15)',
                  backgroundColor: fieldErrors.password ? 'rgba(240,96,96,0.06)' : 'rgba(255,255,255,0.07)',
                  fontSize: '0.875rem',
                  height: '42px',
                  transition: 'all 0.2s ease'
                }}
                value={password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
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
                  color: 'rgba(255,255,255,0.35)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ fontSize: '0.75rem', color: '#FF7B7B', fontWeight: 500, marginTop: '0.3rem', display: 'block' }}>
                ⚠️ {fieldErrors.password}
              </span>
            )}
          </div>

          {/* 6. Remember Me & Forgot Password Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#E8873C', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span>Remember me</span>
            </label>

            <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact system administrator to reset your password.'); }} style={{ color: '#E8873C', fontWeight: 600, textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>

          {/* 7. Sign In Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '12px',
              background: loading ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)',
              borderColor: 'rgba(232,135,60,0.4)',
              fontSize: '0.9rem',
              fontWeight: 700,
              boxShadow: loading ? 'none' : '0 8px 20px -3px rgba(232, 135, 60, 0.35)',
              marginTop: '0.4rem',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>

          {/* 8. Small Muted Footer Text */}
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            🔒 Secured enterprise authentication • RIMS v2.0
          </div>
        </form>
      </div>
    </div>
  );
};
