import React from 'react';
import { X, Clock, CheckCircle2, AlertCircle, PauseCircle, PlayCircle, User, UserCheck, RefreshCw, XCircle } from 'lucide-react';
import { formatTimeIST, formatDateIST } from '../../utils/dateUtils';

export interface TaskTimelineEventDto {
  id: number;
  workTaskId: number;
  eventType: string;
  timestamp: string;
  performedByEmployeeId: number;
  performedByName: string;
  performedByRole: string;
  remarks?: string;
}

interface TaskTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  employeeName: string;
  events: TaskTimelineEventDto[];
  loading?: boolean;
}

export const TaskTimelineDrawer: React.FC<TaskTimelineDrawerProps> = ({
  isOpen,
  onClose,
  taskTitle,
  employeeName,
  events,
  loading = false,
}) => {
  if (!isOpen) return null;

  const getEventAccentColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'created':
        return '#94A3B8'; // Slate / Gray
      case 'assigned':
        return '#E8873C'; // Amber
      case 'reassigned':
        return '#3B82F6'; // Blue
      case 'started':
      case 'resumed':
        return '#10B981'; // Green
      case 'held':
        return '#F59E0B'; // Orange
      case 'completed':
        return '#10B981'; // Emerald Green
      case 'cancelled':
        return '#EF4444'; // Red
      case 'modified':
        return '#8B5CF6'; // Purple
      default:
        return '#94A3B8';
    }
  };

  const getEventIcon = (type: string) => {
    const accent = getEventAccentColor(type);
    switch (type.toLowerCase()) {
      case 'created':
        return <Clock size={16} style={{ color: accent }} />;
      case 'assigned':
        return <UserCheck size={16} style={{ color: accent }} />;
      case 'started':
      case 'resumed':
        return <PlayCircle size={16} style={{ color: accent }} />;
      case 'held':
        return <PauseCircle size={16} style={{ color: accent }} />;
      case 'completed':
        return <CheckCircle2 size={16} style={{ color: accent }} />;
      case 'reassigned':
        return <RefreshCw size={16} style={{ color: accent }} />;
      case 'cancelled':
        return <XCircle size={16} style={{ color: accent }} />;
      case 'modified':
        return <AlertCircle size={16} style={{ color: accent }} />;
      default:
        return <Clock size={16} style={{ color: accent }} />;
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type.toLowerCase()) {
      case 'assigned':
      case 'reassigned':
        return 'badge-info';
      case 'started':
      case 'resumed':
      case 'completed':
        return 'badge-success';
      case 'held':
        return 'badge-warning';
      case 'cancelled':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const safeEvents = Array.isArray(events) ? events : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeInOverlay 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100vh',
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e5e7eb',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          zIndex: 1101,
          isolation: 'isolate',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Pinned Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            backgroundColor: '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#E8873C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Activity & Task Audit Timeline
            </span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#111827', fontWeight: 700, lineHeight: 1.3 }}>
              {taskTitle}
            </h3>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.825rem', color: '#6b7280' }}>
              Assigned To: <strong style={{ color: '#111827' }}>{employeeName}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close Panel"
            style={{
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Timeline Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280' }}>
              Loading audit timeline events...
            </div>
          ) : safeEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>
              No timeline activity events recorded for this task.
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '44px' }}>
              {/* Continuous Vertical Timeline Connector Line */}
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  bottom: '20px',
                  left: '18px',
                  width: '2px',
                  backgroundColor: '#e5e7eb',
                  zIndex: 1,
                }}
              />

              {safeEvents.map((evt, idx) => {
                const accentColor = getEventAccentColor(evt.eventType);

                return (
                  <div
                    key={evt.id || idx}
                    style={{
                      position: 'relative',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Punched-through Timeline Icon Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-26px',
                        top: '12px',
                        transform: 'translateX(-50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: `2px solid ${accentColor}`,
                        boxShadow: `0 0 10px ${accentColor}33`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                      }}
                    >
                      {getEventIcon(evt.eventType)}
                    </div>

                    {/* Timeline Event Card */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${accentColor}`,
                        borderRadius: '12px',
                        padding: '0.9rem 1.1rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        position: 'relative',
                        zIndex: 3,
                      }}
                    >
                      {/* Badge & Timestamp Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span className={`badge ${getEventBadgeClass(evt.eventType)}`} style={{ fontWeight: 700, fontSize: '0.725rem' }}>
                          {evt.eventType}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                          {formatDateIST(evt.timestamp)} at {formatTimeIST(evt.timestamp)}
                        </span>
                      </div>

                      {/* Main Remarks / Description */}
                      <div style={{ fontSize: '0.875rem', color: '#111827', marginTop: '0.35rem', lineHeight: 1.45 }}>
                        {evt.remarks || `Event ${evt.eventType} recorded.`}
                      </div>

                      {/* De-emphasized Footer Line */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          marginTop: '0.6rem',
                          paddingTop: '0.4rem',
                          borderTop: '1px solid #f0f0f0',
                          fontSize: '0.75rem',
                          color: '#6b7280',
                        }}
                      >
                        <User size={13} style={{ color: '#9ca3af' }} />
                        <span>
                          Action by: <strong style={{ color: '#111827' }}>{evt.performedByName}</strong> ({evt.performedByRole})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
