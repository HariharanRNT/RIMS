import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sliders,
  Sparkles,
  Gift,
  Award,
  Heart,
  Play,
  RotateCcw,
  Bell,
  Send,
  Timer,
  Info
} from 'lucide-react';
import { showIdleNotification } from '../../../utils/notificationUtils';

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
}

interface SegmentedPillOption {
  label: string;
  value: string;
}

// Custom Segmented Pill Group with Solid Accent Fill
const SegmentedPills: React.FC<{
  options: SegmentedPillOption[];
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div style={{
    display: 'flex',
    background: 'var(--panel-raised)',
    padding: '3px',
    borderRadius: '8px',
    gap: '3px',
    border: '1px solid var(--border)',
    width: '100%',
  }}>
    {options.map((opt) => {
      const isSelected = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: '0.35rem 0.4rem',
            minHeight: '34px',
            fontSize: '0.75rem',
            fontWeight: isSelected ? 700 : 500,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
            color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
            boxShadow: isSelected ? '0 1px 3px rgba(232, 135, 60, 0.3)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

// Custom Modern Rounded Toggle Switch
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}>
    <div
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '9999px',
        backgroundColor: checked ? 'var(--primary)' : 'var(--border-hover)',
        padding: '2px',
        transition: 'background-color 0.2s ease',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: checked ? '0 0 0 3px rgba(232, 135, 60, 0.2)' : 'none',
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          transform: checked ? 'translateX(20px)' : 'translateX(0px)',
          transition: 'transform 0.2s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        }}
      />
    </div>
    {label && (
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: checked ? 'var(--text-main)' : 'var(--text-secondary)' }}>
        {label}
      </span>
    )}
  </label>
);

// Unit Input Control with Integrated Muted Suffix
const UnitInput: React.FC<{
  value: string | number;
  onChange: (val: string) => void;
  unit: string;
  type?: string;
  min?: number | string;
  step?: number | string;
  placeholder?: string;
  required?: boolean;
}> = ({
  value,
  onChange,
  unit,
  type = 'number',
  min = '0',
  step = '1',
  placeholder = '',
  required = false,
}) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'var(--input)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden',
      height: '40px',
      maxWidth: '220px',
      boxShadow: 'var(--shadow-xs)',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    }}>
      <input
        type={type}
        min={min}
        step={step}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          padding: '0.45rem 0.75rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          background: 'transparent',
          width: '100%',
        }}
      />
      <div style={{
        padding: '0 0.75rem',
        background: 'var(--panel-raised)',
        borderLeft: '1px solid var(--border)',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.785rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
        {unit}
      </div>
    </div>
  );

export const SystemSettingsPage: React.FC = () => {
  const [settingsMap, setSettingsMap] = useState<{ [key: string]: SystemSetting }>({});
  const [initialSettings, setInitialSettings] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [testingTrigger, setTestingTrigger] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('');
  const [error, setError] = useState('');

  const defaultFallbackValues: { [key: string]: string } = {
    OfficeStartTime: '10:00 AM',
    OfficeEndTime: '07:00 PM',
    GraceMinutes: '15',
    PermissionHours: '1',
    MonthlyAllowedPermissions: '1',
    LateLoginsForHalfDay: '2',
    MonthlyAllowedLeave: '1',
    BirthdayWishesEnabled: 'true',
    BirthdayWishesChannel: 'Both',
    BirthdayWishesNotifyAllEmployees: 'true',
    CompanyAnniversaryWishesEnabled: 'true',
    CompanyAnniversaryWishesChannel: 'Both',
    CompanyAnniversaryWishesNotifyAllEmployees: 'true',
    MarriageAnniversaryWishesEnabled: 'true',
    MarriageAnniversaryWishesChannel: 'Both',
    MarriageAnniversaryWishesNotifyAllEmployees: 'false',
    TaskReminderFirstMinutes: '30',
    TaskReminderSecondMinutes: '15',
    TaskReminderCompletionEnabled: 'true',
    IdleNotificationEnabled: 'true',
    IdleThresholdMinutes: '5',
    IdleRepeatIntervalMinutes: '5',
  };

  const defaultKeys = [
    'OfficeStartTime',
    'OfficeEndTime',
    'GraceMinutes',
    'PermissionHours',
    'MonthlyAllowedPermissions',
    'LateLoginsForHalfDay',
    'MonthlyAllowedLeave',
    'BirthdayWishesEnabled',
    'BirthdayWishesChannel',
    'BirthdayWishesNotifyAllEmployees',
    'CompanyAnniversaryWishesEnabled',
    'CompanyAnniversaryWishesChannel',
    'CompanyAnniversaryWishesNotifyAllEmployees',
    'MarriageAnniversaryWishesEnabled',
    'MarriageAnniversaryWishesChannel',
    'MarriageAnniversaryWishesNotifyAllEmployees',
    'TaskReminderFirstMinutes',
    'TaskReminderSecondMinutes',
    'TaskReminderCompletionEnabled',
    'IdleNotificationEnabled',
    'IdleThresholdMinutes',
    'IdleRepeatIntervalMinutes'
  ];

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      if (res.data.success) {
        const map: { [key: string]: SystemSetting } = {};
        const initial: { [key: string]: string } = {};
        (res.data.data as SystemSetting[]).forEach(s => {
          map[s.key] = s;
          initial[s.key] = s.value;
        });

        // Ensure every known default key is populated in state with fallback if absent from DB
        defaultKeys.forEach(key => {
          if (!map[key]) {
            const fallback = defaultFallbackValues[key] ?? '';
            map[key] = { id: 0, key, value: fallback, description: '' };
            initial[key] = fallback;
          }
        });

        setSettingsMap(map);
        setInitialSettings(initial);
      }
    } catch {
      setError('Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const [testAlertMsg, setTestAlertMsg] = useState('');

  const handleTestIdleNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setTestAlertMsg('Browser notifications are not supported in this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showIdleNotification(
        '⏸ Test Idle Alert',
        'Idle notifications are working properly! You will receive alerts when idle.',
        'idle-test-' + Date.now()
      );
      setTestAlertMsg('✅ Test notification sent! Check your screen/notification tray.');
    } else if (perm === 'denied') {
      setTestAlertMsg('❌ Notifications blocked. Please allow notifications in your browser address bar (lock icon).');
    } else {
      setTestAlertMsg('⚠️ Notification permission not granted.');
    }
    setTimeout(() => setTestAlertMsg(''), 7000);
  };

  const handleChange = (key: string, value: string) => {
    setJustSaved(false);
    setSettingsMap(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { id: 0, key, description: '' }),
        value
      }
    }));
  };

  const handleReset = () => {
    const map: { [key: string]: SystemSetting } = {};
    Object.keys(initialSettings).forEach(key => {
      map[key] = {
        ...(settingsMap[key] || { id: 0, key, description: '' }),
        value: initialSettings[key]
      };
    });
    setSettingsMap(map);
    setJustSaved(false);
    setError('');
  };

  // Track if any setting has unsaved changes
  const hasUnsavedChanges = defaultKeys.some(
    key => (settingsMap[key]?.value ?? '') !== (initialSettings[key] ?? '')
  );

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const promises = defaultKeys.map(key => {
        const val = settingsMap[key]?.value ?? defaultFallbackValues[key] ?? '';
        return apiClient.put(`/settings/${key}`, { value: val });
      });

      await Promise.all(promises);
      setJustSaved(true);
      fetchSettings();
      window.dispatchEvent(new Event('settings-changed'));
      window.dispatchEvent(new Event('activity-changed'));

      setTimeout(() => {
        setJustSaved(false);
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update system settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1150px', width: '100%', margin: '0 auto', paddingBottom: '5rem', zoom: '90%' }}>
      {/* Compact Page Header */}
      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)'
            }}>
              <Sliders size={20} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              System Settings
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
            Configure office timings, attendance, permissions, LOP rules, and employee celebrations.
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 500
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="ui-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading system settings...
        </div>
      ) : (
        <form onSubmit={handleSaveAll} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* TOP ROW: Office Timing & Attendance & Permission Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '1.5rem',
            alignItems: 'stretch'
          }}>
            {/* Card 1: Office Timing */}
            <div className="ui-card" style={{
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-tint)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Clock size={18} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Office Timing
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                Configure the official working hours and employee login grace period.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                {/* Office Start Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                    Office Start Time
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Official employee login start time
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    style={{
                      height: '40px',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      maxWidth: '240px',
                    }}
                    value={settingsMap['OfficeStartTime']?.value ?? ''}
                    onChange={(e) => handleChange('OfficeStartTime', e.target.value)}
                    placeholder="10:00 AM"
                    required
                  />
                </div>

                {/* Office End Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                    Office End Time
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Official office closing time
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    style={{
                      height: '40px',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      maxWidth: '240px',
                    }}
                    value={settingsMap['OfficeEndTime']?.value ?? ''}
                    onChange={(e) => handleChange('OfficeEndTime', e.target.value)}
                    placeholder="07:00 PM"
                    required
                  />
                </div>

                <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }} />

                {/* Grace Minutes with Suffix */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                    Grace Minutes
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Allowed grace period after office start
                  </span>
                  <UnitInput
                    value={settingsMap['GraceMinutes']?.value ?? ''}
                    onChange={(val) => handleChange('GraceMinutes', val)}
                    unit="min"
                    placeholder="15"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Attendance & Permission */}
            <div className="ui-card" style={{
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-tint)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShieldCheck size={18} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Attendance & Permission
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                Configure late-login permission durations, monthly caps, and half-day rules.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                {/* Time-Based Settings Group */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {/* Permission Hours */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                      Permission Hours
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Late-login duration cap
                    </span>
                    <UnitInput
                      value={settingsMap['PermissionHours']?.value ?? ''}
                      onChange={(val) => handleChange('PermissionHours', val)}
                      unit="hour"
                      step="0.5"
                      placeholder="1"
                      required
                    />
                  </div>

                  {/* Monthly Allowed Permissions */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                      Monthly Permissions
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Allowed per employee / mo
                    </span>
                    <UnitInput
                      value={settingsMap['MonthlyAllowedPermissions']?.value ?? '1'}
                      onChange={(val) => handleChange('MonthlyAllowedPermissions', val)}
                      unit="reqs / mo"
                      placeholder="1"
                      required
                    />
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border)', margin: '0.15rem 0' }} />

                {/* Count-Based LOP Settings Group */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {/* Late Logins For Half Day */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                      Late Logins For Half Day
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Unapproved logins for 0.5 LOP
                    </span>
                    <UnitInput
                      value={settingsMap['LateLoginsForHalfDay']?.value ?? ''}
                      onChange={(val) => handleChange('LateLoginsForHalfDay', val)}
                      unit="logins"
                      min="1"
                      placeholder="2"
                      required
                    />
                  </div>

                  {/* Monthly Allowed Leave */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                      Monthly Allowed Leave
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Paid leave days allowed / mo
                    </span>
                    <UnitInput
                      value={settingsMap['MonthlyAllowedLeave']?.value ?? '1'}
                      onChange={(val) => handleChange('MonthlyAllowedLeave', val)}
                      unit="day / mo"
                      placeholder="1"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2b: Task Reminder Notifications */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1.5rem',
            alignItems: 'stretch'
          }}>
            <div className="ui-card" style={{
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  color: '#06B6D4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Timer size={18} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Task Reminder Notifications
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                Configure browser notifications that alert employees before their planned task effort runs out.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {/* First Reminder */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                      First Reminder
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Alert before planned end time
                    </span>
                    <UnitInput
                      value={settingsMap['TaskReminderFirstMinutes']?.value ?? '30'}
                      onChange={(val) => handleChange('TaskReminderFirstMinutes', val)}
                      unit="min"
                      min="1"
                      step="1"
                      placeholder="30"
                      required
                    />
                  </div>

                  {/* Second Reminder */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                      Second Reminder
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Final alert before planned end
                    </span>
                    <UnitInput
                      value={settingsMap['TaskReminderSecondMinutes']?.value ?? '15'}
                      onChange={(val) => handleChange('TaskReminderSecondMinutes', val)}
                      unit="min"
                      min="1"
                      step="1"
                      placeholder="15"
                      required
                    />
                  </div>

                  {/* Completion Alert Toggle */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                      Completion Alert
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                      Notify when planned duration is fully reached
                    </span>
                    <div style={{ paddingTop: '0.35rem' }}>
                      <ToggleSwitch
                        checked={(settingsMap['TaskReminderCompletionEnabled']?.value ?? 'true') === 'true'}
                        onChange={(val) => handleChange('TaskReminderCompletionEnabled', val ? 'true' : 'false')}
                        label={((settingsMap['TaskReminderCompletionEnabled']?.value ?? 'true') === 'true') ? 'Enabled' : 'Disabled'}
                      />
                    </div>
                  </div>
                </div>

                {/* Inline Validation Warning */}
                {(() => {
                  const first = parseInt(settingsMap['TaskReminderFirstMinutes']?.value || '30', 10);
                  const second = parseInt(settingsMap['TaskReminderSecondMinutes']?.value || '15', 10);
                  if (!isNaN(first) && !isNaN(second) && second >= first) {
                    return (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--danger)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}>
                        <AlertCircle size={14} />
                        <span>Second reminder ({second} min) must be less than first reminder ({first} min).</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>

          {/* SECTION: ⏸️ Idle Time Notifications */}
          <div className="ui-card" style={{
            padding: '1.75rem',
            borderRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Idle Time Notifications
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.15rem 0 0 0' }}>
                    Configure automatic repeating browser alerts for employee continuous idle time.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {testAlertMsg && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: testAlertMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>
                    {testAlertMsg}
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={handleTestIdleNotification}
                  title="Test sending a browser notification to verify permissions and alerts"
                >
                  <Bell size={14} />
                  <span>Test Notification</span>
                </button>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '1.5rem', lineHeight: '1.45' }}>
              Employees will receive a desktop browser notification when continuous inactivity reaches the threshold, repeating at the configured interval until activity resumes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* Enable Idle Notifications Toggle */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                    Enable Idle Notifications
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Master on/off switch for idle alerts
                  </span>
                  <div style={{ paddingTop: '0.35rem' }}>
                    <ToggleSwitch
                      checked={(settingsMap['IdleNotificationEnabled']?.value ?? 'true') === 'true'}
                      onChange={(val) => handleChange('IdleNotificationEnabled', val ? 'true' : 'false')}
                      label={((settingsMap['IdleNotificationEnabled']?.value ?? 'true') === 'true') ? 'Enabled' : 'Disabled'}
                    />
                  </div>
                </div>

                {/* Idle Threshold */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                    Idle Threshold
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Continuous idle before first alert
                  </span>
                  <UnitInput
                    value={settingsMap['IdleThresholdMinutes']?.value ?? '5'}
                    onChange={(val) => handleChange('IdleThresholdMinutes', val)}
                    unit="min"
                    min="1"
                    step="1"
                    placeholder="5"
                    required
                  />
                </div>

                {/* Repeat Interval */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                    Repeat Interval
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Interval between repeat alerts while idle
                  </span>
                  <UnitInput
                    value={settingsMap['IdleRepeatIntervalMinutes']?.value ?? '5'}
                    onChange={(val) => handleChange('IdleRepeatIntervalMinutes', val)}
                    unit="min"
                    min="1"
                    step="1"
                    placeholder="5"
                    required
                  />
                </div>
              </div>

              {/* Informational Guidance */}
              {(() => {
                const isEnabled = (settingsMap['IdleNotificationEnabled']?.value ?? 'true') === 'true';
                const thresh = parseInt(settingsMap['IdleThresholdMinutes']?.value || '5', 10);
                const repeat = parseInt(settingsMap['IdleRepeatIntervalMinutes']?.value || '5', 10);

                if (isEnabled && !isNaN(thresh) && !isNaN(repeat) && thresh > 0 && repeat > 0) {
                  return (
                    <div style={{
                      background: 'rgba(217, 119, 6, 0.08)',
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                      color: 'var(--text-main)',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                    }}>
                      <Info size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                      <span>
                        Alert schedule: First alert at <strong>{thresh} min</strong> of continuous idle, then repeating every <strong>{repeat} min</strong> (e.g., {thresh}m, {thresh + repeat}m, {thresh + repeat * 2}m...) until employee resumes activity.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* SECTION 3: 🎉 Employee Celebration Settings */}
          <div className="ui-card" style={{
            padding: '1.75rem',
            borderRadius: '12px',
          }}>
            {/* Header with Test Run Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-tint)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Employee Celebration Settings
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.15rem 0 0 0' }}>
                    Configure automated notifications and delivery channels for employee milestones.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {celebrationMsg && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'var(--success-bg)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: 'var(--success-text)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.3rem 0.65rem',
                    borderRadius: '8px',
                    animation: 'fadeIn 0.2s ease-in-out',
                  }}>
                    <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                    <span>{celebrationMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.785rem',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    borderRadius: '8px',
                    padding: '0 1rem',
                    fontWeight: 600,
                  }}
                  onClick={async () => {
                    setTestingTrigger(true);
                    setCelebrationMsg('');
                    setError('');
                    try {
                      const res = await apiClient.post('/celebration/trigger-now?force=true');
                      if (res.data.success) {
                        setCelebrationMsg(res.data.data.message || 'Celebration check complete!');
                        setTimeout(() => setCelebrationMsg(''), 5000);
                      }
                    } catch (e: any) {
                      setError(e.response?.data?.message || 'Failed to execute celebration check.');
                    } finally {
                      setTestingTrigger(false);
                    }
                  }}
                  disabled={testingTrigger}
                >
                  <Play size={14} />
                  <span>{testingTrigger ? 'Running Job...' : 'Test Run Celebrations Now'}</span>
                </button>
              </div>
            </div>

            {/* Responsive styles for 3-column grid */}
            <style>{`
              @media (max-width: 900px) {
                .celebration-cards-grid {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>

            {/* 3 Celebration Cards Grid — 3 equal columns in single row */}
            <div
              className="celebration-cards-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.15rem',
                marginTop: '1.25rem',
              }}
            >
              {/* 1. Birthday Wishes Card */}
              <div style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.1rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xs)',
              }}>
                {/* Header with Circular Colored Badge + Title + Top-Right Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(236, 72, 153, 0.12)',
                      color: '#EC4899',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Gift size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Birthday Wishes
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Annual Greeting</span>
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={(settingsMap['BirthdayWishesEnabled']?.value ?? 'true') === 'true'}
                    onChange={(val) => handleChange('BirthdayWishesEnabled', val ? 'true' : 'false')}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                  {/* Send Through */}
                  <div>
                    <label style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.35rem',
                    }}>
                      <Send size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span>Send Through:</span>
                    </label>
                    <SegmentedPills
                      value={settingsMap['BirthdayWishesChannel']?.value ?? 'Both'}
                      onChange={(val) => handleChange('BirthdayWishesChannel', val)}
                      options={[
                        { label: 'RIMS', value: 'RIMS' },
                        { label: 'Email', value: 'Email' },
                        { label: 'Both', value: 'Both' },
                      ]}
                    />
                  </div>

                  {/* Notify All Employees */}
                  <div>
                    <label style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.35rem',
                    }}>
                      <Bell size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span>Notify All Employees:</span>
                    </label>
                    <SegmentedPills
                      value={settingsMap['BirthdayWishesNotifyAllEmployees']?.value ?? 'true'}
                      onChange={(val) => handleChange('BirthdayWishesNotifyAllEmployees', val)}
                      options={[
                        { label: 'Yes (All Staff)', value: 'true' },
                        { label: 'No (Self & Admin)', value: 'false' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Work Anniversary Card */}
              <div style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.1rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xs)',
              }}>
                {/* Header with Circular Colored Badge + Title + Top-Right Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(234, 179, 8, 0.12)',
                      color: '#EAB308',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Award size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Work Anniversary
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Work Anniversary</span>
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={(settingsMap['CompanyAnniversaryWishesEnabled']?.value ?? 'true') === 'true'}
                    onChange={(val) => handleChange('CompanyAnniversaryWishesEnabled', val ? 'true' : 'false')}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                  {/* Send Through */}
                  <div>
                    <label style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.35rem',
                    }}>
                      <Send size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span>Send Through:</span>
                    </label>
                    <SegmentedPills
                      value={settingsMap['CompanyAnniversaryWishesChannel']?.value ?? 'Both'}
                      onChange={(val) => handleChange('CompanyAnniversaryWishesChannel', val)}
                      options={[
                        { label: 'RIMS', value: 'RIMS' },
                        { label: 'Email', value: 'Email' },
                        { label: 'Both', value: 'Both' },
                      ]}
                    />
                  </div>

                  {/* Notify All Employees */}
                  <div>
                    <label style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.35rem',
                    }}>
                      <Bell size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span>Notify All Employees:</span>
                    </label>
                    <SegmentedPills
                      value={settingsMap['CompanyAnniversaryWishesNotifyAllEmployees']?.value ?? 'true'}
                      onChange={(val) => handleChange('CompanyAnniversaryWishesNotifyAllEmployees', val)}
                      options={[
                        { label: 'Yes (All Staff)', value: 'true' },
                        { label: 'No (Self & Admin)', value: 'false' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Wedding Anniversary Card */}
              <div style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.1rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-xs)',
              }}>
                {/* Header with Circular Colored Badge + Title + Top-Right Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      color: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Heart size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Wedding Anniversary
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Wedding Greeting</span>
                    </div>
                  </div>

                  <ToggleSwitch
                    checked={(settingsMap['MarriageAnniversaryWishesEnabled']?.value ?? 'true') === 'true'}
                    onChange={(val) => handleChange('MarriageAnniversaryWishesEnabled', val ? 'true' : 'false')}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                  {/* Send Through */}
                  <div>
                    <label style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.35rem',
                    }}>
                      <Send size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span>Send Through:</span>
                    </label>
                    <SegmentedPills
                      value={settingsMap['MarriageAnniversaryWishesChannel']?.value ?? 'Both'}
                      onChange={(val) => handleChange('MarriageAnniversaryWishesChannel', val)}
                      options={[
                        { label: 'RIMS', value: 'RIMS' },
                        { label: 'Email', value: 'Email' },
                        { label: 'Both', value: 'Both' },
                      ]}
                    />
                  </div>

                  {/* Notify All Employees */}
                  <div>
                    <label style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.35rem',
                    }}>
                      <Bell size={12} style={{ color: 'var(--text-secondary)' }} />
                      <span>Notify All Employees:</span>
                    </label>
                    <SegmentedPills
                      value={settingsMap['MarriageAnniversaryWishesNotifyAllEmployees']?.value ?? 'false'}
                      onChange={(val) => handleChange('MarriageAnniversaryWishesNotifyAllEmployees', val)}
                      options={[
                        { label: 'Yes (All Staff)', value: 'true' },
                        { label: 'No (Self & Admin)', value: 'false' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Save Actions Bar */}
          <div style={{
            position: 'sticky',
            bottom: '1.25rem',
            zIndex: 100,
            background: 'var(--panel)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '0.85rem 1.5rem',
            boxShadow: 'var(--shadow-lg), 0 10px 25px -5px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginTop: '2rem',
            transition: 'all 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {justSaved ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'var(--success-bg)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: 'var(--success-text)',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  animation: 'fadeIn 0.25s ease-in-out',
                }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <span>All system settings updated successfully!</span>
                </div>
              ) : hasUnsavedChanges ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--warning-bg)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'var(--warning-text)',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)', display: 'inline-block' }} />
                  <span>Unsaved changes</span>
                </div>
              ) : (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--panel-raised)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
                  <span>All settings up to date</span>
                </div>
              )}

              {hasUnsavedChanges && !justSaved && (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.785rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    textDecoration: 'underline',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset Changes</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || (!hasUnsavedChanges && !justSaved)}
                style={{
                  height: '42px',
                  padding: '0 1.75rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: justSaved ? 'var(--success)' : undefined,
                  boxShadow: (hasUnsavedChanges || justSaved) ? '0 2px 10px rgba(232, 135, 60, 0.3)' : 'none',
                  opacity: (!hasUnsavedChanges && !saving && !justSaved) ? 0.6 : 1,
                  cursor: (!hasUnsavedChanges && !saving && !justSaved) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {saving ? (
                  <>
                    <Save size={16} className="spin-animation" />
                    <span>Saving Settings...</span>
                  </>
                ) : justSaved ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Settings Saved!</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
