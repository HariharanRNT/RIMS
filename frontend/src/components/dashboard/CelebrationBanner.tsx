import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { Sparkles, Gift, Award, Heart, PartyPopper } from 'lucide-react';

interface CelebrationFeedItem {
  employeeId: number;
  employeeName: string;
  eventType: string; // Birthday, CompanyAnniversary, MarriageAnniversary
  title: string;
  message: string;
  eventDate: string;
  designationName: string;
  departmentName: string;
  yearsOfService?: number;
  isToday: boolean;
}

export const CelebrationBanner: React.FC = () => {
  const [celebrations, setCelebrations] = useState<CelebrationFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayCelebrations = async () => {
      try {
        const res = await apiClient.get('/celebration/today');
        if (res.data.success) {
          setCelebrations(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load today celebrations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayCelebrations();
  }, []);

  if (loading || celebrations.length === 0) {
    return null; // Don't render banner if no celebrations today
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'Birthday':
        return <Gift size={22} color="#ec4899" />;
      case 'CompanyAnniversary':
        return <Award size={22} color="#eab308" />;
      case 'MarriageAnniversary':
        return <Heart size={22} color="#ef4444" />;
      default:
        return <Sparkles size={22} color="#8b5cf6" />;
    }
  };

  const getGradient = (type: string) => {
    switch (type) {
      case 'Birthday':
        return 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(244,114,182,0.12) 100%)';
      case 'CompanyAnniversary':
        return 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(250,204,21,0.12) 100%)';
      case 'MarriageAnniversary':
        return 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(248,113,113,0.12) 100%)';
      default:
        return 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(167,139,250,0.12) 100%)';
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'Birthday':
        return 'rgba(236,72,153,0.3)';
      case 'CompanyAnniversary':
        return 'rgba(234,179,8,0.3)';
      case 'MarriageAnniversary':
        return 'rgba(239,68,68,0.3)';
      default:
        return 'rgba(139,92,246,0.3)';
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <PartyPopper size={20} className="text-primary" />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
          Today's Employee Celebrations
        </h3>
        <span style={{
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          fontSize: '0.75rem',
          fontWeight: 700,
          padding: '0.15rem 0.6rem',
          borderRadius: '12px'
        }}>
          {celebrations.length} Event{celebrations.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem'
      }}>
        {celebrations.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: getGradient(item.eventType),
              border: `1px solid ${getBorderColor(item.eventType)}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.15rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              flexShrink: 0
            }}>
              {getIcon(item.eventType)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '0.7rem', backgroundColor: '#ffffff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Today
                </span>
              </div>
              <h4 style={{ fontSize: '0.975rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.employeeName}
              </h4>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                {item.designationName} &bull; {item.departmentName}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.4rem', fontWeight: 500 }}>
                {item.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
