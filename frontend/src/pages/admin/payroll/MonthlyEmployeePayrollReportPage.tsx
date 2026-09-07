import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  Lock
} from 'lucide-react';
import {
  monthlyEmployeeReportApi
} from '../../../api/monthlyEmployeeReportApi';
import type { MonthlyEmployeePayrollReportItem } from '../../../api/monthlyEmployeeReportApi';
import {
  attendanceCalendarApi
} from '../../../api/attendanceCalendarApi';
import type { MonthAccessValidationDto } from '../../../api/attendanceCalendarApi';
import { useDebounce } from '../../../hooks/useDebounce';
import { Pagination } from '../../../components/ui/Pagination';

export const MonthlyEmployeePayrollReportPage: React.FC = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<MonthlyEmployeePayrollReportItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 350);

  // Access validation state
  const [accessValidation, setAccessValidation] = useState<MonthAccessValidationDto | null>(null);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(false);

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const months = [
    { id: 1, name: 'January' },
    { id: 2, name: 'February' },
    { id: 3, name: 'March' },
    { id: 4, name: 'April' },
    { id: 5, name: 'May' },
    { id: 6, name: 'June' },
    { id: 7, name: 'July' },
    { id: 8, name: 'August' },
    { id: 9, name: 'September' },
    { id: 10, name: 'October' },
    { id: 11, name: 'November' },
    { id: 12, name: 'December' }
  ];

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const checkAccessValidation = async () => {
    setCheckingAccess(true);
    try {
      const data = await attendanceCalendarApi.getAccessValidation(selectedYear, selectedMonth);
      setAccessValidation(data);
      return data;
    } catch {
      const now = new Date();
      const currYear = now.getFullYear();
      const currMonth = now.getMonth() + 1;
      const isEnded = currYear > selectedYear || (currYear === selectedYear && currMonth > selectedMonth);
      const fallback: MonthAccessValidationDto = {
        year: selectedYear,
        month: selectedMonth,
        monthName: months.find(m => m.id === selectedMonth)?.name || `Month ${selectedMonth}`,
        isMonthEnded: isEnded,
        nextYear: selectedMonth === 12 ? selectedYear + 1 : selectedYear,
        nextMonth: selectedMonth === 12 ? 1 : selectedMonth + 1,
        nextMonthName: months.find(m => m.id === (selectedMonth === 12 ? 1 : selectedMonth + 1))?.name || '',
        isNextMonthPublished: false,
        canProcessPayroll: false,
        canGenerateReport: false,
        reasonMessage: !isEnded
          ? 'Generating the monthly employee report is disabled because the selected month has not completely ended.'
          : "The next month's Monthly Attendance Calendar must be published before generating the report."
      };
      setAccessValidation(fallback);
      return fallback;
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchReport = async (validation?: MonthAccessValidationDto | null) => {
    const currentValidation = validation !== undefined ? validation : accessValidation;
    if (currentValidation && !currentValidation.canGenerateReport) {
      setReportData(null);
      setTotalCount(0);
      setTotalPages(0);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await monthlyEmployeeReportApi.getMonthlyEmployeeReport(
        selectedYear,
        selectedMonth,
        page,
        pageSize,
        debouncedSearch
      );
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setReportData(response.data);
          setTotalCount(response.data.length);
          setTotalPages(1);
        } else {
          setReportData(response.data.items || []);
          setTotalCount(response.data.totalCount || 0);
          setTotalPages(response.data.totalPages || 0);
        }
      } else {
        setErrorMessage(response.message || 'Failed to load monthly employee report.');
        setReportData([]);
        setTotalCount(0);
        setTotalPages(0);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to load monthly employee report.'
      );
      setReportData([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedMonth, selectedYear, debouncedSearch]);

  useEffect(() => {
    const runValidationAndFetch = async () => {
      const val = await checkAccessValidation();
      if (val && val.canGenerateReport) {
        fetchReport(val);
      } else {
        setReportData(null);
        setTotalCount(0);
        setTotalPages(0);
      }
    };
    runValidationAndFetch();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (accessValidation?.canGenerateReport) {
      fetchReport();
    }
  }, [page, pageSize, debouncedSearch]);

  const handleGenerateReport = () => {
    fetchReport();
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const blob = await monthlyEmployeeReportApi.downloadMonthlyEmployeeReport(
        selectedYear,
        selectedMonth
      );
      const selectedMonthObj = months.find((m) => m.id === selectedMonth);
      const monthName = selectedMonthObj ? selectedMonthObj.name : `Month_${selectedMonth}`;

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Monthly_Payroll_Report_${monthName}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download Excel report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const filteredData = reportData || [];

  const monthName = months.find((m) => m.id === selectedMonth)?.name || `Month ${selectedMonth}`;

  // KPI Calculations
  // const totalEmployees = reportData ? reportData.length : 0;
  // const totalWorkingDays = reportData && reportData.length > 0 ? reportData[0].workingDays : 0;
  // const totalPresentDaysSum = reportData ? reportData.reduce((acc, curr) => acc + curr.presentDays, 0) : 0;
  // const totalLeaveDaysSum = reportData ? reportData.reduce((acc, curr) => acc + curr.approvedLeaveDays, 0) : 0;
  // const totalPermissionsSum = reportData ? reportData.reduce((acc, curr) => acc + curr.permissionCount, 0) : 0;
  // const totalLateLoginsSum = reportData ? reportData.reduce((acc, curr) => acc + curr.lateLoginCount, 0) : 0;
  // const totalLopDaysSum = reportData ? reportData.reduce((acc, curr) => acc + curr.totalLOPDays, 0) : 0;
  // const totalLopAmountSum = reportData ? reportData.reduce((acc, curr) => acc + curr.lopAmount, 0) : 0;
  // const totalFinalSalarySum = reportData ? reportData.reduce((acc, curr) => acc + curr.finalSalary, 0) : 0;

  const canGenerate = accessValidation ? accessValidation.canGenerateReport : false;

  return (
    <div>
      {/* 1. Header Section */}
      <div className="header">
        <div>
          <h2>Monthly Employee Payroll Report</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Generate employee-wise monthly payroll, attendance and LOP report.
          </p>
        </div>
      </div>

      {/* Access Rule Validation Warning Alert */}
      {accessValidation && !accessValidation.canGenerateReport && (
        <div
          style={{
            background: 'var(--warning-bg, rgba(245, 158, 11, 0.12))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: 'var(--warning-text, #d97706)',
            padding: '0.9rem 1.2rem',
            borderRadius: 'var(--radius-md, 8px)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, fontSize: '0.875rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              Report Generation Disabled for {monthName} {selectedYear}
            </div>
            <div>{accessValidation.reasonMessage}</div>
            {!accessValidation.isNextMonthPublished && (
              <div style={{ marginTop: '0.5rem' }}>
                <Link
                  to="/admin/attendance-calendar"
                  className="btn btn-sm btn-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.8rem',
                    borderColor: 'rgba(245, 158, 11, 0.5)',
                    color: 'inherit'
                  }}
                >
                  <Calendar size={14} />
                  <span>Go to Monthly Calendar to Publish {accessValidation.nextMonthName} {accessValidation.nextYear}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger-text)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{errorMessage}</span>
          </div>
          {canGenerate && (
            <button className="btn btn-sm btn-danger" onClick={handleGenerateReport}>
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Month / Year Controls Bar */}
      <div
        className="glass-card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-end',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ minWidth: '150px' }}>
          <label className="form-label">Year</label>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '180px' }}>
          <label className="form-label">Month</label>
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleGenerateReport}
          disabled={!canGenerate || loading || checkingAccess}
          title={!canGenerate ? accessValidation?.reasonMessage || 'Report generation disabled for this month' : 'Generate Monthly Employee Report'}
          style={{
            padding: '0.55rem 1.1rem',
            opacity: !canGenerate ? 0.6 : 1,
            cursor: !canGenerate ? 'not-allowed' : 'pointer'
          }}
        >
          {!canGenerate ? <Lock size={16} /> : <FileSpreadsheet size={16} />}
          <span>{loading ? 'Generating...' : 'Generate Report'}</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleDownloadExcel}
          disabled={!canGenerate || !reportData || reportData.length === 0 || downloading}
          style={{ padding: '0.55rem 1.1rem' }}
        >
          <Download size={16} />
          <span>{downloading ? 'Downloading...' : 'Download Excel'}</span>
        </button>
      </div>

      {/* 4. Report Preview Card & Table Container */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Monthly Payroll Preview</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              Month: {monthName} {selectedYear}
            </p>
          </div>

          {reportData && reportData.length > 0 && (
            <div style={{ position: 'relative', width: '260px' }}>
              <input
                type="text"
                placeholder="Search employee..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.2rem', fontSize: '0.8rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          )}
        </div>

        {/* 5. Table */}
        <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Payroll Status</th>
                <th>Working Days</th>
                <th>Present Days</th>
                <th>Leave Days</th>
                <th>Sandwich Leave</th>
                <th>Permissions</th>
                <th>Late Logins</th>
                <th>LOP Days</th>
                <th style={{ textAlign: 'right' }}>Monthly Salary</th>
                <th style={{ textAlign: 'right' }}>LOP Amount</th>
                <th style={{ textAlign: 'right' }}>Total Deduction</th>
                <th style={{ textAlign: 'right' }}>Final Salary</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={15} style={{ padding: '0.8rem 1rem' }}>
                      <div className="skeleton" style={{ height: '24px', width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : !canGenerate ? (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)' }}>
                      <Lock size={36} style={{ color: 'var(--warning-text, #d97706)' }} />
                      <h4 style={{ fontWeight: 600, color: 'var(--text-main)' }}>Report Generation Not Available</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '500px' }}>
                        {accessValidation?.reasonMessage || 'This month has either not completed or the next month attendance calendar is not yet published.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : !reportData || filteredData.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <AlertCircle size={40} style={{ color: 'var(--text-muted)' }} />
                      <h4 style={{ fontWeight: 600, color: 'var(--text-main)' }}>No payroll data available</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        No payroll records found for {monthName} {selectedYear}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const statusBadgeClass =
                    item.payrollStatus === 'Finalized'
                      ? 'badge-success'
                      : item.payrollStatus.includes('Processed')
                        ? 'badge-primary'
                        : 'badge-warning';

                  return (
                    <tr key={item.employeeId}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.employeeName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{item.employeeCode}</div>
                      </td>
                      <td>{item.department || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.designation || '—'}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass}`}>
                          {item.payrollStatus}
                        </span>
                      </td>
                      <td>{item.workingDays}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>{item.presentDays}</td>
                      <td>{item.approvedLeaveDays}</td>
                      <td>{item.sandwichLeaveDays}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.permissionCount}</td>
                      <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{item.lateLoginCount}</td>
                      <td style={{ fontWeight: 600, color: item.totalLOPDays > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                        {item.totalLOPDays} Days
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.monthlySalary)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{formatCurrency(item.lopAmount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{formatCurrency(item.totalDeduction)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(item.finalSalary)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          disabled={loading || !canGenerate}
        />
      </div>
    </div>
  );
};
