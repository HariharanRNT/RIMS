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

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'created':
        return <Clock size={16} className="text-primary" />;
      case 'assigned':
        return <UserCheck size={16} style={{ color: 'var(--primary)' }} />;
      case 'started':
        return <PlayCircle size={16} style={{ color: 'var(--success)' }} />;
      case 'held':
        return <PauseCircle size={16} style={{ color: 'var(--warning)' }} />;
      case 'resumed':
        return <PlayCircle size={16} style={{ color: 'var(--success)' }} />;
      case 'completed':
        return <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />;
      case 'reassigned':
        return <RefreshCw size={16} style={{ color: 'var(--info)' }} />;
      case 'cancelled':
        return <XCircle size={16} style={{ color: 'var(--danger)' }} />;
      case 'modified':
        return <AlertCircle size={16} style={{ color: 'var(--warning)' }} />;
      default:
        return <Clock size={16} />;
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
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: 'rgba(255,255,255,0.07)',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Activity & Task Audit Timeline
            </span>
            <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {taskTitle}
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Assigned To: <strong>{employeeName}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {(() => {
            const safeEvents = Array.isArray(events) ? events : [];
            if (loading) {
              return (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                  Loading audit timeline events...
                </div>
              );
            }
            if (safeEvents.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  No timeline activity events recorded for this task.
                </div>
              );
            }
            return (
              <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                {/* Vertical Connector Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    bottom: '20px',
                    left: '19px',
                    width: '2px',
                    backgroundColor: 'var(--border-color)',
                  }}
                />

                {safeEvents.map((evt, idx) => (
                <div
                  key={evt.id || idx}
                  style={{
                    position: 'relative',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Timeline Dot Icon */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.5rem',
                      top: '0px',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      border: '2px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                  >
                    {getEventIcon(evt.eventType)}
                  </div>

                  {/* Card Content */}
                  <div
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      marginLeft: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span className={`badge ${getEventBadgeClass(evt.eventType)}`} style={{ fontWeight: 700 }}>
                        {evt.eventType}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {formatDateIST(evt.timestamp)} at {formatTimeIST(evt.timestamp)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                      {evt.remarks || `Event ${evt.eventType} recorded.`}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <User size={13} />
                      <span>
                        Action by: <strong>{evt.performedByName}</strong> ({evt.performedByRole})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
        </div>

        {/* Drawer Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', textAlign: 'right' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
