import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { Save, AlertCircle, CheckCircle, Clock, ShieldCheck, Sliders, Sparkles, Gift, Award, Heart, Play } from 'lucide-react';

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
}

export const SystemSettingsPage: React.FC = () => {
  const [settingsMap, setSettingsMap] = useState<{ [key: string]: SystemSetting }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTrigger, setTestingTrigger] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      if (res.data.success) {
        const map: { [key: string]: SystemSetting } = {};
        (res.data.data as SystemSetting[]).forEach(s => {
          map[s.key] = s;
        });
        setSettingsMap(map);
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

  const handleChange = (key: string, value: string) => {
    setSettingsMap(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { id: 0, key, description: '' }),
        value
      }
    }));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

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
      'MarriageAnniversaryWishesNotifyAllEmployees'
    ];

    try {
      const promises = defaultKeys.map(key => {
        const val = settingsMap[key]?.value || '';
        return apiClient.put(`/settings/${key}`, { value: val });
      });

      await Promise.all(promises);
      setMessage('All system settings updated successfully!');
      fetchSettings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update system settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1150px', width: '100%', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Compact Page Header */}
      <div className="header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)'
            }}>
              <Sliders size={18} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              System Settings
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '0.15rem' }}>
            Configure office timings, attendance, permission and late-login LOP rules.
          </p>
        </div>
      </div>

      {/* Message Banners */}
      {message && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--success)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 500
        }}>
          <CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

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
        <div className="ui-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading system settings...
        </div>
      ) : (
        <form onSubmit={handleSaveAll}>
          {/* Responsive 2-Column Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            {/* Card 1: Office Timing */}
            <div className="ui-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                  <Clock size={20} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Office Timing
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.775rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                Configure the official working hours and employee login grace period.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Office Start Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                    Office Start Time
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Official employee login start time
                  </span>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--border-color)',
                        fontSize: '0.85rem',
                        paddingLeft: '0.85rem'
                      }}
                      value={settingsMap['OfficeStartTime']?.value ?? ''}
                      onChange={(e) => handleChange('OfficeStartTime', e.target.value)}
                      placeholder="10:00 AM"
                      required
                    />
                  </div>
                </div>

                {/* Office End Time */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                    Office End Time
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Official office closing time
                  </span>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--border-color)',
                        fontSize: '0.85rem',
                        paddingLeft: '0.85rem'
                      }}
                      value={settingsMap['OfficeEndTime']?.value ?? ''}
                      onChange={(e) => handleChange('OfficeEndTime', e.target.value)}
                      placeholder="07:00 PM"
                      required
                    />
                  </div>
                </div>

                {/* Grace Minutes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                    Grace Minutes
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Allowed grace period after office start
                  </span>
                  <div style={{ width: '100%', maxWidth: '200px' }}>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                      value={settingsMap['GraceMinutes']?.value ?? ''}
                      onChange={(e) => handleChange('GraceMinutes', e.target.value)}
                      placeholder="15"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Attendance & Permission */}
            <div className="ui-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Attendance & Permission
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.775rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                Configure late-login permission and half-day rules.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Permission Hours */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                    Permission Hours
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Monthly late-login permission duration limit (hours)
                  </span>
                  <div style={{ width: '100%', maxWidth: '200px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="form-input"
                      style={{
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                      value={settingsMap['PermissionHours']?.value ?? ''}
                      onChange={(e) => handleChange('PermissionHours', e.target.value)}
                      placeholder="1"
                      required
                    />
                  </div>
                </div>

                {/* Monthly Allowed Permissions */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                    Monthly Allowed Permissions
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Number of permission requests allowed per employee per month before excess late logins apply.
                  </span>
                  <div style={{ width: '100%', maxWidth: '200px' }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input"
                      style={{
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                      value={settingsMap['MonthlyAllowedPermissions']?.value ?? '1'}
                      onChange={(e) => handleChange('MonthlyAllowedPermissions', e.target.value)}
                      placeholder="1"
                      required
                    />
                  </div>
                </div>

                {/* Late Logins For Half Day */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                    Late Logins For Half Day
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Unpermissioned late logins required for half-day LOP
                  </span>
                  <div style={{ width: '100%', maxWidth: '200px' }}>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                      value={settingsMap['LateLoginsForHalfDay']?.value ?? ''}
                      onChange={(e) => handleChange('LateLoginsForHalfDay', e.target.value)}
                      placeholder="2"
                      required
                    />
                  </div>
                </div>

                {/* Monthly Allowed Leave */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.825rem' }}>
                    Monthly Allowed Leave
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Number of leave days allowed for each employee per month before LOP is applied.
                  </span>
                  <div style={{ width: '100%', maxWidth: '200px' }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input"
                      style={{
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                      value={settingsMap['MonthlyAllowedLeave']?.value ?? '1'}
                      onChange={(e) => handleChange('MonthlyAllowedLeave', e.target.value)}
                      placeholder="1"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: 🎉 Employee Celebration Settings */}
            <div className="ui-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center' }}>
                    <Sparkles size={22} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    🎉 Employee Celebration Settings
                  </h3>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.775rem', height: '36px', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                  onClick={async () => {
                    setTestingTrigger(true);
                    setMessage('');
                    setError('');
                    try {
                      const res = await apiClient.post('/celebration/trigger-now?force=true');
                      if (res.data.success) {
                        setMessage(res.data.data.message || 'Celebration check complete!');
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.785rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                Configure automated wishes and delivery channels for birthdays, company anniversaries, and marriage anniversaries.
              </p>

              {/* 3 Columns Grid for Celebration Categories */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.25rem' }}>
                {/* 1. Birthday Wishes */}
                <div style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Gift size={18} color="#ec4899" />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Birthday Wishes
                      </h4>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      <input
                        type="checkbox"
                        checked={(settingsMap['BirthdayWishesEnabled']?.value ?? 'true') === 'true'}
                        onChange={(e) => handleChange('BirthdayWishesEnabled', e.target.checked ? 'true' : 'false')}
                      />
                      Enable
                    </label>
                  </div>

                  {/* Send Through */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Send Through:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['RIIMS', 'Email', 'Both'].map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => handleChange('BirthdayWishesChannel', channel)}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: (settingsMap['BirthdayWishesChannel']?.value ?? 'Both') === channel
                              ? '2px solid #8b5cf6'
                              : '1px solid var(--border-color)',
                            backgroundColor: (settingsMap['BirthdayWishesChannel']?.value ?? 'Both') === channel
                              ? 'rgba(139, 92, 246, 0.1)'
                              : 'transparent',
                            color: (settingsMap['BirthdayWishesChannel']?.value ?? 'Both') === channel
                              ? '#7c3aed'
                              : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {channel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notify All Employees */}
                  <div>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Notify All Employees:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { label: 'Yes (All Staff)', value: 'true' },
                        { label: 'No (Self & Admin)', value: 'false' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('BirthdayWishesNotifyAllEmployees', opt.value)}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: (settingsMap['BirthdayWishesNotifyAllEmployees']?.value ?? 'true') === opt.value
                              ? '2px solid #3b82f6'
                              : '1px solid var(--border-color)',
                            backgroundColor: (settingsMap['BirthdayWishesNotifyAllEmployees']?.value ?? 'true') === opt.value
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'transparent',
                            color: (settingsMap['BirthdayWishesNotifyAllEmployees']?.value ?? 'true') === opt.value
                              ? '#2563eb'
                              : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Company Anniversary Wishes */}
                <div style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Award size={18} color="#eab308" />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Company Anniversary
                      </h4>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      <input
                        type="checkbox"
                        checked={(settingsMap['CompanyAnniversaryWishesEnabled']?.value ?? 'true') === 'true'}
                        onChange={(e) => handleChange('CompanyAnniversaryWishesEnabled', e.target.checked ? 'true' : 'false')}
                      />
                      Enable
                    </label>
                  </div>

                  {/* Send Through */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Send Through:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['RIIMS', 'Email', 'Both'].map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => handleChange('CompanyAnniversaryWishesChannel', channel)}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: (settingsMap['CompanyAnniversaryWishesChannel']?.value ?? 'Both') === channel
                              ? '2px solid #8b5cf6'
                              : '1px solid var(--border-color)',
                            backgroundColor: (settingsMap['CompanyAnniversaryWishesChannel']?.value ?? 'Both') === channel
                              ? 'rgba(139, 92, 246, 0.1)'
                              : 'transparent',
                            color: (settingsMap['CompanyAnniversaryWishesChannel']?.value ?? 'Both') === channel
                              ? '#7c3aed'
                              : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {channel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notify All Employees */}
                  <div>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Notify All Employees:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { label: 'Yes (All Staff)', value: 'true' },
                        { label: 'No (Self & Admin)', value: 'false' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('CompanyAnniversaryWishesNotifyAllEmployees', opt.value)}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: (settingsMap['CompanyAnniversaryWishesNotifyAllEmployees']?.value ?? 'true') === opt.value
                              ? '2px solid #3b82f6'
                              : '1px solid var(--border-color)',
                            backgroundColor: (settingsMap['CompanyAnniversaryWishesNotifyAllEmployees']?.value ?? 'true') === opt.value
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'transparent',
                            color: (settingsMap['CompanyAnniversaryWishesNotifyAllEmployees']?.value ?? 'true') === opt.value
                              ? '#2563eb'
                              : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Marriage Anniversary Wishes */}
                <div style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Heart size={18} color="#ef4444" />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Marriage Anniversary
                      </h4>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      <input
                        type="checkbox"
                        checked={(settingsMap['MarriageAnniversaryWishesEnabled']?.value ?? 'true') === 'true'}
                        onChange={(e) => handleChange('MarriageAnniversaryWishesEnabled', e.target.checked ? 'true' : 'false')}
                      />
                      Enable
                    </label>
                  </div>

                  {/* Send Through */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Send Through:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['RIIMS', 'Email', 'Both'].map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => handleChange('MarriageAnniversaryWishesChannel', channel)}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: (settingsMap['MarriageAnniversaryWishesChannel']?.value ?? 'Both') === channel
                              ? '2px solid #8b5cf6'
                              : '1px solid var(--border-color)',
                            backgroundColor: (settingsMap['MarriageAnniversaryWishesChannel']?.value ?? 'Both') === channel
                              ? 'rgba(139, 92, 246, 0.1)'
                              : 'transparent',
                            color: (settingsMap['MarriageAnniversaryWishesChannel']?.value ?? 'Both') === channel
                              ? '#7c3aed'
                              : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {channel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notify All Employees */}
                  <div>
                    <label style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Notify All Employees:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { label: 'Yes (All Staff)', value: 'true' },
                        { label: 'No (Self & Admin)', value: 'false' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('MarriageAnniversaryWishesNotifyAllEmployees', opt.value)}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: (settingsMap['MarriageAnniversaryWishesNotifyAllEmployees']?.value ?? 'false') === opt.value
                              ? '2px solid #3b82f6'
                              : '1px solid var(--border-color)',
                            backgroundColor: (settingsMap['MarriageAnniversaryWishesNotifyAllEmployees']?.value ?? 'false') === opt.value
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'transparent',
                            color: (settingsMap['MarriageAnniversaryWishesNotifyAllEmployees']?.value ?? 'false') === opt.value
                              ? '#2563eb'
                              : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right-Aligned Save Button Below Cards */}
          <div style={{
            marginTop: '1.75rem',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                height: '44px',
                padding: '0 1.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: 600,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
