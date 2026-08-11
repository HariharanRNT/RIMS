import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { BarChart3, Calendar, Package, UserCheck, Eye } from 'lucide-react';
import { EmployeeDailyDetailModal } from './EmployeeDailyDetailModal';
import { formatTimeIST } from '../../../utils/dateUtils';


interface DailyItem {
  employeeId: number;
  attendanceLogId?: number | null;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  loginTime: string | null;
  logoutTime: string | null;
  status: string;
  productiveHours: number;
  breakHours: number;
  tasksCompleted: number;
  minutesLate: number;
  isLate?: boolean;
  isPermission?: boolean;
  permissionHours?: number;
  officeStartTime?: string;
  graceEndTime?: string;
  lateCount?: number;
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

export const ReportsPage: React.FC = () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'daily' | 'production' | 'distribution'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departmentId, setDepartmentId] = useState<number | ''>('');

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const [dailyData, setDailyData] = useState<DailyItem[]>([]);
  const [productionData, setProductionData] = useState<ProductionItem[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionReport | null>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/departments');
      if (res.data.success) setDepartments(res.data.data);
    } catch {
      // Ignore
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        let url = `/reports/daily-production?date=${selectedDate}`;
        if (departmentId) url += `&departmentId=${departmentId}`;
        const res = await apiClient.get(url);
        if (res.data.success) setDailyData(res.data.data);
      } else if (activeTab === 'production') {
        let url = `/reports/monthly-production?month=${month}&year=${year}`;
        if (departmentId) url += `&departmentId=${departmentId}`;
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
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [activeTab, selectedDate, month, year, departmentId]);

  const formatTime = (isoStr: string | null) => formatTimeIST(isoStr);



  const handleMarkPermission = async (attendanceId: number) => {
    try {
      const res = await apiClient.post(`/attendance/${attendanceId}/mark-permission`);
      if (res.data.success) {
        fetchReports();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark permission.');
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
            Comprehensive analytics on workforce output, daily employee status, productive hours, and non-productive break times
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('daily')}
        >
          <Calendar size={16} />
          <span>Day-Wise Employee Report</span>
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
          <span>Product & Client Time Distribution</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {activeTab === 'daily' ? (
          <div style={{ minWidth: '200px' }}>
            <label className="form-label">Select Date</label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        ) : (
          <>
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
          </>
        )}

        {(activeTab === 'daily' || activeTab === 'production') && (
          <div style={{ minWidth: '200px' }}>
            <label className="form-label">Department Filter</label>
            <select
              className="form-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Day-Wise Employee Report */}
      {activeTab === 'daily' && (
        <div className="glass-card table-container" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Login / Logout</th>
                <th>Office Start</th>
                <th>Grace End</th>
                <th>Status</th>
                <th>Permission</th>
                <th>Late Count</th>
                <th>LOP</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Loading daily performance report...</td></tr>
              ) : dailyData.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>No record found for selected date and department.</td></tr>
              ) : (
                dailyData.map((item) => (
                  <tr key={item.employeeId}>
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
                    <td style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {item.officeStartTime || '10:00 AM'}
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {item.graceEndTime || '10:15 AM'}
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
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {item.isPermission ? (
                        <span style={{ color: 'var(--accent-primary)' }}>{item.permissionHours || 1} hr</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 700, textAlign: 'center' }}>
                      {item.lateCount ?? 0}
                    </td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      {item.lopDays && item.lopDays > 0 ? (
                        <span style={{ color: 'var(--danger)' }}>{item.lopDays} Day</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {item.attendanceLogId && item.isLate && !item.isPermission && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => handleMarkPermission(item.attendanceLogId!)}
                          >
                            Mark Permission
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployeeId(item.employeeId);
                          }}
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal View Details */}
      {selectedEmployeeId && (
        <EmployeeDailyDetailModal
          employeeId={selectedEmployeeId}
          date={selectedDate}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}


      {/* Tab 2: Monthly Production Report */}
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
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>{item.productiveHours} hrs</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{item.breakHours} hrs</td>
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

      {/* Tab 3: Product & Client Work Distribution */}
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
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{p.totalHours} hrs</span>
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
                      <span style={{ color: 'var(--info)', fontWeight: 700 }}>{c.totalHours} hrs</span>
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
    </div>
  );
};

