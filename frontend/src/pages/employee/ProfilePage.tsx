import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  ShieldCheck,
  CreditCard,
  FileText,
  UserCheck,
  CheckCircle,
  XCircle,
  Hash,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';

interface EmployeeProfile {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
  companyName?: string;
  departmentName: string;
  designationName: string;
  designationFromDate?: string;
  reportingPersonName?: string;
  dateOfJoining: string;
  pfNumber?: string;
  panNumber?: string;
  esiNumber?: string;
  aadhaarNumber?: string;
  isActive: boolean;
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch current logged-in employee profile
      const res = await apiClient.get('/employees/profile');
      if (res.data.success) {
        setProfile(res.data.data);
      } else {
        setError(res.data.message || 'Failed to load employee profile.');
      }
    } catch (err: any) {
      // Fallback: If logged in user has employeeId, fetch /employees/{id}
      if (user?.employeeId) {
        try {
          const fallbackRes = await apiClient.get(`/employees/${user.employeeId}`);
          if (fallbackRes.data.success) {
            setProfile(fallbackRes.data.data);
            return;
          }
        } catch {
          // Ignore
        }
      }
      setError('Unable to fetch profile details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem',
        color: 'var(--text-muted)'
      }}>
        <Loader2 className="spin-animation" size={36} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading Employee Profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-container" style={{ padding: '2rem' }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--danger)',
          maxWidth: '500px',
          margin: '3rem auto'
        }}>
          <XCircle size={40} style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Profile Unavailable</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            {error || 'Could not locate employee profile details.'}
          </p>
          <button
            onClick={fetchProfile}
            className="btn btn-primary"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="page-container" style={{ padding: '1.75rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.25rem 2rem',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 35px -10px rgba(49, 46, 129, 0.35)',
        marginBottom: '2rem'
      }}>
        {/* Subtle Background Glow */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Avatar Pill */}
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              color: '#FFFFFF',
              fontSize: '2rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              border: '3px solid rgba(255,255,255,0.25)',
              flexShrink: 0
            }}>
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                  {profile.name}
                </h1>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: profile.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: profile.isActive ? '#34D399' : '#FCA5A5',
                  border: `1px solid ${profile.isActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                }}>
                  {profile.isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                  {profile.isActive ? 'Active Status' : 'Inactive Status'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.4rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>{profile.designationName}</span>
                <span>•</span>
                <span>{profile.departmentName}</span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.15)', padding: '0.15rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <Hash size={13} />
                  {profile.employeeCode}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            <Building2 size={24} style={{ color: '#818CF8' }} />
            <div>
              <div style={{ fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                Company
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
                {profile.companyName || 'RNT Technologies'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card 1: Primary Account & Contact Details */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            color: 'var(--primary)',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            <User size={20} />
            <span>Account & Personal Info</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <DetailRow
              icon={<User size={17} />}
              label="Employee Name"
              value={profile.name}
              highlight
            />
            <DetailRow
              icon={<Hash size={17} />}
              label="Employee ID (Code)"
              value={profile.employeeCode}
            />
            <DetailRow
              icon={<Mail size={17} />}
              label="Email ID"
              value={profile.email}
            />
            <DetailRow
              icon={<ShieldCheck size={17} />}
              label="Username"
              value={profile.username || profile.email}
            />
            <DetailRow
              icon={<Phone size={17} />}
              label="Contact Number"
              value={profile.phone || 'Not Provided'}
            />
          </div>
        </div>

        {/* Card 2: Employment & Designation Details */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            color: 'var(--primary)',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            <Briefcase size={20} />
            <span>Employment & Designation Info</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <DetailRow
              icon={<Building2 size={17} />}
              label="Company Name"
              value={profile.companyName || 'RNT Technologies'}
            />
            <DetailRow
              icon={<Briefcase size={17} />}
              label="Designation"
              value={profile.designationName}
              highlight
            />
            <DetailRow
              icon={<Clock size={17} />}
              label="Designation From"
              value={formatDate(profile.designationFromDate || profile.dateOfJoining)}
            />
            <DetailRow
              icon={<UserCheck size={17} />}
              label="Reporting To"
              value={profile.reportingPersonName || 'Direct to Management'}
            />
            <DetailRow
              icon={<Calendar size={17} />}
              label="Date of Joining"
              value={formatDate(profile.dateOfJoining)}
            />
          </div>
        </div>

        {/* Card 3: Statutory & Financial Accounts */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            color: 'var(--primary)',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            <CreditCard size={20} />
            <span>Statutory & Tax Identifiers</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <DetailRow
              icon={<FileText size={17} />}
              label="PF Number"
              value={profile.pfNumber || 'Not Configured'}
              badge={!!profile.pfNumber}
            />
            <DetailRow
              icon={<CreditCard size={17} />}
              label="PAN Number"
              value={profile.panNumber || 'Not Configured'}
              badge={!!profile.panNumber}
            />
            <DetailRow
              icon={<Sparkles size={17} />}
              label="ESI Number"
              value={profile.esiNumber || 'Not Configured'}
              badge={!!profile.esiNumber}
            />
            <DetailRow
              icon={<ShieldCheck size={17} />}
              label="Aadhaar Number"
              value={profile.aadhaarNumber || 'Not Configured'}
              badge={!!profile.aadhaarNumber}
            />
            <DetailRow
              icon={<CheckCircle size={17} />}
              label="Employment Status"
              value={profile.isActive ? 'Active Employee' : 'Inactive'}
              customValueStyle={{
                color: profile.isActive ? 'var(--success)' : 'var(--danger)',
                fontWeight: 700
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

// Reusable Detail Row Component
interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  badge?: boolean;
  customValueStyle?: React.CSSProperties;
}

const DetailRow: React.FC<DetailRowProps> = ({
  icon,
  label,
  value,
  highlight,
  badge,
  customValueStyle
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '1rem',
      fontSize: '0.875rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--primary)', opacity: 0.85 }}>{icon}</span>
        <span style={{ fontWeight: 500 }}>{label}</span>
      </div>

      <div style={{
        fontWeight: highlight ? 700 : 600,
        color: highlight ? 'var(--primary)' : 'var(--text-main)',
        textAlign: 'right',
        wordBreak: 'break-word',
        fontFamily: badge ? 'monospace' : 'inherit',
        backgroundColor: badge ? 'var(--bg-hover)' : 'transparent',
        padding: badge ? '0.15rem 0.5rem' : 0,
        borderRadius: badge ? '6px' : 0,
        border: badge ? '1px solid var(--border-color)' : 'none',
        ...customValueStyle
      }}>
        {value}
      </div>
    </div>
  );
};

export default ProfilePage;
