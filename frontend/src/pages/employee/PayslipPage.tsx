import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, Printer, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import rntFullLogo from '../../assets/RNTFulllogo.png';

interface Payslip {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  designationName: string;
  dateOfJoining: string;
  panNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  aadhaarNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  month: number;
  year: number;

  // Earnings
  basicPay: number;
  hra: number;
  conveyance: number;
  medical: number;
  allowances: number;
  arrears: number;
  totalSalary: number;

  // Deductions
  lopDeduction: number;
  esi: number;
  pf: number;
  parkingCharges: number;
  tds: number;
  totalDeduction: number;

  // Net
  netPay: number;

  // Attendance
  lopDays: number;
  leavesTaken: number;
  permissionsUsed: number;
  graceViolations: number;
  monthlyAllowedLeave?: number;
  actualLeaveDays?: number;
  sandwichLeaveDays?: number;
  leaveLOPDays?: number;
  lateLoginLOPDays?: number;
  dailySalary?: number;
  createdAt: string;
}

interface PayPeriodOption {
  year: number;
  month: number;
  monthName: string;
  payslip?: Payslip;
  isGenerated: boolean;
}

export const PayslipPage: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId || 0;

  const [history, setHistory] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeDoj, setEmployeeDoj] = useState<string>('');
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  const fetchPayslips = async () => {
    try {
      const [payslipsRes, profileRes] = await Promise.allSettled([
        apiClient.get(`/payroll/my-payslips/${employeeId}`),
        apiClient.get('/employees/profile'),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
        setEmployeeDoj(profileRes.value.data.data.dateOfJoining || '');
      }

      if (payslipsRes.status === 'fulfilled' && payslipsRes.value.data?.success) {
        const list = Array.isArray(payslipsRes.value.data.data)
          ? payslipsRes.value.data.data
          : (payslipsRes.value.data.data?.items || []);

        if (list.length > 0) {
          setHistory(list);
          setSelectedPayslip(list[0]);
          if (list[0].dateOfJoining) {
            setEmployeeDoj((prev) => prev || list[0].dateOfJoining);
          }
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) fetchPayslips();
  }, [employeeId]);

  const handlePrint = () => {
    window.print();
  };

  const monthFullNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    const day = d.getDate().toString().padStart(2, '0');
    const monthNum = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${monthNum}/${year}`;
  };

  const generatePayPeriods = (
    dojDateStr?: string,
    existingPayslips: Payslip[] = []
  ): PayPeriodOption[] => {
    const options: PayPeriodOption[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    let startYear = currentYear;
    let startMonth = currentMonth;

    let dojSource = dojDateStr;
    if (!dojSource && existingPayslips.length > 0 && existingPayslips[0].dateOfJoining) {
      dojSource = existingPayslips[0].dateOfJoining;
    }

    if (dojSource) {
      const doj = new Date(dojSource);
      if (!isNaN(doj.getTime())) {
        startYear = doj.getFullYear();
        startMonth = doj.getMonth() + 1;
      }
    }

    const payslipMap = new Map<string, Payslip>();
    existingPayslips.forEach((p) => {
      payslipMap.set(`${p.year}-${p.month}`, p);
    });

    let y = currentYear;
    let m = currentMonth;

    while (y > startYear || (y === startYear && m >= startMonth)) {
      const payslip = payslipMap.get(`${y}-${m}`);
      options.push({
        year: y,
        month: m,
        monthName: monthFullNames[m],
        payslip,
        isGenerated: !!payslip,
      });

      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
    }

    return options;
  };

  const payPeriodOptions = generatePayPeriods(employeeDoj, history);

  const groupedByYear = payPeriodOptions.reduce((acc, opt) => {
    if (!acc[opt.year]) acc[opt.year] = [];
    acc[opt.year].push(opt);
    return acc;
  }, {} as Record<number, PayPeriodOption[]>);

  const optionYears = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => b - a);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: prev[year] === false ? true : false,
    }));
  };


  // Convert numbers to words (Indian Currency standard)
  const numberToWords = (num: number): string => {
    if (!num || num === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
    };

    return `Rupees ${inWords(Math.floor(num))} Only`;
  };

  return (
    <div>
      <div className="header hide-on-print">
        <div>
          <h2>My Monthly Payslips</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Official Salary Statement & Payslip Voucher
          </p>
        </div>

        {selectedPayslip && (
          <button className="btn btn-primary" onClick={handlePrint} style={{ background: 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)', borderColor: '#E8873C' }}>
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="ui-card">Loading payslips...</div>
      ) : history.length === 0 ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CreditCard size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <h3>No payslips available yet.</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Payslips will appear here once monthly payroll is processed by Admin.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
          {/* History Selection Sidebar */}
          <div className="ui-card hide-on-print" style={{ padding: '1.25rem', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select Pay Period</h4>
              <span style={{ fontSize: '0.7rem', background: '#fff4e6', color: '#E8873C', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                {history.length} Generated
              </span>
            </div>

            {/* Scrollable Container with Max Height */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {optionYears.map((year) => {
                const isExpanded = expandedYears[year] !== false; // Expanded by default
                const yearOptions = groupedByYear[year];
                const generatedInYear = yearOptions.filter((o) => o.isGenerated).length;

                return (
                  <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {/* Year Header */}
                    <button
                      type="button"
                      onClick={() => toggleYear(year)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#111827',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {isExpanded ? <ChevronDown size={14} style={{ color: '#E8873C' }} /> : <ChevronRight size={14} style={{ color: '#9ca3af' }} />}
                        <span>{year}</span>
                      </div>
                      <span style={{ fontSize: '0.685rem', color: '#6b7280', fontWeight: 500 }}>
                        {generatedInYear} / {yearOptions.length}
                      </span>
                    </button>

                    {/* Months List */}
                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '0.25rem' }}>
                        {yearOptions.map((opt) => {
                          const isSelected = selectedPayslip?.year === opt.year && selectedPayslip?.month === opt.month;

                          if (opt.isGenerated && opt.payslip) {
                            return (
                              <button
                                key={`${opt.year}-${opt.month}`}
                                type="button"
                                onClick={() => setSelectedPayslip(opt.payslip!)}
                                className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                style={{
                                  justifyContent: 'space-between',
                                  padding: '0.55rem 0.75rem',
                                  fontSize: '0.825rem',
                                  background: isSelected
                                    ? 'linear-gradient(135deg, #E8873C 0%, #F5A15D 100%)'
                                    : '#ffffff',
                                  borderColor: isSelected ? '#E8873C' : '#e5e7eb',
                                  color: isSelected ? '#FFFFFF' : '#374151',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Calendar size={14} style={{ color: isSelected ? '#FFFFFF' : '#E8873C' }} />
                                  <span>{opt.monthName}</span>
                                </div>
                              </button>
                            );
                          }

                          // Un-generated Month (Grayed Out Disabled State)
                          return (
                            <div
                              key={`${opt.year}-${opt.month}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                background: '#f9fafb',
                                border: '1px dashed #e5e7eb',
                                color: '#9ca3af',
                                cursor: 'not-allowed',
                                userSelect: 'none',
                              }}
                              title="Payslip not yet generated for this month"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={14} style={{ opacity: 0.5 }} />
                                <span>{opt.monthName}</span>
                              </div>
                              <span style={{ fontSize: '0.675rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                Not generated
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Corporate Printable Payslip Template */}
          {selectedPayslip && (() => {
            const totalDaysInMonth = new Date(selectedPayslip.year, selectedPayslip.month, 0).getDate();
            const workedDays = Math.max(0, totalDaysInMonth - (selectedPayslip.lopDays || 0));

            return (
              <div className="payslip-print-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {/* Outer Frame */}
                <div style={{
                  width: '100%',
                  maxWidth: '820px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  boxSizing: 'border-box',
                  margin: '0 auto'
                }}>
                  {/* Inner Official White Printable Document Card */}
                  <div className="payslip-document-card" style={{
                    width: '100%',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontFamily: "'Inter', Arial, Helvetica, sans-serif",
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0'
                  }}>

                    {/* 1. Header Block: Company Logo & Official Registered Address */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1.25rem 1.5rem',
                      borderBottom: '2px solid rgba(255,255,255,0.1)',
                      backgroundColor: '#0F172A'
                    }}>
                      {/* Left: Official Company Full Logo */}
                      <div>
                        <img
                          src={rntFullLogo}
                          alt="Reshand & Thosh Technologies Logo"
                          style={{ height: '52px', objectFit: 'contain' }}
                        />
                      </div>

                      {/* Right: Company Registered Address */}
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#FFFFFF', lineHeight: 1.45 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', marginBottom: '4px' }}>
                          RESHAND & THOSH TECHNOLOGIES PVT LTD
                        </div>
                        <div style={{ color: '#FFFFFF' }}>Registered Address: Featherlite, The Address, Block B, 4th Floor</div>
                        <div style={{ color: '#FFFFFF' }}>200feet Radial Road, Zamin Pallavaram, Chennai - 600044</div>
                      </div>
                    </div>

                    {/* 2. Sub-Header: Month & Year Bar */}
                    <div style={{
                      backgroundColor: '#0F172A',
                      textAlign: 'center',
                      padding: '10px 0',
                      fontSize: '13px',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      color: '#FFFFFF',
                      textTransform: 'uppercase'
                    }}>
                      PAYSLIP FOR THE MONTH OF {monthFullNames[selectedPayslip.month]} {selectedPayslip.year}
                    </div>

                    {/* 3. Employee & Attendance Info Grid */}
                    <div style={{ padding: '1.25rem', backgroundColor: '#FFFFFF' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                        <tbody>
                          <tr style={{ backgroundColor: '#FFFFFF' }}>
                            <td className="label-cell" style={{ width: '18%', padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Employee Code</td>
                            <td style={{ width: '32%', padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>{selectedPayslip.employeeCode}</td>
                            <td className="label-cell" style={{ width: '18%', padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Employee Name</td>
                            <td style={{ width: '32%', padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>{selectedPayslip.employeeName}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#FFFFFF' }}>
                            <td className="label-cell" style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Designation</td>
                            <td style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>{selectedPayslip.designationName}</td>
                            <td className="label-cell" style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Department</td>
                            <td style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>{selectedPayslip.departmentName}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#FFFFFF' }}>
                            <td className="label-cell" style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Date of Joining</td>
                            <td style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>{formatDate(selectedPayslip.dateOfJoining)}</td>
                            <td className="label-cell" style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Bank Account No</td>
                            <td style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>
                              {selectedPayslip.bankAccountNumber || `50100${(selectedPayslip.employeeId * 18491).toString().padStart(7, '0')}`}
                            </td>
                          </tr>
                          <tr style={{ backgroundColor: '#FFFFFF' }}>
                            <td className="label-cell" style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Bank Name</td>
                            <td style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>
                              {selectedPayslip.bankName || 'HDFC Bank Ltd'}
                            </td>
                            <td className="label-cell" style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>PAN / UAN No</td>
                            <td style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>
                              {selectedPayslip.panNumber || selectedPayslip.pfNumber || 'ABCDE1234F'}
                            </td>
                          </tr>
                          <tr style={{ backgroundColor: '#FFFFFF' }}>
                            <td className="label-cell" style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Total Days</td>
                            <td style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>{totalDaysInMonth} Days</td>
                            <td className="label-cell" style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Worked Days / LOP</td>
                            <td style={{ padding: '7px 10px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', fontWeight: 600, color: '#0F172A' }}>
                              {workedDays} Days <span style={{ color: selectedPayslip.lopDays > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>({selectedPayslip.lopDays} LOP)</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Detailed LOP Audit Breakdown Bar (Responsive 3-Column Grid) */}
                      <div style={{
                        marginTop: '0.85rem',
                        padding: '12px 16px',
                        backgroundColor: selectedPayslip.lopDays > 0 ? '#FEF2F2' : '#F8FAFC',
                        border: `1px solid ${selectedPayslip.lopDays > 0 ? '#FCA5A5' : '#E2E8F0'}`,
                        borderRadius: '8px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px 24px',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Daily Rate (/31)</span>
                          <strong style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                            ₹{(selectedPayslip.dailySalary || (selectedPayslip.totalSalary / 31)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Allowed Leave</span>
                          <strong style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                            {selectedPayslip.monthlyAllowedLeave ?? 1} Day
                          </strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Leaves Taken</span>
                          <strong style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                            {selectedPayslip.actualLeaveDays ?? selectedPayslip.leavesTaken ?? 0} Day(s)
                          </strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Sandwich Leave</span>
                          <strong style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                            {selectedPayslip.sandwichLeaveDays ?? 0} Day(s)
                          </strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Leave LOP</span>
                          <strong style={{ fontSize: '13px', fontWeight: 700, color: (selectedPayslip.leaveLOPDays || 0) > 0 ? '#DC2626' : '#0F172A', whiteSpace: 'nowrap' }}>
                            {selectedPayslip.leaveLOPDays ?? 0} Day(s)
                          </strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Late Login LOP</span>
                          <strong style={{ fontSize: '13px', fontWeight: 700, color: (selectedPayslip.lateLoginLOPDays || 0) > 0 ? '#DC2626' : '#0F172A', whiteSpace: 'nowrap' }}>
                            {selectedPayslip.lateLoginLOPDays ?? 0} Day(s)
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* 4. Earnings & Deductions Unified Table */}
                    <div style={{ padding: '0 1.25rem 1rem', backgroundColor: '#FFFFFF' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                            <th style={{ width: '35%', padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #E2E8F0', fontWeight: 800, color: '#0F172A', backgroundColor: '#F1F5F9' }}>EARNINGS</th>
                            <th style={{ width: '15%', padding: '8px 10px', textAlign: 'right', borderRight: '1px solid #CBD5E1', fontWeight: 800, color: '#0F172A', backgroundColor: '#F1F5F9' }}>AMOUNT (₹)</th>
                            <th style={{ width: '35%', padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #E2E8F0', fontWeight: 800, color: '#0F172A', backgroundColor: '#F1F5F9' }}>DEDUCTIONS</th>
                            <th style={{ width: '15%', padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0F172A', backgroundColor: '#F1F5F9' }}>AMOUNT (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ backgroundColor: '#FFFFFF' }}>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#FFFFFF' }}>Basic Salary</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#FFFFFF' }}>₹{selectedPayslip.basicPay.toLocaleString()}</td>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#FFFFFF' }}>PF (Provident Fund)</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#FFFFFF' }}>₹{selectedPayslip.pf.toLocaleString()}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#F8FAFC' }}>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#F8FAFC' }}>House Rent Allowance (HRA)</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#F8FAFC' }}>₹{selectedPayslip.hra.toLocaleString()}</td>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#F8FAFC' }}>ESI</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#F8FAFC' }}>₹{selectedPayslip.esi.toLocaleString()}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#FFFFFF' }}>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#FFFFFF' }}>Conveyance Allowance</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#FFFFFF' }}>₹{selectedPayslip.conveyance.toLocaleString()}</td>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#FFFFFF' }}>Loss of Pay (LOP) Deduction</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: selectedPayslip.lopDeduction > 0 ? '#DC2626' : '#0F172A', backgroundColor: '#FFFFFF' }}>₹{selectedPayslip.lopDeduction.toLocaleString()}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#F8FAFC' }}>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#F8FAFC' }}>Medical Allowance</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#F8FAFC' }}>₹{selectedPayslip.medical.toLocaleString()}</td>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#F8FAFC' }}>Professional Tax / TDS</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#F8FAFC' }}>₹{selectedPayslip.tds.toLocaleString()}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#FFFFFF' }}>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#FFFFFF' }}>Special Allowances</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#FFFFFF' }}>₹{selectedPayslip.allowances.toLocaleString()}</td>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #F1F5F9', color: '#334155', backgroundColor: '#FFFFFF' }}>Parking Charges / Other</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', backgroundColor: '#FFFFFF' }}>₹{selectedPayslip.parkingCharges.toLocaleString()}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#F8FAFC' }}>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', color: '#334155', backgroundColor: '#F8FAFC' }}>Arrears</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #CBD5E1', fontWeight: 600, color: '#0F172A', backgroundColor: '#F8FAFC' }}>₹{selectedPayslip.arrears.toLocaleString()}</td>
                            <td style={{ padding: '6px 10px', borderRight: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}></td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', backgroundColor: '#F8FAFC' }}></td>
                          </tr>

                          {/* Total Summary Row */}
                          <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                            <td style={{ padding: '8px 10px', borderRight: '1px solid #E2E8F0', color: '#0F172A', fontSize: '12px', backgroundColor: '#F8FAFC' }}>TOTAL EARNINGS (A)</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', borderRight: '1px solid #CBD5E1', color: '#0F172A', fontSize: '12px', backgroundColor: '#F8FAFC' }}>₹{selectedPayslip.totalSalary.toLocaleString()}</td>
                            <td style={{ padding: '8px 10px', borderRight: '1px solid #E2E8F0', color: '#0F172A', fontSize: '12px', backgroundColor: '#F8FAFC' }}>TOTAL DEDUCTIONS (B)</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#DC2626', fontSize: '12px', backgroundColor: '#F8FAFC' }}>₹{selectedPayslip.totalDeduction.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 5. Net Payable Box & Amount in Words */}
                    <div style={{
                      margin: '0 1.25rem 1.25rem',
                      padding: '14px 18px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>NET PAYABLE AMOUNT</span>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#0284C7' }}>₹{selectedPayslip.netPay.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', fontStyle: 'italic' }}>
                        Amount in Words: <span style={{ color: '#0F172A', fontWeight: 700 }}>{numberToWords(selectedPayslip.netPay)}</span>
                      </div>
                    </div>

                    {/* 6. Footer Notice */}
                    <div style={{
                      textAlign: 'center',
                      padding: '12px',
                      fontSize: '11px',
                      color: '#64748B',
                      borderTop: '1px solid #E2E8F0',
                      backgroundColor: '#FAFAFA'
                    }}>
                      This is a computer-generated payslip voucher and does not require a physical signature.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Payslip Card Strict Light Theme & Print Stylesheet */}
      <style>{`
        .payslip-document-card,
        .payslip-document-card * {
          box-sizing: border-box;
        }
        .payslip-document-card table {
          background-color: #FFFFFF !important;
          color: #0F172A !important;
        }
        .payslip-document-card tr {
          background-color: #FFFFFF !important;
          color: #0F172A !important;
        }
        .payslip-document-card td {
          color: #0F172A !important;
        }
        .payslip-document-card td.label-cell {
          background-color: #F8FAFC !important;
          color: #475569 !important;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .payslip-print-container, .payslip-print-container * {
            visibility: visible;
          }
          .payslip-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            padding: 0 !important;
          }
          .payslip-print-container > div {
            background: #FFFFFF !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .hide-on-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
