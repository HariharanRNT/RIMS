import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { Play, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PayslipItem {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  designationName: string;
  basicPay?: number;
  totalSalary?: number;
  deductions?: number;
  totalDeduction?: number;
  lopDeduction?: number;
  netPay?: number;
  lopDays?: number;
  leavesTaken?: number;
  permissionsUsed?: number;
  graceViolations?: number;
  monthlyAllowedLeave?: number;
  actualLeaveDays?: number;
  sandwichLeaveDays?: number;
  leaveLOPDays?: number;
  lateLoginLOPDays?: number;
  dailySalary?: number;
}

interface Summary {
  month: number;
  year: number;
  totalEmployees: number;
  totalBasicPay: number;
  totalDeductions: number;
  totalNetPay: number;
  payslips: PayslipItem[];
}

export const PayrollProcessingPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/payroll/summary?month=${month}&year=${year}`);
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [month, year]);

  const handleProcessPayroll = async () => {
    setProcessing(true);
    setMsg('');
    setError('');

    try {
      const res = await apiClient.post('/payroll/process', { month, year });
      if (res.data.success) {
        setMsg(`Monthly payroll for ${month}/${year} processed successfully.`);
        setSummary(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process monthly payroll.');
    } finally {
      setProcessing(false);
    }
  };

  const months = [
    { id: 1, name: 'January' }, { id: 2, name: 'February' }, { id: 3, name: 'March' },
    { id: 4, name: 'April' }, { id: 5, name: 'May' }, { id: 6, name: 'June' },
    { id: 7, name: 'July' }, { id: 8, name: 'August' }, { id: 9, name: 'September' },
    { id: 10, name: 'October' }, { id: 11, name: 'November' }, { id: 12, name: 'December' },
  ];

  const getDeduction = (p: PayslipItem) => p.totalDeduction ?? p.deductions ?? p.lopDeduction ?? 0;
  const getBasic = (p: PayslipItem) => p.basicPay ?? p.totalSalary ?? 0;
  const getNet = (p: PayslipItem) => p.netPay ?? 0;

  return (
    <div>
      <div className="header">
        <div>
          <h2>Payroll & LOP Engine</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Monthly payroll processing, LOP calculations, and payslip generation
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleProcessPayroll}
          disabled={processing}
          style={{ padding: '0.65rem 1.2rem' }}
        >
          <Play size={18} />
          <span>{processing ? 'Processing...' : `Process Payroll (${month}/${year})`}</span>
        </button>
      </div>

      {msg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--success)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Month / Year Selector Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ minWidth: '180px' }}>
          <label className="form-label">Month</label>
          <select
            className="form-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '140px' }}>
          <label className="form-label">Year</label>
          <input
            type="number"
            className="form-input"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Stat Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Employees</span>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.3rem' }}>{summary.totalEmployees ?? 0}</h3>
          </div>
          <div className="glass-card">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gross Basic Pay</span>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.3rem', color: 'var(--info)' }}>
              ₹{(summary.totalBasicPay ?? 0).toLocaleString()}
            </h3>
          </div>
          <div className="glass-card">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total LOP Deductions</span>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.3rem', color: 'var(--danger)' }}>
              ₹{(summary.totalDeductions ?? 0).toLocaleString()}
            </h3>
          </div>
          <div className="glass-card">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Disbursed</span>
            <h3 style={{ fontSize: '1.5rem', marginTop: '0.3rem', color: 'var(--success)' }}>
              ₹{(summary.totalNetPay ?? 0).toLocaleString()}
            </h3>
          </div>
        </div>
      )}

      {/* Summary Table */}
      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Payroll Disbursal Table</h3>
      <div className="glass-card table-container" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Grace Violations</th>
              <th>LOP Days</th>
              <th>Basic Pay</th>
              <th>Deductions</th>
              <th>Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading payroll summary...</td></tr>
            ) : !summary || !summary.payslips || summary.payslips.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No payroll processed for selected month/year. Click "Process Payroll" to calculate.</td></tr>
            ) : (
              summary.payslips.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{p.employeeCode}</td>
                  <td style={{ fontWeight: 600 }}>{p.employeeName}</td>
                  <td>{p.departmentName}</td>
                  <td>
                    <span className={`badge ${(p.graceViolations ?? 0) >= 3 ? 'badge-danger' : 'badge-info'}`}>
                      {p.graceViolations ?? 0} Late Logins
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: (p.lopDays ?? 0) > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {p.lopDays ?? 0} Days
                  </td>
                  <td>₹{getBasic(p).toLocaleString()}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>-₹{getDeduction(p).toLocaleString()}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 700 }}>₹{getNet(p).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
