import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { BarChart3, Calendar, Package, UserCheck, Eye, Clock, Coffee, PhoneCall, Briefcase, Download } from 'lucide-react';
import { EmployeeDailyDetailModal } from './EmployeeDailyDetailModal';
import { GlassDatePicker } from '../../../components/ui/GlassDatePicker';
import { formatTimeIST, formatDurationToHoursMinutes } from '../../../utils/dateUtils';

interface DailyItem {
  employeeId: number;
  attendanceLogId?: number | null;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  date?: string;
  loginTime: string | null;
  logoutTime: string | null;
  status: string;
  productiveHours: number;
  workTaskCount?: number;
  workTaskHours?: number;
  breakCount?: number;
  breakHours: number;
  callCount?: number;
  callHours?: number;
  idleHours?: number;
  tasksCompleted: number;
  minutesLate: number;
  isLate?: boolean;
  isPermission?: boolean;
  permissionHours?: number;
  officeStartTime?: string;
  graceEndTime?: string;
  lateCount?: number;
  permissionCount?: number;
  lopDays?: number;
}

interface ProductionItem {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  daysPresent: number;
  productiveHours: number;
  breakHours: number;
  tasksCompleted: number;
  graceViolations: number;
}

interface ProductDist {
  productId: number;
  productName: string;
  productCode: string;
  totalHours: number;
}

interface ClientDist {
  clientId: number;
  clientCompanyName: string;
  totalHours: number;
}

interface DistributionReport {
  products: ProductDist[];
  clients: ClientDist[];
}

interface EmployeeOption {
  id: number;
  name: string;
  employeeCode: string;
  departmentName?: string;
}

export const ReportsPage: React.FC = () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'daily' | 'production' | 'distribution'>('daily');

  // Filters for Production Report
  const [prodDateMode, setProdDateMode] = useState<'single' | 'range'>('single');
  const [prodSingleDate, setProdSingleDate] = useState<string>(todayStr);
  const [prodStartDate, setProdStartDate] = useState<string>(todayStr);
  const [prodEndDate, setProdEndDate] = useState<string>(todayStr);
  const [prodEmployeeId, setProdEmployeeId] = useState<number | ''>('');

  // Filters for Monthly & Distribution
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthlyEmployeeId, setMonthlyEmployeeId] = useState<number | ''>('');

  // Modal State
  const [modalEmployeeId, setModalEmployeeId] = useState<number | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'tasks' | 'breaks' | 'support' | 'idles' | 'timeline'>('tasks');
  const [modalStartDate, setModalStartDate] = useState<string>(todayStr);
  const [modalEndDate, setModalEndDate] = useState<string>(todayStr);

  // Data States
  const [dailyData, setDailyData] = useState<DailyItem[]>([]);
  const [productionData, setProductionData] = useState<ProductionItem[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionReport | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State for Daily Production Table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/employees?pageSize=1000');
      if (res.data.success) {
        const items = res.data.data.items || res.data.data;
        setEmployees(items.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          employeeCode: emp.employeeCode,
          departmentName: emp.departmentName
        })));
      }
    } catch {
      // Ignore
    }
  };

  const fetchReports = async () => {
    if (activeTab === 'daily' && prodDateMode === 'range' && prodStartDate && prodEndDate && prodStartDate > prodEndDate) {
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        let url = `/reports/daily-production?`;
        if (prodDateMode === 'single') {
          url += `date=${prodSingleDate}`;
        } else {
          url += `startDate=${prodStartDate}&endDate=${prodEndDate}`;
        }
        if (prodEmployeeId) url += `&employeeId=${prodEmployeeId}`;
        const res = await apiClient.get(url);
        if (res.data.success) setDailyData(res.data.data);
      } else if (activeTab === 'production') {
        let url = `/reports/monthly-production?month=${month}&year=${year}`;
        if (monthlyEmployeeId) url += `&employeeId=${monthlyEmployeeId}`;
        const res = await apiClient.get(url);
        if (res.data.success) setProductionData(res.data.data);
      } else {
        const res = await apiClient.get(`/reports/work-distribution?month=${month}&year=${year}`);
        if (res.data.success) setDistributionData(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [
    activeTab,
    prodDateMode, prodSingleDate, prodStartDate, prodEndDate, prodEmployeeId,
    month, year, monthlyEmployeeId
  ]);

  const formatTime = (isoStr: string | null) => formatTimeIST(isoStr);

  const formatHoursToHM = (hoursVal: number | undefined | null) => {
    if (hoursVal === undefined || hoursVal === null || hoursVal <= 0 || isNaN(hoursVal)) return '00h 00m';
    const totalMinutes = Math.round(hoursVal * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  const openDetailModal = (
    employeeId: number,
    tab: 'tasks' | 'breaks' | 'support' | 'idles' | 'timeline',
    startDateStr: string,
    endDateStr: string
  ) => {
    setModalEmployeeId(employeeId);
    setModalInitialTab(tab);
    setModalStartDate(startDateStr);
    setModalEndDate(endDateStr);
  };

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (prodDateMode === 'range' && prodStartDate && prodEndDate && prodStartDate > prodEndDate) {
      alert('Start date cannot be after end date.');
      return;
    }
    try {
      setExporting(true);
      let url = `/reports/export-daily-production?`;
      if (prodDateMode === 'single') {
        url += `date=${prodSingleDate}`;
      } else {
        url += `startDate=${prodStartDate}&endDate=${prodEndDate}`;
      }
      if (prodEmployeeId) {
        url += `&employeeId=${prodEmployeeId}`;
      }

      const response = await apiClient.get(url, { responseType: 'blob' });

      const contentDisposition = response.headers['content-disposition'];
      let fileName = prodDateMode === 'single'
        ? `Performance_Report_${prodSingleDate}.xlsx`
        : `Performance_Report_${prodStartDate}_to_${prodEndDate}.xlsx`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert('Failed to export Excel report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const months = [
    { id: 1, name: 'January' }, { id: 2, name: 'February' }, { id: 3, name: 'March' },
    { id: 4, name: 'April' }, { id: 5, name: 'May' }, { id: 6, name: 'June' },
    { id: 7, name: 'July' }, { id: 8, name: 'August' }, { id: 9, name: 'September' },
    { id: 10, name: 'October' }, { id: 11, name: 'November' }, { id: 12, name: 'December' },
  ];

  return (
    <div>
      <div className="header">
        <div>
          <h2>Production & Work Distribution Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Comprehensive analytics on daily activity logs, tasks, breaks, calls, idle time, and product distribution
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('daily')}
        >
          <Calendar size={16} />
          <span>Production Report</span>
        </button>

        <button
          className={`btn ${activeTab === 'production' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('production')}
        >
          <BarChart3 size={16} />
          <span>Monthly Production Report</span>
        </button>

        <button
          className={`btn ${activeTab === 'distribution' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('distribution')}
        >
          <Package size={16} />
          <span>Product & Client Distribution</span>
        </button>
      </div>

      {/* Tab 1 Filters: Production Report */}
      {activeTab === 'daily' && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Date Mode</label>
            <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className={`btn ${prodDateMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', border: 'none' }}
                onClick={() => setProdDateMode('single')}
              >
                Single Date
              </button>
              <button
                type="button"
                className={`btn ${prodDateMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', border: 'none' }}
                onClick={() => setProdDateMode('range')}
              >
                Custom Range
              </button>
            </div>
          </div>

          {prodDateMode === 'single' ? (
            <div style={{ width: '175px' }}>
              <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Select Date</label>
              <GlassDatePicker
                value={prodSingleDate}
                onChange={(d) => setProdSingleDate(d)}
                maxDate={new Date()}
                placeholder="Select date"
              />
            </div>
          ) : (
            <>
              <div style={{ width: '175px' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Start Date</label>
                <GlassDatePicker
                  value={prodStartDate}
                  onChange={(d) => {
                    setProdStartDate(d);
                    if (prodEndDate && d > prodEndDate) {
                      setProdEndDate(d);
                    }
                  }}
                  maxDate={new Date()}
                  placeholder="Start date"
                />
              </div>
              <div style={{ width: '175px' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>End Date</label>
                <GlassDatePicker
                  value={prodEndDate}
                  onChange={(d) => setProdEndDate(d)}
                  minDate={prodStartDate}
                  maxDate={new Date()}
                  placeholder="End date"
                />
              </div>
            </>
          )}

          <div style={{ minWidth: '220px' }}>
            <label className="form-label">Employee Filter</label>
            <select
              className="form-select"
              value={prodEmployeeId}
              onChange={(e) => setProdEmployeeId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: exporting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={handleExportExcel}
              disabled={exporting}
            >
              <Download size={16} />
              <span>{exporting ? 'Generating Excel...' : 'Export to Excel'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2 & 3 Filters: Monthly & Distribution */}
      {(activeTab === 'production' || activeTab === 'distribution') && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '180px' }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
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

          {activeTab === 'production' && (
            <div style={{ minWidth: '220px' }}>
              <label className="form-label">Employee Filter</label>
              <select
                className="form-select"
                value={monthlyEmployeeId}
                onChange={(e) => setMonthlyEmployeeId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* View 1: Production Report Table */}
      {activeTab === 'daily' && (() => {
        const totalItems = dailyData.length;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
        const startIndex = (safeCurrentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedDailyData = dailyData.slice(startIndex, endIndex);

        return (
          <div className="glass-card table-container" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: '1050px', marginBottom: 0 }}>
                <thead>
                  <tr>
                    {prodDateMode === 'range' && <th>Date</th>}
                    <th>Employee</th>
                    <th>Login / Logout</th>
                    <th>Status</th>
                    <th>Work Task</th>
                    <th>Break</th>
                    <th>Call</th>
                    <th>Idle Time</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={prodDateMode === 'range' ? 9 : 8} style={{ textAlign: 'center', padding: '2rem' }}>Loading production report...</td></tr>
                  ) : dailyData.length === 0 ? (
                    <tr><td colSpan={prodDateMode === 'range' ? 9 : 8} style={{ textAlign: 'center', padding: '2rem' }}>No records found for the selected date range and employee.</td></tr>
                  ) : (
                    paginatedDailyData.map((item, idx) => {
                      const itemDateStr = item.date ? item.date.split('T')[0] : (prodDateMode === 'single' ? prodSingleDate : prodStartDate);

                      return (
                        <tr key={`${item.employeeId}-${itemDateStr}-${idx}`}>
                          {prodDateMode === 'range' && (
                            <td style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                              {itemDateStr}
                            </td>
                          )}
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.employeeName}</div>
                            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                              {item.employeeCode} • {item.departmentName}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.825rem' }}>
                              <span style={{ color: item.loginTime ? 'var(--success)' : 'var(--text-muted)' }}>
                                In: {formatTime(item.loginTime)}
                              </span>
                              <br />
                              <span style={{ color: item.logoutTime ? 'var(--text-muted)' : 'var(--warning)' }}>
                                Out: {formatTime(item.logoutTime)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${
                              item.status === 'Normal' ? 'badge-success' :
                              item.status === 'Permission' ? 'badge-info' :
                              item.status === 'Late' ? 'badge-warning' :
                              item.status.includes('Working') ? 'badge-success' : 'badge-secondary'
                            }`}>
                              {item.status}
                            </span>
                          </td>

                          {/* Work Task Column */}
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--accent-primary)',
                                borderColor: 'rgba(79, 70, 229, 0.25)',
                                background: 'rgba(79, 70, 229, 0.05)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                borderRadius: '6px'
                              }}
                              onClick={() => openDetailModal(item.employeeId, 'tasks', itemDateStr, itemDateStr)}
                              title="Click to view Work Tasks log"
                            >
                              <Briefcase size={14} />
                              <span>{item.workTaskCount ?? 0}</span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({formatHoursToHM(item.workTaskHours)})</span>
                            </button>
                          </td>

                          {/* Break Column */}
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--warning)',
                                borderColor: 'rgba(245, 158, 11, 0.25)',
                                background: 'rgba(245, 158, 11, 0.05)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                borderRadius: '6px'
                              }}
                              onClick={() => openDetailModal(item.employeeId, 'breaks', itemDateStr, itemDateStr)}
                              title="Click to view Breaks log"
                            >
                              <Coffee size={14} />
                              <span>{item.breakCount ?? 0}</span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({formatHoursToHM(item.breakHours)})</span>
                            </button>
                          </td>

                          {/* Call Column */}
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--info)',
                                borderColor: 'rgba(6, 182, 212, 0.25)',
                                background: 'rgba(6, 182, 212, 0.05)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                borderRadius: '6px'
                              }}
                              onClick={() => openDetailModal(item.employeeId, 'support', itemDateStr, itemDateStr)}
                              title="Click to view Support Calls log"
                            >
                              <PhoneCall size={14} />
                              <span>{item.callCount ?? 0}</span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({formatHoursToHM(item.callHours)})</span>
                            </button>
                          </td>

                          {/* Idle Time Column */}
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                borderColor: 'rgba(107, 114, 128, 0.25)',
                                background: 'rgba(107, 114, 128, 0.05)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                borderRadius: '6px'
                              }}
                              onClick={() => openDetailModal(item.employeeId, 'idles', itemDateStr, itemDateStr)}
                              title="Click to view Idle Gaps log"
                            >
                              <Clock size={14} />
                              <span>{formatHoursToHM(item.idleHours)}</span>
                            </button>
                          </td>

                          {/* Actions Column */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              onClick={() => openDetailModal(item.employeeId, 'tasks', itemDateStr, itemDateStr)}
                            >
                              <Eye size={13} />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && totalItems > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid var(--border-color)',
                background: '#fafafa',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <span>
                    Showing <strong>{startIndex + 1}</strong> - <strong>{Math.min(endIndex, totalItems)}</strong> of <strong>{totalItems}</strong> records
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="First Page"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    title="Previous Page"
                  >
                    ‹ Previous
                  </button>

                  <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem', color: 'var(--text-main)' }}>
                    Page {safeCurrentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    title="Next Page"
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Last Page"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* View 2: Monthly Production Report */}
      {activeTab === 'production' && (
        <div className="glass-card table-container" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Days Present</th>
                <th>Productive Hours</th>
                <th>Break Hours (Non-Productive)</th>
                <th>Tasks Completed</th>
                <th>Grace Violations</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading monthly production report...</td></tr>
              ) : productionData.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No data found for selected filters.</td></tr>
              ) : (
                productionData.map((item) => (
                  <tr key={item.employeeId}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{item.employeeCode}</td>
                    <td style={{ fontWeight: 600 }}>{item.employeeName}</td>
                    <td>{item.departmentName}</td>
                    <td>{item.daysPresent} Days</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatDurationToHoursMinutes(item.productiveHours)}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{formatDurationToHoursMinutes(item.breakHours)}</td>
                    <td style={{ fontWeight: 600 }}>{item.tasksCompleted}</td>
                    <td>
                      <span className={`badge ${item.graceViolations > 0 ? 'badge-danger' : 'badge-success'}`}>
                        {item.graceViolations} Late Logins
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View 3: Product & Client Work Distribution */}
      {activeTab === 'distribution' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Products Column */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>Product Time Allocation</span>
            </h3>

            {loading ? (
              <p>Loading products...</p>
            ) : !distributionData || distributionData.products.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No product time recorded for this period.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {distributionData.products.map((p) => (
                  <div key={p.productId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{p.productCode} - {p.productName}</span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{formatDurationToHoursMinutes(p.totalHours)}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, p.totalHours * 5)}%`,
                          background: 'var(--accent-gradient)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clients Column */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} style={{ color: 'var(--info)' }} />
              <span>Client Time Allocation</span>
            </h3>

            {loading ? (
              <p>Loading clients...</p>
            ) : !distributionData || distributionData.clients.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No client time recorded for this period.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {distributionData.clients.map((c) => (
                  <div key={c.clientId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{c.clientCompanyName}</span>
                      <span style={{ color: 'var(--info)', fontWeight: 700 }}>{formatDurationToHoursMinutes(c.totalHours)}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, c.totalHours * 5)}%`,
                          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal View Details */}
      {modalEmployeeId && (
        <EmployeeDailyDetailModal
          employeeId={modalEmployeeId}
          startDate={modalStartDate}
          endDate={modalEndDate}
          initialTab={modalInitialTab}
          onClose={() => setModalEmployeeId(null)}
        />
      )}
    </div>
  );
};
