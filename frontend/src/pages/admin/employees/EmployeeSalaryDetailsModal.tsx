import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { X, Calculator, History, Plus } from 'lucide-react';

interface SalaryComponentDto {
  id?: number;
  componentName: string;
  componentType: number;
  calculationType: number;
  percentage: number | null;
  fixedAmount: number | null;
  calculationBase: number | null;
  monthlyAmount: number;
  isEarning: boolean;
  isDeduction: boolean;
  isEmployerContribution: boolean;
}

interface SalaryStructureResponseDto {
  id: number;
  employeeId: number;
  annualCTC: number;
  monthlyCTC: number;
  salaryConfigurationMode: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  pfApplicable: boolean;
  esiApplicable: boolean;
  professionalTaxApplicable: boolean;
  tdsApplicable: boolean;
  grossEarnings: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  estimatedNetPay: number;
  components: SalaryComponentDto[];
}

interface Props {
  employeeId: number | null;
  employeeName?: string;
  employeeCode?: string;
  onClose: () => void;
}

export const EmployeeSalaryDetailsModal: React.FC<Props> = ({
  employeeId,
  employeeName,
  employeeCode,
  onClose,
}) => {
  const [activeStructure, setActiveStructure] = useState<SalaryStructureResponseDto | null>(null);
  const [history, setHistory] = useState<SalaryStructureResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'new'>('current');

  // New Revision Form State
  const [annualCTC, setAnnualCTC] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pfApplicable, setPfApplicable] = useState<boolean>(true);
  const [esiApplicable, setEsiApplicable] = useState<boolean>(false);
  const [ptApplicable, setPtApplicable] = useState<boolean>(false);
  const [tdsApplicable, setTdsApplicable] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [revError, setRevError] = useState('');

  const fetchSalaryData = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [structRes, histRes] = await Promise.all([
        apiClient.get(`/employees/${employeeId}/salary-structure`),
        apiClient.get(`/employees/${employeeId}/salary-history`),
      ]);

      if (structRes.data.success) {
        setActiveStructure(structRes.data.data);
      }
      if (histRes.data.success) {
        setHistory(structRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch salary data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveStructure(null);
    setHistory([]);
    setAnnualCTC('');
    setRevError('');
    setActiveTab('current');
    if (employeeId) {
      fetchSalaryData();
    }
  }, [employeeId]);

  const handleNonNegativeChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setter('');
      return;
    }
    const sanitized = raw.replace(/-/g, '');
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num < 0) {
      setter('0');
    } else {
      setter(sanitized);
    }
  };

  const handleKeyDownNonNegative = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  };

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevError('');
    const ctcVal = Math.max(0, parseFloat(annualCTC) || 0);
    if (isNaN(ctcVal) || ctcVal < 0) {
      setRevError('Annual CTC cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/employees/${employeeId}/salary-structure`, {
        annualCTC: ctcVal,
        salaryConfigurationMode: 0,
        effectiveFrom,
        pfApplicable,
        esiApplicable,
        professionalTaxApplicable: ptApplicable,
        tdsApplicable,
        components: []
      });

      if (res.data.success) {
        await fetchSalaryData();
        setActiveTab('current');
      }
    } catch (err: any) {
      setRevError(err.response?.data?.message || 'Failed to update salary structure.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!employeeId) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          width: '850px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="badge badge-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                {employeeCode || 'EMP'}
              </span>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>{employeeName || 'Employee'} — Salary & Payroll Structure</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '0.2rem' }}>
              View active salary structure, earnings & deductions breakdown, and historical revisions.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%', border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'current' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            onClick={() => setActiveTab('current')}
          >
            <Calculator size={15} />
            <span>Current Active Structure</span>
          </button>

          <button
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            onClick={() => setActiveTab('history')}
          >
            <History size={15} />
            <span>Salary History ({history.length})</span>
          </button>

          <button
            className={`btn ${activeTab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            onClick={() => {
              if (activeStructure) setAnnualCTC(activeStructure.annualCTC.toString());
              setActiveTab('new');
            }}
          >
            <Plus size={15} />
            <span>Revise Salary Structure</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading employee salary details...
          </div>
        ) : (
          <>
            {/* Tab 1: Current Active Structure */}
            {activeTab === 'current' && (
              <div>
                {!activeStructure ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No active salary structure found for this employee.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Top Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                      <div className="ui-card">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Annual CTC</span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                          ₹ {activeStructure.annualCTC.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="ui-card">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monthly CTC</span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                          ₹ {activeStructure.monthlyCTC.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="ui-card">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gross Earnings</span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
                          ₹ {activeStructure.grossEarnings.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="ui-card">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Estimated Net Pay</span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3730A3', marginTop: '0.2rem' }}>
                          ₹ {activeStructure.estimatedNetPay.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Meta Status */}
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span><strong>Effective From:</strong> {new Date(activeStructure.effectiveFrom).toLocaleDateString()}</span>
                      <span>•</span>
                      <span><strong>Status:</strong> <span className="badge badge-success">Active</span></span>
                      <span>•</span>
                      <span><strong>PF:</strong> {activeStructure.pfApplicable ? 'Yes' : 'No'}</span>
                      <span>•</span>
                      <span><strong>ESI:</strong> {activeStructure.esiApplicable ? 'Yes' : 'No'}</span>
                    </div>

                    {/* Component Table */}
                    <div className="table-container" style={{ padding: 0 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Component Name</th>
                            <th>Type</th>
                            <th>Calculation</th>
                            <th style={{ textAlign: 'right' }}>Monthly Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeStructure.components.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>Basic CTC setup (Detailed components configure later).</td></tr>
                          ) : (
                            activeStructure.components.map((c, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{c.componentName}</td>
                                <td>
                                  <span className={`badge ${c.isEarning ? 'badge-success' : 'badge-danger'}`}>
                                    {c.isEarning ? 'Earning' : c.isEmployerContribution ? 'Employer Contrib' : 'Deduction'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {c.calculationType === 0 ? `${c.percentage}%` : c.calculationType === 2 ? 'Auto Balance' : 'Fixed Amount'}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: c.isEarning ? '#059669' : '#DC2626' }}>
                                  ₹ {c.monthlyAmount.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Salary History */}
            {activeTab === 'history' && (
              <div className="table-container" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Annual CTC</th>
                      <th>Monthly CTC</th>
                      <th>Effective Dates</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No salary history recorded.</td></tr>
                    ) : (
                      history.map((h) => (
                        <tr key={h.id}>
                          <td style={{ fontWeight: 700 }}>₹ {h.annualCTC.toLocaleString('en-IN')}</td>
                          <td>₹ {h.monthlyCTC.toLocaleString('en-IN')}</td>
                          <td>
                            {new Date(h.effectiveFrom).toLocaleDateString()} ➔ {h.effectiveTo ? new Date(h.effectiveTo).toLocaleDateString() : 'Present'}
                          </td>
                          <td>
                            <span className={`badge ${h.isActive ? 'badge-success' : 'badge-secondary'}`}>
                              {h.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Revise Salary Structure Form */}
            {activeTab === 'new' && (
              <form onSubmit={handleCreateRevision} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ margin: 0 }}>Create New Salary Revision</h4>

                {revError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                    ⚠️ {revError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">New Annual CTC (₹) *</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      value={annualCTC}
                      onKeyDown={handleKeyDownNonNegative}
                      onChange={handleNonNegativeChange(setAnnualCTC)}
                      placeholder="e.g. 500000"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Effective From Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={pfApplicable} onChange={(e) => setPfApplicable(e.target.checked)} />
                    <span>PF Applicable</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={esiApplicable} onChange={(e) => setEsiApplicable(e.target.checked)} />
                    <span>ESI Applicable</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={ptApplicable} onChange={(e) => setPtApplicable(e.target.checked)} />
                    <span>Professional Tax</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={tdsApplicable} onChange={(e) => setTdsApplicable(e.target.checked)} />
                    <span>TDS Applicable</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('current')}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving Revision...' : 'Save New Revision'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
