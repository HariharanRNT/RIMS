import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';
import rntLogo from '../../assets/RNT-Logo.png';

interface FieldErrors {
  email?: string;
  password?: string;
}

interface PulseCell {
  id: number;
  status: 'present' | 'break' | 'leave';
  delay: string;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Field validation & interaction states
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [shakeState, setShakeState] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });

  // Server error banner state
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clock state
  const [timeStr, setTimeStr] = useState({ hours: '00', minutes: '00', seconds: '00' });
  const [dateMeta, setDateMeta] = useState({ day: 'THU', date: '20', month: 'AUG', year: '2026' });

  // Pulse grid cells
  const [cells, setCells] = useState<PulseCell[]>([]);

  // Refs for auto-focusing first invalid input
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Initialize clock ticker
  useEffect(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const updateTime = () => {
      const now = new Date();
      setTimeStr({
        hours: pad(now.getHours()),
        minutes: pad(now.getMinutes()),
        seconds: pad(now.getSeconds()),
      });

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      setDateMeta({
        day: days[now.getDay()],
        date: pad(now.getDate()),
        month: months[now.getMonth()],
        year: now.getFullYear().toString(),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize pulse grid cells once on mount
  useEffect(() => {
    const total = 48;
    const initialCells: PulseCell[] = [];
    for (let i = 0; i < total; i++) {
      const r = Math.random();
      let status: 'present' | 'break' | 'leave' = 'leave';
      if (r < 0.62) status = 'present';
      else if (r < 0.82) status = 'break';

      initialCells.push({
        id: i,
        status,
        delay: (Math.random() * 3).toFixed(2) + 's',
      });
    }
    setCells(initialCells);
  }, []);

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

  // Blur event handlers
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

  // Change handlers
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

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (emailErr || passErr) {
      setFieldErrors({ email: emailErr, password: passErr });
      setTouched({ email: true, password: true });
      setShakeState({ email: !!emailErr, password: !!passErr });

      setTimeout(() => setShakeState({ email: false, password: false }), 450);

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
    <div className="rims-login-container">
      <style>{`
        .rims-login-container {
          --login-ink: #F7F5F0;
          --login-panel: #FFFFFF;
          --login-panel-2: #EFECE5;
          --login-line: #DDD7CB;
          --login-stage-bg: #FCFAF7;
          --login-text: #211E1A;
          --login-text-dim: #736C5E;
          --login-amber: #C97223;
          --login-amber-soft: rgba(201, 114, 35, 0.24);
          --login-teal: #1F996C;
          --login-teal-soft: rgba(31, 153, 108, 0.24);
          --login-slate: #BCB6A8;

          background: var(--login-ink);
          color: var(--login-text);
          font-family: 'Inter', sans-serif;
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          position: fixed;
          inset: 0;
          z-index: 100;
        }

        /* ============ LEFT: LIVE PULSE CONSOLE ============ */
        .rims-console {
          position: relative;
          flex: 1.15;
          height: 100vh;
          background:
            radial-gradient(ellipse 900px 600px at 20% 0%, #EFECE5 0%, var(--login-ink) 70%),
            var(--login-ink);
          padding: clamp(24px, 4.2vh, 48px) clamp(32px, 4.5vw, 64px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid var(--login-line);
          box-shadow: 4px 0 24px -4px rgba(33, 30, 26, 0.04);
          min-width: 0;
          z-index: 2;
          overflow: hidden;
        }
        .rims-console::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--login-line) 1px, transparent 1px),
            linear-gradient(90deg, var(--login-line) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.45;
          mask-image: radial-gradient(ellipse 700px 500px at 20% 10%, black 0%, transparent 75%);
          pointer-events: none;
        }
        .rims-scanline {
          position: absolute;
          left: 0;
          right: 0;
          height: 120px;
          background: linear-gradient(180deg, transparent, rgba(31, 153, 108, 0.12), transparent);
          animation: rims-scan 7s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes rims-scan {
          0% { top: -10%; }
          50% { top: 95%; }
          100% { top: -10%; }
        }

        .rims-console-main {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .rims-brand {
          position: relative;
          display: flex;
          align-items: center;
          gap: 13px;
        }
        .rims-brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #FFFFFF;
          border: 1px solid var(--login-line);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(33, 30, 26, 0.05);
          padding: 5px;
        }
        .rims-brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .rims-brand-text .name {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 18px;
          letter-spacing: 0.01em;
          color: var(--login-text);
        }
        .rims-brand-text .sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          color: var(--login-text-dim);
          margin-top: 1px;
        }

        .rims-headline {
          position: relative;
          max-width: 420px;
          margin-top: clamp(20px, 3vh, 36px);
        }
        .rims-headline h1 {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: clamp(26px, 2.7vw, 38px);
          line-height: 1.14;
          letter-spacing: -0.01em;
          color: var(--login-text);
        }
        .rims-headline h1 em {
          font-style: italic;
          color: var(--login-amber);
        }
        .rims-headline p {
          margin-top: clamp(8px, 1.2vh, 12px);
          color: var(--login-text-dim);
          font-size: 13.5px;
          line-height: 1.55;
          max-width: 380px;
        }

        /* clock */
        .rims-clock-row {
          position: relative;
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-top: clamp(18px, 2.6vh, 30px);
        }
        .rims-clock {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(32px, 3.4vw, 44px);
          font-weight: 500;
          letter-spacing: 0.01em;
          color: var(--login-text);
        }
        .rims-clock .colon {
          animation: rims-blink 1s steps(1) infinite;
        }
        @keyframes rims-blink {
          50% { opacity: 0.15; }
        }
        .rims-clock-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--login-text-dim);
          line-height: 1.55;
          letter-spacing: 0.04em;
        }

        /* pulse grid */
        .rims-pulse-wrap {
          position: relative;
          margin-top: clamp(18px, 2.6vh, 30px);
        }
        .rims-pulse-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          color: var(--login-text-dim);
          text-transform: uppercase;
          margin-bottom: clamp(8px, 1.2vh, 12px);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rims-pulse-label .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--login-teal);
          box-shadow: 0 0 0 3px var(--login-teal-soft);
        }
        .rims-pulse-grid {
          display: grid;
          grid-template-columns: repeat(16, 1fr);
          gap: 5px;
          max-width: 390px;
        }
        .rims-cell {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 3px;
          background: var(--login-panel-2);
          border: 1px solid var(--login-line);
        }
        .rims-cell.present {
          background: rgba(31, 153, 108, 0.28);
          border-color: #1F996C;
          animation: rims-glow-teal 3.2s ease-in-out infinite;
        }
        .rims-cell.break {
          background: rgba(201, 114, 35, 0.28);
          border-color: #C97223;
          animation: rims-glow-amber 3.6s ease-in-out infinite;
        }
        .rims-cell.leave {
          background: rgba(188, 182, 168, 0.18);
          border-color: #D3CDC0;
        }
        @keyframes rims-glow-teal {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes rims-glow-amber {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }

        .rims-legend {
          position: relative;
          display: flex;
          gap: 20px;
          margin-top: clamp(10px, 1.4vh, 14px);
        }
        .rims-legend span {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--login-text-dim);
          font-family: 'JetBrains Mono', monospace;
        }
        .rims-legend i {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          display: inline-block;
        }
        .rims-legend .i-present { background: #1F996C; }
        .rims-legend .i-break { background: #C97223; }
        .rims-legend .i-leave { background: var(--login-slate); }

        .rims-console-foot {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: var(--login-text-dim);
          letter-spacing: 0.05em;
          padding-top: clamp(12px, 2vh, 20px);
        }

        /* ============ RIGHT: STAGE & FORM CARD ============ */
        .rims-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          padding: 32px;
          background: var(--login-stage-bg);
          overflow-y: auto;
          box-sizing: border-box;
        }
        .rims-card {
          width: 100%;
          max-width: 418px;
          background: #FFFFFF;
          border: 1px solid #E5E0D4;
          border-radius: 16px;
          padding: clamp(32px, 4.5vh, 42px) clamp(28px, 3.5vw, 36px);
          box-shadow:
            0 4px 6px -1px rgba(33, 30, 26, 0.03),
            0 16px 36px -4px rgba(33, 30, 26, 0.08);
          margin: auto;
        }
        .rims-card .eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.16em;
          color: var(--login-amber);
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .rims-card h2 {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 28px;
          letter-spacing: -0.01em;
          color: var(--login-text);
          line-height: 1.15;
        }
        .rims-card .desc {
          color: var(--login-text-dim);
          font-size: 13.5px;
          margin-top: 7px;
          line-height: 1.5;
        }

        .rims-auth-form {
          margin-top: 26px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .rims-field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #38342E;
          margin-bottom: 7px;
          letter-spacing: 0.01em;
        }
        .rims-field .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid #DCD6CA;
          border-radius: 9px;
          box-shadow: 0 1px 2px rgba(33, 30, 26, 0.04);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .rims-field .input-wrap:focus-within {
          border-color: var(--login-amber);
          box-shadow: 0 0 0 3px var(--login-amber-soft);
        }
        .rims-field .input-wrap.has-error {
          border-color: #ef4444;
          background-color: #fff5f5;
        }
        .rims-field .input-wrap.has-error:focus-within {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .rims-field .input-wrap svg.input-icon {
          margin-left: 13px;
          flex-shrink: 0;
          color: var(--login-text-dim);
        }
        .rims-field .input-wrap.has-error svg.input-icon {
          color: #dc2626;
        }
        .rims-field input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: var(--login-text);
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          padding: 12px 14px;
        }
        .rims-field input::placeholder {
          color: #ADA79A;
        }
        .rims-toggle-eye {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--login-text-dim);
          padding: 0 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }
        .rims-toggle-eye:hover {
          color: var(--login-text);
        }

        .rims-error-text {
          font-size: 11.5px;
          color: #dc2626;
          font-weight: 500;
          margin-top: 5px;
          display: block;
        }

        .rims-server-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem 0.9rem;
          border-radius: 9px;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          font-size: 0.825rem;
          font-weight: 500;
          animation: fadeIn 0.2s ease-in-out;
        }

        .rims-row-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: -2px;
        }
        .rims-remember {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--login-text-dim);
          cursor: pointer;
          user-select: none;
        }
        .rims-remember input {
          accent-color: var(--login-amber);
          width: 15px;
          height: 15px;
          cursor: pointer;
        }
        button.rims-forgot-link {
          background: none;
          border: none;
          font-size: 13px;
          color: var(--login-amber);
          text-decoration: none;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          font-weight: 500;
        }
        button.rims-forgot-link:hover {
          text-decoration: underline;
        }

        button.rims-submit {
          margin-top: 4px;
          background: linear-gradient(135deg, var(--login-amber), #B35E18);
          color: #FFFFFF;
          border: none;
          border-radius: 9px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 14.5px;
          padding: 13px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.12s ease, box-shadow 0.15s ease, opacity 0.15s ease;
          width: 100%;
          box-shadow: 0 4px 14px -2px rgba(201, 114, 35, 0.35);
        }
        button.rims-submit:hover:not(:disabled) {
          box-shadow: 0 8px 24px -4px rgba(201, 114, 35, 0.45);
          transform: translateY(-1px);
        }
        button.rims-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        button.rims-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        button.rims-submit:focus-visible {
          outline: 2px solid var(--login-amber);
          outline-offset: 2px;
        }

        .rims-fine {
          margin-top: 24px;
          text-align: center;
          font-size: 11px;
          color: #A1998A;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
        }

        /* Shake animation */
        .rims-shake {
          animation: rims-shake-kf 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes rims-shake-kf {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
          40%, 60% { transform: translate3d(3px, 0, 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .rims-clock .colon, .rims-cell.present, .rims-cell.break, .rims-scanline {
            animation: none !important;
          }
        }

        @media (max-width: 880px) {
          .rims-console {
            display: none;
          }
          .rims-stage {
            padding: 20px;
          }
          .rims-card {
            box-shadow: 0 4px 20px rgba(33, 30, 26, 0.06);
          }
        }
      `}</style>

      {/* LEFT: live workforce console */}
      <div className="rims-console">
        <div className="rims-scanline" />

        <div className="rims-console-main">
          <div className="rims-brand">
            <div className="rims-brand-mark">
              <img src={rntLogo} alt="RNT Logo" className="rims-brand-logo-img" />
            </div>
            <div className="rims-brand-text">
              {/* <div className="name">RIMS V2</div> */}
              <div className="sub">INTEGRATED&nbsp;INFORMATION&nbsp;SYSTEM</div>
            </div>
          </div>

          <div className="rims-headline">
            <h1>
              Every check-in,<br />
              <em>tracked live.</em>
            </h1>
            <p>Attendance, tasks, and leave — one console for the whole workforce, updating in real time.</p>
          </div>

          <div className="rims-clock-row">
            <div className="rims-clock" id="clock">
              {timeStr.hours}
              <span className="colon">:</span>
              {timeStr.minutes}
              <span className="colon">:</span>
              {timeStr.seconds}
            </div>
            <div className="rims-clock-meta" id="clockMeta">
              IST · {dateMeta.day}<br />
              {dateMeta.date} {dateMeta.month} {dateMeta.year}
            </div>
          </div>

          <div className="rims-pulse-wrap">
            <div className="rims-pulse-label">
              <span className="live-dot" />
              WORKFORCE STATUS — LIVE
            </div>
            <div className="rims-pulse-grid" id="pulseGrid">
              {cells.map(c => (
                <div
                  key={c.id}
                  className={`rims-cell ${c.status}`}
                  style={{ animationDelay: c.delay }}
                />
              ))}
            </div>
            <div className="rims-legend">
              <span><i className="i-present" />Present</span>
              <span><i className="i-break" />On break</span>
              <span><i className="i-leave" />On leave</span>
            </div>
          </div>
        </div>

        <div className="rims-console-foot">
          <span>Resh and Thosh Technologies Pvt Ltd.</span>

        </div>
      </div>

      {/* RIGHT: stage with vertically centered, elevated sign-in card */}
      <div className="rims-stage">
        <div className="rims-card">
          <div className="eyebrow">Admin Portal</div>
          <h2>Welcome back</h2>
          <div className="desc">Sign in with your email credentials to access your portal.</div>

          {serverError && (
            <div className="rims-server-banner" style={{ marginTop: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <span>{serverError}</span>
              </div>
              <button
                type="button"
                onClick={() => setServerError('')}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          <form className="rims-auth-form" onSubmit={handleSubmit} noValidate>
            <div className="rims-field">
              <label htmlFor="email">Email address</label>
              <div className={`input-wrap ${fieldErrors.email ? 'has-error' : ''} ${shakeState.email ? 'rims-shake' : ''}`}>
                <svg className="input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m2 7 10 6 10-6" />
                </svg>
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="admin@riims.local"
                  autoComplete="username"
                />
              </div>
              {fieldErrors.email && (
                <span className="rims-error-text">⚠️ {fieldErrors.email}</span>
              )}
            </div>

            <div className="rims-field">
              <label htmlFor="password">Password</label>
              <div className={`input-wrap ${fieldErrors.password ? 'has-error' : ''} ${shakeState.password ? 'rims-shake' : ''}`}>
                <svg className="input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="rims-toggle-eye"
                  id="eyeBtn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m2 2 20 20" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 1 11s4 7 11 7a9.26 9.26 0 0 0 5-1.94" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="rims-error-text">⚠️ {fieldErrors.password}</span>
              )}
            </div>

            <div className="rims-row-between">
              <label className="rims-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="rims-forgot-link"
                onClick={() => setShowForgotModal(true)}
              >
                Forgot password?
              </button>
            </div>

            <button className="rims-submit" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spin-animation" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          <div className="rims-fine">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Secured enterprise authentication</span>
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />
    </div>
  );
};
