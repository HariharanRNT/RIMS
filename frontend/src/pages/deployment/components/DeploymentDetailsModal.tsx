import React, { useEffect, useState } from 'react';
import {
  X,
  Package,
  Calendar,
  FileText,
  CheckCircle2,
  Send,
  History,
  Clock,
  User,
  GitCommit,
  Edit3,
  HelpCircle,
} from 'lucide-react';
import {
  deploymentApi,
  type ProductDeploymentDto,
  type ProductDeploymentActivityDto,
} from '../../../api/deploymentApi';
import { DeploymentStatusBadge, getStatusStyles } from './DeploymentStatusBadge';

interface DeploymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deployment: ProductDeploymentDto | null;
  onEdit?: (deployment: ProductDeploymentDto) => void;
  onChangeStatus?: (deployment: ProductDeploymentDto) => void;
}

export const DeploymentDetailsModal: React.FC<DeploymentDetailsModalProps> = ({
  isOpen,
  onClose,
  deployment,
  onEdit,
  onChangeStatus,
}) => {
  const [activities, setActivities] = useState<ProductDeploymentActivityDto[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && deployment) {
      loadActivities(deployment.id);
    }
  }, [isOpen, deployment]);

  const loadActivities = async (id: number) => {
    try {
      setIsLoadingActivities(true);
      const data = await deploymentApi.getActivities(id);
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  if (!isOpen || !deployment) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--panel)',
          borderColor: 'var(--border)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-xl)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-tint)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {deployment.description || deployment.issue || 'Deployment Details'}
                </h3>
                <DeploymentStatusBadge status={deployment.currentStatus} />
                {deployment.version && (
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontFamily: 'inherit',
                      background: 'var(--panel-raised)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-dim)',
                    }}
                  >
                    {deployment.version}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {deployment.productName} ({deployment.productCode}) • {deployment.clientCompanyName}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onChangeStatus && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  onClose();
                  onChangeStatus(deployment);
                }}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <GitCommit size={13} color="var(--primary)" />
                <span>Status</span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onEdit(deployment);
                }}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-faint)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top 4 Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--panel-raised)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                <Package size={13} color="var(--blue, #3b82f6)" /> Product & Client
              </div>
              <div style={{ marginTop: '6px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {deployment.productName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {deployment.clientCompanyName}
              </div>
            </div>

            <div
              style={{ padding: '12px', borderRadius: '10px', background: 'var(--panel-raised)', border: '1px solid var(--border)' }}
              title="Issue Date is when the issue occurred. Logged Date is when it was entered into the RIIMS system."
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} color="var(--blue, #3b82f6)" /> Issue Date
                </span>
                <HelpCircle size={12} color="var(--text-faint)" />
              </div>
              <div style={{ marginTop: '6px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {deployment.formattedIssueDate}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Logged {deployment.formattedCreatedAt}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--panel-raised)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                <CheckCircle2 size={13} color="var(--violet, #8b5cf6)" /> QA Testing
              </div>
              <div style={{ marginTop: '6px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {deployment.testingCompleted ? 'Completed' : deployment.movedToTesting ? 'In QA' : '—'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {deployment.testingCompletedByName || deployment.movedToTestingByName || 'Not in testing'}
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--panel-raised)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                <Send size={13} color="var(--green, #10b981)" /> Delivery
              </div>
              <div style={{ marginTop: '6px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                {deployment.formattedDeliveryDate || '—'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {deployment.deliveredByName || 'Awaiting sign-off'}
              </div>
            </div>
          </div>

          {/* Origin / Reporter Details */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--panel-raised)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                Issue Origin:
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: deployment.raisedBy === 'Internally Found' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: deployment.raisedBy === 'Internally Found' ? '#6366f1' : '#10b981',
                  border: `1px solid ${deployment.raisedBy === 'Internally Found' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                }}
              >
                {deployment.raisedBy || 'Client'}
              </span>
            </div>

            {deployment.raisedBy !== 'Internally Found' && (deployment.modeOfContact || deployment.contactedPerson) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
                {deployment.modeOfContact && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Mode:</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.78rem' }}>{deployment.modeOfContact}</strong>
                  </div>
                )}
                {deployment.contactedPerson && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Reported By:</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.78rem' }}>{deployment.contactedPerson}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description & Solution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--panel-raised)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                <FileText size={14} color="var(--primary)" /> Issue Description
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {deployment.description}
              </p>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--panel-raised)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                <GitCommit size={14} color="var(--green, #10b981)" /> Development Process / Solution
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: deployment.developmentProcess ? 'var(--text-main)' : 'var(--text-faint)', fontStyle: deployment.developmentProcess ? 'normal' : 'italic', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {deployment.developmentProcess || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Connected Vertical Activity Timeline */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={15} color="var(--primary)" />
              <span>Chronological Activity Timeline ({activities.length})</span>
            </h4>

            {isLoadingActivities ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-faint)', fontSize: '0.8rem' }}>
                Loading activity history...
              </div>
            ) : activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-faint)', fontSize: '0.8rem' }}>
                No activity history records found.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                {/* Continuous vertical timeline bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: '7px',
                    top: '12px',
                    bottom: '12px',
                    width: '2px',
                    background: 'var(--border)',
                    borderRadius: '2px',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activities.map((act) => {
                    const dotColor = getStatusStyles(act.newStatus || act.actionType).dot;

                    return (
                      <div key={act.id} style={{ position: 'relative' }}>
                        {/* Timeline Node Dot */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-24px',
                            top: '12px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: 'var(--panel)',
                            border: `3px solid ${dotColor}`,
                            boxShadow: `0 0 8px ${dotColor}35`,
                            zIndex: 2,
                          }}
                        />

                        {/* Card Content */}
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: 'var(--panel-raised)',
                            border: '1px solid var(--border)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                                {act.actionType}
                              </span>
                              {act.newStatus && <DeploymentStatusBadge status={act.newStatus} size="sm" />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-faint)', fontSize: '0.72rem' }}>
                              <Clock size={12} />
                              <span>{act.formattedChangedAt}</span>
                            </div>
                          </div>

                          {act.previousStatus && act.newStatus && act.previousStatus !== act.newStatus && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                              Transition: <span style={{ fontWeight: 500 }}>{act.previousStatus}</span> → <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{act.newStatus}</span>
                            </div>
                          )}

                          {act.remarks && (
                            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', background: 'var(--panel)', padding: '6px 10px', borderRadius: '6px', margin: '6px 0', borderLeft: `3px solid ${dotColor}` }}>
                              "{act.remarks}"
                            </div>
                          )}

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                            <User size={11} />
                            <span>Performed by <strong style={{ color: 'var(--text-main)' }}>{act.changedByName}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
