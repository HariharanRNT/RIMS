import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Save, AlertCircle, Package, UserCheck, Calendar, Activity, ExternalLink, AlertTriangle, User, Mail } from 'lucide-react';
import {
  deploymentApi,
  type ProductDeploymentDto,
  type AuthorizedProductOptionDto,
  type AuthorizedClientOptionDto,
} from '../../../api/deploymentApi';

interface DeploymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deployment?: ProductDeploymentDto | null;
  authorizedProducts: AuthorizedProductOptionDto[];
}

const STATUS_OPTIONS = [
  'New',
  'Development In Progress',
  'Development Completed',
  'Moved to Testing',
  'Testing In Progress',
  'Testing Completed',
  'Ready for Delivery',
  'Delivered',
  'Rejected',
  'On Hold',
];

export const DeploymentFormModal: React.FC<DeploymentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deployment,
  authorizedProducts,
}) => {
  const navigate = useNavigate();
  const isEditing = !!deployment;

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [productId, setProductId] = useState<number>(0);
  const [clientId, setClientId] = useState<number>(0);
  const [issue, setIssue] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [raisedBy, setRaisedBy] = useState<string>('Client');
  const [modeOfContact, setModeOfContact] = useState<string>('');
  const [contactedPerson, setContactedPerson] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [developmentProcess, setDevelopmentProcess] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<string>('New');
  const [version, setVersion] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const [availableClients, setAvailableClients] = useState<AuthorizedClientOptionDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (deployment) {
        setProductId(deployment.productId);
        setClientId(deployment.clientId);
        setIssue(deployment.issue);
        setIssueDate(deployment.issueDate.slice(0, 10));
        setRaisedBy(deployment.raisedBy || 'Client');
        setModeOfContact(deployment.modeOfContact || '');
        setContactedPerson(deployment.contactedPerson || '');
        setDescription(deployment.description);
        setDevelopmentProcess(deployment.developmentProcess);
        setCurrentStatus(deployment.currentStatus);
        setVersion(deployment.version || '');
        setDeliveryDate(deployment.deliveryDate ? deployment.deliveryDate.slice(0, 10) : '');
        setRemarks('');
      } else {
        const defaultProd = authorizedProducts.length > 0 ? authorizedProducts[0] : null;
        setProductId(defaultProd ? defaultProd.productId : 0);
        setClientId(defaultProd && defaultProd.mappedClients.length > 0 ? defaultProd.mappedClients[0].clientId : 0);
        setIssue('');
        setIssueDate(new Date().toISOString().slice(0, 10));
        setRaisedBy('Client');
        setModeOfContact('');
        setContactedPerson('');
        setDescription('');
        setDevelopmentProcess('');
        setCurrentStatus('New');
        setVersion('');
        setDeliveryDate('');
        setRemarks('');
      }
    }
  }, [isOpen, deployment, authorizedProducts]);

  const handleRaisedByChange = (val: string) => {
    setRaisedBy(val);
    if (val === 'Internally Found') {
      setModeOfContact('');
      setContactedPerson('');
    }
  };

  useEffect(() => {
    if (productId > 0) {
      const selectedProd = authorizedProducts.find((p) => p.productId === productId);
      const clients = selectedProd ? selectedProd.mappedClients : [];
      setAvailableClients(clients);

      if (!clients.some((c) => c.clientId === clientId)) {
        setClientId(clients.length > 0 ? clients[0].clientId : 0);
      }
    } else {
      setAvailableClients([]);
      setClientId(0);
    }
  }, [productId, authorizedProducts]);

  if (!isOpen) return null;

  const selectedProductObj = authorizedProducts.find((p) => p.productId === productId);
  const hasNoClients = selectedProductObj && availableClients.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!productId) {
      setErrorMsg('Please select a Product.');
      return;
    }
    if (!clientId) {
      setErrorMsg('Please select a Client mapped to the chosen product.');
      return;
    }
    if (!issueDate) {
      setErrorMsg('Please select an Issue Date.');
      return;
    }
    if (!raisedBy) {
      setErrorMsg('Please select Raised By.');
      return;
    }
    if (raisedBy === 'Client') {
      if (!modeOfContact) {
        setErrorMsg('Please select Mode of Contact (Email or Call).');
        return;
      }
      if (!contactedPerson.trim()) {
        setErrorMsg('Please enter the Contacted Person name.');
        return;
      }
    }
    if (!description.trim()) {
      setErrorMsg('Please provide a Description of the issue.');
      return;
    }

    if (
      isEditing &&
      deployment &&
      ['Moved to Testing', 'Testing In Progress', 'Testing Completed', 'Ready for Delivery', 'Delivered'].includes(
        deployment.currentStatus
      ) &&
      ['Development In Progress', 'New'].includes(currentStatus) &&
      !remarks.trim()
    ) {
      setErrorMsg('Remarks are required when reopening a deployment back to development.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        productId,
        clientId,
        issue: issue.trim() || undefined,
        issueDate,
        raisedBy,
        modeOfContact: raisedBy === 'Client' ? modeOfContact : undefined,
        contactedPerson: raisedBy === 'Client' ? contactedPerson.trim() : undefined,
        description: description.trim(),
        developmentProcess: developmentProcess.trim() || undefined,
        currentStatus,
        version: version.trim() || undefined,
        deliveryDate: deliveryDate || undefined,
        remarks: remarks.trim() || undefined,
      };

      if (isEditing && deployment) {
        await deploymentApi.updateDeployment(deployment.id, payload);
      } else {
        await deploymentApi.createDeployment(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'An error occurred while saving.');
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
          maxWidth: '640px',
          maxHeight: '88vh',
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
        {/* Fixed Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.15rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
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
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {isEditing ? `Edit Deployment: ${deployment?.issue || deployment?.description || ''}` : 'New Product Deployment'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Track issue lifecycle from development through testing and delivery
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

            {/* Product and Client */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                  <Package size={13} color="var(--primary)" /> Product <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-raised)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                  required
                >
                  <option value={0} disabled>-- Select Product --</option>
                  {authorizedProducts.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName} ({p.productCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                  <UserCheck size={13} color="var(--primary)" /> Client <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(Number(e.target.value))}
                  disabled={availableClients.length === 0}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${hasNoClients ? 'var(--amber, #f59e0b)' : 'var(--border)'}`,
                    background: 'var(--panel-raised)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                  required
                >
                  {availableClients.length === 0 ? (
                    <option value={0}>No mapped clients</option>
                  ) : (
                    <>
                      <option value={0} disabled>-- Select Client --</option>
                      {availableClients.map((c) => (
                        <option key={c.clientId} value={c.clientId}>
                          {c.companyName}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* No Mapped Clients Banner with Action Link */}
            {hasNoClients && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'var(--amber, #d97706)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>No clients are currently mapped to product <strong>{selectedProductObj?.productName}</strong>.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/admin/mappings');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  <span>Map Clients</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            )}

            {/* Issue Date */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                <Calendar size={13} color="var(--primary)" /> Issue Date <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="date"
                max={todayStr}
                value={issueDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val > todayStr) {
                    setIssueDate(todayStr);
                  } else {
                    setIssueDate(val);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-raised)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                }}
                required
              />
            </div>

            {/* Issue Origin Section: Raised By, Mode of Contact, Contacted Person */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: raisedBy === 'Client' ? '1fr 1fr 1.2fr' : '1fr',
                gap: '0.85rem',
                alignItems: 'flex-start',
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                  <User size={13} color="var(--primary)" /> Raised By <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  value={raisedBy}
                  onChange={(e) => handleRaisedByChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-raised)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                  required
                >
                  <option value="Client">Client</option>
                  <option value="Internally Found">Internally Found</option>
                </select>
              </div>

              {raisedBy === 'Client' && (
                <>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                      <Mail size={13} color="var(--primary)" /> Mode of Contact <span style={{ color: 'var(--red)' }}>*</span>
                    </label>
                    <select
                      value={modeOfContact}
                      onChange={(e) => setModeOfContact(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--panel-raised)',
                        color: 'var(--text-main)',
                        fontSize: '0.82rem',
                      }}
                      required
                    >
                      <option value="" disabled>-- Select Mode --</option>
                      <option value="Email">Email</option>
                      <option value="Call">Call</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                      <UserCheck size={13} color="var(--primary)" /> Contacted Person <span style={{ color: 'var(--red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={contactedPerson}
                      onChange={(e) => setContactedPerson(e.target.value)}
                      placeholder="e.g. John Doe (Client)"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--panel-raised)',
                        color: 'var(--text-main)',
                        fontSize: '0.82rem',
                      }}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                Description <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the issue / feature scope..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-raised)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  resize: 'vertical',
                }}
                required
              />
            </div>

            {/* Development Process (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                Development Process / Solution <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'none', fontWeight: 400 }}>(Optional)</span>
              </label>
              <textarea
                value={developmentProcess}
                onChange={(e) => setDevelopmentProcess(e.target.value)}
                rows={3}
                placeholder="Technical resolution, code adjustments, or patch applied (optional)..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-raised)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Status, Version, Delivery Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                  <Activity size={13} color="var(--primary)" /> Status <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
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
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Version Tag
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v2.4.1"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-raised)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-raised)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>
            </div>

            {/* Initial Notes / Remarks */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '5px' }}>
                {isEditing ? 'Activity Remarks' : 'Initial Notes (Optional)'}
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={isEditing ? 'e.g. Build deployed to QA or reason for update' : 'e.g. Initial creation notes or ticket reference'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-raised)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                }}
              />
            </div>
          </div>

          {/* Sticky/Fixed Footer (Always reachable without scrolling) */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--panel)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasNoClients}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Deployment' : 'Create Deployment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

