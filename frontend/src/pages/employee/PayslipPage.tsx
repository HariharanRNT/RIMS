import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { CreditCard, Printer, Calendar } from 'lucide-react';
import rntFullLogo from '../../assets/RNTFulllogo.png';

interface Payslip {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  designationName: string;
  dateOfJoining: string;
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
  createdAt: string;
}

export const PayslipPage: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId || 0;

  const [history, setHistory] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPayslips = async () => {
    try {
      const res = await apiClient.get(`/payroll/my-payslips/${employeeId}`);
      if (res.data.success && res.data.data.length > 0) {
        setHistory(res.data.data);
        setSelectedPayslip(res.data.data[0]);
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
          <button className="btn btn-primary" onClick={handlePrint} style={{ background: 'linear-gradient(135deg, #7B61FF 0%, #6C5CE7 100%)', borderColor: '#7B61FF' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem' }}>
          {/* History Selection Sidebar */}
          <div className="ui-card hide-on-print" style={{ padding: '1rem', height: 'fit-content' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select Pay Period</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPayslip(p)}
                  className={`btn ${selectedPayslip?.id === p.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    justifyContent: 'flex-start',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    background: selectedPayslip?.id === p.id ? 'linear-gradient(135deg, #7B61FF 0%, #6C5CE7 100%)' : '#FFFFFF'
                  }}
                >
                  <Calendar size={14} />
                  <span>{monthFullNames[p.month]} {p.year}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Official Corporate Printable Payslip Template */}
          {selectedPayslip && (() => {
            const totalDaysInMonth = new Date(selectedPayslip.year, selectedPayslip.month, 0).getDate();
            const workedDays = Math.max(0, totalDaysInMonth - (selectedPayslip.lopDays || 0));

            return (
              <div className="payslip-print-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  maxWidth: '780px',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontFamily: "'Inter', Arial, Helvetica, sans-serif",
                  border: '2px solid #0F172A',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  boxSizing: 'border-box',
                  margin: '0 auto'
                }}>

                  {/* 1. Header Block: Company Logo & Official Registered Address */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '2px solid #0F172A'
                  }}>
                    {/* Left: Official Company Full Logo */}
                    <div>
                      <img
                        src={rntFullLogo}
                        alt="Reshand & Thosh Technologies Logo"
                        style={{ height: '54px', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Right: Company Registered Address */}
                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#334155', lineHeight: 1.4 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em', marginBottom: '2px' }}>
                        RESHAND & THOSH TECHNOLOGIES PVT LTD
                      </div>
                      <div>Registered Address: Featherlite, The Address, Block B, 4th Floor</div>
                      <div>200feet Radial Road, Zamin Pallavaram, Chennai -600044</div>
                    </div>

                  </div>

                  {/* 2. Sub-Header: Month & Year Bar */}
                  <div style={{
                    backgroundColor: '#F1F5F9',
                    borderBottom: '2px solid #0F172A',
                    textAlign: 'center',
                    padding: '8px 0',
                    fontSize: '14px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#0F172A',
                    textTransform: 'uppercase'
                  }}>
                    PAYSLIP FOR THE MONTH OF {monthFullNames[selectedPayslip.month]} {selectedPayslip.year}
                  </div>

                  {/* 3. Employee & Attendance Info Grid */}
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #0F172A' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '18%', padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Employee Code</td>
                          <td style={{ width: '32%', padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>{selectedPayslip.employeeCode}</td>
                          <td style={{ width: '18%', padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Employee Name</td>
                          <td style={{ width: '32%', padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>{selectedPayslip.employeeName}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Designation</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>{selectedPayslip.designationName}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Department</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>{selectedPayslip.departmentName}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Date of Joining</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>{formatDate(selectedPayslip.dateOfJoining)}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Bank Account No</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>XXXX XXXX 8892</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Bank Name</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>HDFC Bank</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>PAN / UAN No</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>ABCDE1234F</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Total Days</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>{totalDaysInMonth} Days</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', backgroundColor: '#F8FAFC', fontWeight: 700, color: '#475569' }}>Worked Days / LOP</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #0F172A', fontWeight: 600, color: '#0F172A' }}>
                            {workedDays} Days <span style={{ color: selectedPayslip.lopDays > 0 ? '#EF4444' : '#059669' }}>({selectedPayslip.lopDays} LOP)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Earnings & Deductions Unified Table */}
                  <div style={{ padding: '0 1.25rem 1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '2px solid #0F172A' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #0F172A' }}>
                          <th style={{ width: '35%', padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #0F172A', fontWeight: 800, color: '#0F172A' }}>EARNINGS</th>
                          <th style={{ width: '15%', padding: '8px 10px', textAlign: 'right', borderRight: '2px solid #0F172A', fontWeight: 800, color: '#0F172A' }}>AMOUNT (₹)</th>
                          <th style={{ width: '35%', padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #0F172A', fontWeight: 800, color: '#0F172A' }}>DEDUCTIONS</th>
                          <th style={{ width: '15%', padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>AMOUNT (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>Basic Salary</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '2px solid #0F172A', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.basicPay.toLocaleString()}</td>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>PF (Provident Fund)</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.pf.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>House Rent Allowance (HRA)</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '2px solid #0F172A', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.hra.toLocaleString()}</td>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>ESI</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.esi.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>Conveyance Allowance</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '2px solid #0F172A', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.conveyance.toLocaleString()}</td>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>Loss of Pay (LOP) Deduction</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: selectedPayslip.lopDeduction > 0 ? '#EF4444' : '#0F172A' }}>₹{selectedPayslip.lopDeduction.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>Medical Allowance</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '2px solid #0F172A', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.medical.toLocaleString()}</td>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>Professional Tax / TDS</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.tds.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>Special Allowances</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '2px solid #0F172A', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.allowances.toLocaleString()}</td>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A', borderBottom: '1px solid #E2E8F0' }}>Parking Charges / Other</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', fontWeight: 600 }}>₹{selectedPayslip.parkingCharges.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A' }}>Arrears</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '2px solid #0F172A', fontWeight: 600 }}>₹{selectedPayslip.arrears.toLocaleString()}</td>
                          <td style={{ padding: '6px 10px', borderRight: '1px solid #0F172A' }}></td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}></td>
                        </tr>

                        {/* Total Summary Row */}
                        <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #0F172A', fontWeight: 800 }}>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #0F172A', color: '#0F172A', fontSize: '13px' }}>TOTAL EARNINGS (A)</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', borderRight: '2px solid #0F172A', color: '#0F172A', fontSize: '13px' }}>₹{selectedPayslip.totalSalary.toLocaleString()}</td>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #0F172A', color: '#0F172A', fontSize: '13px' }}>TOTAL DEDUCTIONS (B)</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#EF4444', fontSize: '13px' }}>₹{selectedPayslip.totalDeduction.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 5. Net Payable Box & Amount in Words */}
                  <div style={{
                    margin: '0 1.25rem 1rem',
                    padding: '12px 16px',
                    backgroundColor: '#F1F5F9',
                    border: '2px solid #0F172A',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>NET PAYABLE AMOUNT (A - B)</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#7B61FF' }}>₹{selectedPayslip.netPay.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', fontStyle: 'italic' }}>
                      Amount in Words: <span style={{ color: '#0F172A' }}>{numberToWords(selectedPayslip.netPay)}</span>
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
            );
          })()}
        </div>
      )}

      {/* Print Stylesheet */}
      <style>{`
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
          }
          .hide-on-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
