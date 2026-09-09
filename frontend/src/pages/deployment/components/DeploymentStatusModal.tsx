import React, { useState, useEffect, useMemo } from 'react';
import { X, GitCommit, AlertCircle, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { deploymentApi, type ProductDeploymentDto } from '../../../api/deploymentApi';
import { DeploymentStatusBadge } from './DeploymentStatusBadge';

interface DeploymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deployment: ProductDeploymentDto | null;
}

// Specification Transition Matrix
const VALID_TRANSITIONS: Record<string, string[]> = {
  'New': ['Development In Progress', 'On Hold', 'Rejected'],
  'Development In Progress': ['Development Completed', 'Moved to Testing', 'On Hold', 'Rejected'],
  'Development Completed': ['Moved to Testing', 'Development In Progress', 'On Hold'],
  'Moved to Testing': ['Testing In Progress', 'Testing Completed', 'Development In Progress', 'On Hold'],
  'Testing In Progress': ['Testing Completed', 'Development In Progress', 'On Hold', 'Rejected'],
  'Testing Completed': ['Ready for Delivery', 'Delivered', 'Development In Progress', 'Testing In Progress'],
  'Ready for Delivery': ['Delivered', 'Testing In Progress', 'Development In Progress', 'On Hold'],
  'Delivered': ['Development In Progress', 'Testing In Progress'],
  'On Hold': ['Development In Progress', 'Testing In Progress', 'Ready for Delivery', 'Delivered'],
  'Rejected': ['Development In Progress', 'New'],
};

export const DeploymentStatusModal: React.FC<DeploymentStatusModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deployment,
}) => {
  const [newStatus, setNewStatus] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allowedStatuses = useMemo(() => {
    if (!deployment) return [];
    const validNext = VALID_TRANSITIONS[deployment.currentStatus] || [];
    // Always include current status as first option
    return [deployment.currentStatus, ...validNext.filter((s) => s !== deployment.currentStatus)];
  }, [deployment]);

  useEffect(() => {
    if (isOpen && deployment) {
      setNewStatus(deployment.currentStatus);
      setRemarks('');
      setVersion(deployment.version || '');
      setDeliveryDate(deployment.deliveryDate ? deployment.deliveryDate.slice(0, 10) : '');
      setErrorMsg(null);
    }
  }, [isOpen, deployment]);

  if (!isOpen || !deployment) return null;

  const isReopening =
    ['Moved to Testing', 'Testing In Progress', 'Testing Completed', 'Ready for Delivery', 'Delivered'].includes(
      deployment.currentStatus
    ) && ['Development In Progress', 'New'].includes(newStatus);

  // Progressive disclosure: only show version tag & delivery date when relevant
  const showVersionField =
    ['Testing Completed', 'Ready for Delivery', 'Delivered', 'Testing In Progress'].includes(newStatus) ||
    !!deployment.version;

  const showDeliveryDateField =
    ['Ready for Delivery', 'Delivered'].includes(newStatus) ||
    !!deployment.deliveryDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newStatus === deployment.currentStatus) {
      setErrorMsg('Please select a new target status to transition this deployment.');
      return;
    }

    if (isReopening && !remarks.trim()) {
      setErrorMsg('Remarks are strictly required when reopening a deployment back to development.');
      return;
    }

    try {
      setIsSubmitting(true);
      await deploymentApi.changeStatus(deployment.id, {
        newStatus,
        remarks: remarks.trim() || undefined,
        version: showVersionField ? version.trim() || undefined : undefined,
        deliveryDate: showDeliveryDateField ? deliveryDate || undefined : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          maxWidth: '520px',
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
              <GitCommit size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Change Lifecycle Status
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {deployment.productName} ({deployment.productCode}) • {deployment.clientCompanyName}
              </p>
            </div>
          </div>
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--red-dim, rgba(239, 68, 68, 0.12))',
                color: 'var(--red, #ef4444)',
                border: '1px solid var(--red, rgba(239, 68, 68, 0.3))',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Status display */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--panel-raised)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Current Status:
            </span>
            <DeploymentStatusBadge status={deployment.currentStatus} />
          </div>

          {/* Constrained New Status Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
              Next Valid Status <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--panel-raised)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
              }}
            >
              {allowedStatuses.map((st) => {
                const isCurrent = st === deployment.currentStatus;
                const isReopenOption =
                  !isCurrent &&
                  ['Moved to Testing', 'Testing In Progress', 'Testing Completed', 'Ready for Delivery', 'Delivered'].includes(
                    deployment.currentStatus
                  ) &&
                  ['Development In Progress', 'New'].includes(st);

                return (
                  <option key={st} value={st}>
                    {st} {isCurrent ? '(Current)' : isReopenOption ? '⚠️ (Reopen / Reject to Dev)' : ''}
                  </option>
                );
              })}
            </select>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', margin: '4px 0 0 0' }}>
              Only valid workflow transitions from "{deployment.currentStatus}" are selectable.
            </p>
          </div>

          {/* Reopen Warning Notice */}
          {isReopening && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--red, #ef4444)',
                fontSize: '0.78rem',
                lineHeight: 1.5,
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Reopening Deployment:</strong> This returns the issue to development and resets testing completed flags. Remarks are <strong>mandatory</strong>.
              </div>
            </div>
          )}

          {/* Remarks Field (Mandatory on reopen) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
              Remarks / Comments {isReopening ? <span style={{ color: 'var(--red)' }}>* (Mandatory for Reopening)</span> : <span style={{ color: 'var(--text-faint)', textTransform: 'none' }}>(Optional)</span>}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder={isReopening ? 'Reason for reopening back to development (required)...' : 'Notes or description regarding this status transition...'}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: `1px solid ${isReopening && !remarks.trim() ? 'var(--red, #ef4444)' : 'var(--border)'}`,
                background: 'var(--panel-raised)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                resize: 'vertical',
              }}
              required={isReopening}
            />
          </div>

          {/* Progressive Disclosure: Version & Delivery Date */}
          {(showVersionField || showDeliveryDateField) && (
            <div style={{ display: 'grid', gridTemplateColumns: showVersionField && showDeliveryDateField ? '1fr 1fr' : '1fr', gap: '0.85rem', paddingTop: '0.25rem', borderTop: '1px dashed var(--border)' }}>
              {showVersionField && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                    <Tag size={12} color="var(--primary)" /> Version Tag
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. v2.4.1"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--panel-raised)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              )}

              {showDeliveryDateField && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                    <Calendar size={12} color="var(--primary)" /> Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--panel-raised)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || newStatus === deployment.currentStatus}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <GitCommit size={15} />
              <span>{isSubmitting ? 'Updating...' : 'Confirm Status'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
