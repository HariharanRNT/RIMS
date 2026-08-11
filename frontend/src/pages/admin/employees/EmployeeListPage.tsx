import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { EmployeeFormModal } from './EmployeeFormModal';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface EmployeeItem {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  departmentName: string;
  designationName: string;
  isActive: boolean;
}

interface DepartmentOption {
  id: number;
  name: string;
}

export const EmployeeListPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDept, setSelectedDept] = useState<number | ''>('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/departments');
      if (res.data.success) setDepartments(res.data.data);
    } catch {
      // Ignore
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let url = `/employees?page=${page}&pageSize=${pageSize}`;
      if (selectedDept) url += `&departmentId=${selectedDept}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await apiClient.get(url);
      if (res.data.success) {
        setEmployees(res.data.data.items);
        setTotalCount(res.data.data.totalCount);
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
    fetchEmployees();
  }, [page, selectedDept, search]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingId(id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await apiClient.delete(`/employees/${id}`);
        fetchEmployees();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to deactivate employee');
      }
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <div className="header">
        <div>
          <h2>Employee Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage workforce master profiles & reporting structure
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>New Employee</span>
        </button>
      </div>

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by code, name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ minWidth: '200px' }}>
          <select
            className="form-select"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card table-container" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading employees...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No employees found.</td></tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{emp.employeeCode}</td>
                  <td style={{ fontWeight: 500 }}>{emp.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                  <td>{emp.departmentName}</td>
                  <td>{emp.designationName}</td>
                  <td>
                    <span className={`badge ${emp.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(emp.id)} style={{ marginRight: '0.5rem' }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <span>Showing page {page} of {totalPages} ({totalCount} total)</span>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Registration / Edit Modal */}
      <EmployeeFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        employeeId={editingId}
        onSaved={fetchEmployees}
      />
    </div>
  );
};
