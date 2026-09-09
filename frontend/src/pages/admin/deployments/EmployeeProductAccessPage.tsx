import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Check,
  Shield,
  ArrowLeft,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle2,
  Package,
  RotateCcw,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  deploymentApi,
  type EmployeeProductAccessDto,
  type AuthorizedProductOptionDto,
} from '../../../api/deploymentApi';

export const EmployeeProductAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [employees, setEmployees] = useState<EmployeeProductAccessDto[]>([]);
  const [initialEmployees, setInitialEmployees] = useState<EmployeeProductAccessDto[]>([]);
  const [products, setProducts] = useState<AuthorizedProductOptionDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingBulk, setIsSavingBulk] = useState<boolean>(false);
  const [savingEmployeeId, setSavingEmployeeId] = useState<number | null>(null);
  const [savedEmployeeIds, setSavedEmployeeIds] = useState<number[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // View Mode: 'employee' | 'product'
  const [viewMode, setViewMode] = useState<'employee' | 'product'>('employee');

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedAccessFilter, setSelectedAccessFilter] = useState<string>('');
  const [selectedProductViewId, setSelectedProductViewId] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [empList, prodList] = await Promise.all([
        deploymentApi.getEmployeeProductAccessList(),
        deploymentApi.getAuthorizedProductsAndClients(),
      ]);
      setEmployees(empList);
      setInitialEmployees(JSON.parse(JSON.stringify(empList)));
      setProducts(prodList);
      if (prodList.length > 0 && selectedProductViewId === 0) {
        setSelectedProductViewId(prodList[0].productId);
      }
    } catch (err) {
      console.error('Failed to load employee access data:', err);
      setFeedbackMsg({ text: 'Failed to load employee product assignments.', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Unsaved Status
  const isRowModified = (emp: EmployeeProductAccessDto) => {
    const orig = initialEmployees.find((e) => e.employeeId === emp.employeeId);
    if (!orig) return false;
    if (orig.hasPermission !== emp.hasPermission) return true;
    if (orig.assignedProductIds.length !== emp.assignedProductIds.length) return true;
    const origSet = new Set(orig.assignedProductIds);
    return emp.assignedProductIds.some((id) => !origSet.has(id));
  };

  const modifiedEmployees = useMemo(() => {
    return employees.filter(isRowModified);
  }, [employees, initialEmployees]);

  // Unique Departments for Filter
  const departments = useMemo(() => {
    const deps = new Set<string>();
    employees.forEach((e) => {
      if (e.departmentName) deps.add(e.departmentName);
    });
    return Array.from(deps).sort();
  }, [employees]);

  // 1. Toggle Product with Auto-Enable/Disable
  const handleToggleProduct = (empId: number, prodId: number) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.employeeId !== empId) return emp;
        const exists = emp.assignedProductIds.includes(prodId);
        const newProdIds = exists
          ? emp.assignedProductIds.filter((id) => id !== prodId)
          : [...emp.assignedProductIds, prodId];

        // Auto-synchronize permission state:
        // Checking at least one product auto-enables access.
        // Unchecking the last product auto-disables access.
        const shouldBeEnabled = newProdIds.length > 0;

        return {
          ...emp,
          hasPermission: shouldBeEnabled,
          assignedProductIds: newProdIds,
        };
      })
    );
  };

  // 2. Toggle Permission
  const handleTogglePermission = (empId: number) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.employeeId !== empId) return emp;
        const nextPermission = !emp.hasPermission;
        return {
          ...emp,
          hasPermission: nextPermission,
          assignedProductIds: nextPermission
            ? emp.assignedProductIds.length > 0
              ? emp.assignedProductIds
              : products.length > 0
              ? [products[0].productId]
              : []
            : [],
        };
      })
    );
  };

  // 3. Save Single Row with Visual Feedback
  const handleSaveAccess = async (emp: EmployeeProductAccessDto) => {
    if (emp.hasPermission && emp.assignedProductIds.length === 0) {
      setFeedbackMsg({
        text: `Cannot enable access for ${emp.employeeName} without selecting at least one product.`,
        isError: true,
      });
      return;
    }

    try {
      setSavingEmployeeId(emp.employeeId);
      setFeedbackMsg(null);
      const updated = await deploymentApi.updateEmployeeProductAccess(emp.employeeId, {
        employeeId: emp.employeeId,
        hasPermission: emp.hasPermission,
        assignedProductIds: emp.assignedProductIds,
      });

      setEmployees((prev) =>
        prev.map((item) => (item.employeeId === emp.employeeId ? updated : item))
      );
      setInitialEmployees((prev) =>
        prev.map((item) => (item.employeeId === emp.employeeId ? JSON.parse(JSON.stringify(updated)) : item))
      );

      setSavedEmployeeIds((prev) => [...prev, emp.employeeId]);
      setTimeout(() => {
        setSavedEmployeeIds((prev) => prev.filter((id) => id !== emp.employeeId));
      }, 3000);

      setFeedbackMsg({
        text: `Saved product access for ${emp.employeeName}.`,
        isError: false,
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFeedbackMsg({
        text: err.response?.data?.message || err.message || 'Failed to update access.',
        isError: true,
      });
    } finally {
      setSavingEmployeeId(null);
    }
  };

  // 4. Save All Modified Rows (Bulk Save)
  const handleSaveAllModified = async () => {
    const invalid = modifiedEmployees.filter((e) => e.hasPermission && e.assignedProductIds.length === 0);
    if (invalid.length > 0) {
      setFeedbackMsg({
        text: `Please select at least 1 product for: ${invalid.map((e) => e.employeeName).join(', ')} before saving.`,
        isError: true,
      });
      return;
    }

    try {
      setIsSavingBulk(true);
      setFeedbackMsg(null);
      const updatePromises = modifiedEmployees.map((emp) =>
        deploymentApi.updateEmployeeProductAccess(emp.employeeId, {
          employeeId: emp.employeeId,
          hasPermission: emp.hasPermission,
          assignedProductIds: emp.assignedProductIds,
        })
      );

      const results = await Promise.all(updatePromises);

      setEmployees((prev) =>
        prev.map((emp) => {
          const matched = results.find((r) => r.employeeId === emp.employeeId);
          return matched ? matched : emp;
        })
      );

      setInitialEmployees(JSON.parse(JSON.stringify(employees)));
      const ids = modifiedEmployees.map((e) => e.employeeId);
      setSavedEmployeeIds(ids);
      setTimeout(() => setSavedEmployeeIds([]), 3500);

      setFeedbackMsg({
        text: `Successfully updated product access for ${results.length} employee(s).`,
        isError: false,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({
        text: err.response?.data?.message || err.message || 'Failed to save all changes.',
        isError: true,
      });
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Discard All Edits
  const handleDiscardAll = () => {
    setEmployees(JSON.parse(JSON.stringify(initialEmployees)));
    setFeedbackMsg({ text: 'All unsaved changes discarded.', isError: false });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Filtered List for Table
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q ||
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.departmentName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);

      const matchesDep = !selectedDepartment || e.departmentName === selectedDepartment;

      let matchesAccess = true;
      if (selectedAccessFilter === 'enabled') matchesAccess = e.hasPermission;
      else if (selectedAccessFilter === 'disabled') matchesAccess = !e.hasPermission;
      else if (selectedAccessFilter === 'unsaved') matchesAccess = isRowModified(e);

      return matchesQuery && matchesDep && matchesAccess;
    });
  }, [employees, search, selectedDepartment, selectedAccessFilter, initialEmployees]);

  // Paginated List
  const totalEmployeesCount = filteredEmployees.length;
  const totalPages = Math.ceil(totalEmployeesCount / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', paddingBottom: modifiedEmployees.length > 0 ? '5rem' : '1.5rem' }}>
      {/* 1. Header */}
      <div
        className="header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/deployments')}
            className="btn btn-outline"
            style={{ padding: '0.45rem 0.65rem' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Employee Product Access
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Grant Product Deployment History permissions and manage authorized products per employee
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--panel-raised)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('employee')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'employee' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'employee' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={14} />
              <span>By Employee</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('product')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'product' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'product' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <Package size={14} />
              <span>By Product</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback Alert */}
      {feedbackMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
            background: feedbackMsg.isError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${feedbackMsg.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            color: feedbackMsg.isError ? 'var(--red, #ef4444)' : 'var(--green, #10b981)',
          }}
        >
          {feedbackMsg.isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 3. VIEW MODE A: BY EMPLOYEE */}
      {viewMode === 'employee' && (
        <>
          {/* Filters Bar */}
          <div
            className="panel"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            {/* Search Input */}
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by Employee Name, Code, Department, or Email..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-raised)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Department Filter */}
            <div style={{ minWidth: '160px' }}>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-raised)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Access Permission Filter */}
            <div style={{ minWidth: '140px' }}>
              <select
                value={selectedAccessFilter}
                onChange={(e) => {
                  setSelectedAccessFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--panel-raised)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              >
                <option value="">All Access</option>
                <option value="enabled">Enabled Only</option>
                <option value="disabled">Disabled Only</option>
                <option value="unsaved">Unsaved Edits ({modifiedEmployees.length})</option>
              </select>
            </div>
          </div>

          {/* Employee Table */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Employee</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Department & Designation</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Access Permission</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Assigned Products ({products.length} Available)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
                          <span>Loading employee list...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={32} opacity={0.5} />
                          <span>No matching employees found.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp) => {
                      const isSaving = savingEmployeeId === emp.employeeId;
                      const isSaved = savedEmployeeIds.includes(emp.employeeId);
                      const isModified = isRowModified(emp);
                      const isCurrentUser = user?.employeeId === emp.employeeId;
                      const hasInvalidState = emp.hasPermission && emp.assignedProductIds.length === 0;

                      return (
                        <tr
                          key={emp.employeeId}
                          style={{
                            borderBottom: '1px solid var(--border-soft)',
                            background: isModified
                              ? 'rgba(249, 115, 22, 0.04)'
                              : isCurrentUser
                              ? 'var(--panel-raised)'
                              : 'transparent',
                            borderLeft: isCurrentUser ? '3px solid var(--primary)' : isModified ? '3px solid #f59e0b' : '3px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Employee Info */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                {emp.employeeName}
                              </span>
                              {isCurrentUser && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    background: 'var(--primary-glow, rgba(249, 115, 22, 0.15))',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--primary)',
                                  }}
                                  title="This is your logged-in account"
                                >
                                  (You)
                                </span>
                              )}
                              {isModified && (
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: '#f59e0b',
                                    display: 'inline-block',
                                  }}
                                  title="Unsaved changes on this employee"
                                />
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
                              {emp.employeeCode} • {emp.email}
                            </div>
                          </td>

                          {/* Department / Designation */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                              {emp.departmentName}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{emp.designationName}</div>
                          </td>

                          {/* Permission Toggle */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(emp.employeeId)}
                              title={
                                emp.hasPermission
                                  ? 'Click to disable access and clear product assignments'
                                  : 'Click to enable access'
                              }
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: `1px solid ${emp.hasPermission ? 'rgba(16, 185, 129, 0.35)' : 'var(--border)'}`,
                                background: emp.hasPermission ? 'rgba(16, 185, 129, 0.14)' : 'var(--panel-raised)',
                                color: emp.hasPermission ? 'var(--green, #10b981)' : 'var(--text-secondary)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Shield size={12} />
                              <span>{emp.hasPermission ? 'Enabled' : 'Disabled'}</span>
                            </button>
                            {hasInvalidState && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--red, #ef4444)', fontSize: '0.7rem', marginTop: '3px' }}>
                                <AlertTriangle size={11} />
                                <span>Pick ≥ 1 product</span>
                              </div>
                            )}
                          </td>

                          {/* Assigned Products Chips */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {products.map((prod) => {
                                const isAssigned = emp.assignedProductIds.includes(prod.productId);
                                return (
                                  <button
                                    key={prod.productId}
                                    type="button"
                                    onClick={() => handleToggleProduct(emp.employeeId, prod.productId)}
                                    title={isAssigned ? `Remove ${prod.productName}` : `Assign ${prod.productName}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '0.22rem 0.55rem',
                                      borderRadius: '7px',
                                      fontSize: '0.73rem',
                                      fontWeight: isAssigned ? 600 : 400,
                                      cursor: 'pointer',
                                      border: isAssigned ? '1px solid var(--primary)' : '1px dashed var(--border)',
                                      background: isAssigned ? 'var(--primary-glow, rgba(249, 115, 22, 0.15))' : 'transparent',
                                      color: isAssigned ? 'var(--primary)' : 'var(--text-secondary)',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {isAssigned && <Check size={11} />}
                                    <span>{prod.productName}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Action */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {isSaved ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--green, #10b981)',
                                  padding: '0.3rem 0.6rem',
                                }}
                              >
                                <CheckCircle2 size={13} /> Saved
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isSaving || !isModified || hasInvalidState}
                                onClick={() => handleSaveAccess(emp)}
                                className={isModified ? 'btn btn-primary' : 'btn btn-outline'}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.74rem',
                                  padding: '0.3rem 0.7rem',
                                  opacity: !isModified ? 0.45 : isSaving ? 0.7 : 1,
                                  cursor: !isModified ? 'default' : 'pointer',
                                }}
                              >
                                {isSaving ? (
                                  <>
                                    <RefreshCw size={12} className="spin-animation" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save size={12} />
                                    <span>{isModified ? 'Save *' : 'Save'}</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid var(--border)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                Showing {totalEmployeesCount > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
                {Math.min(page * pageSize, totalEmployeesCount)} of {totalEmployeesCount} employees
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel-raised)',
                    color: 'var(--text-main)',
                    fontSize: '0.78rem',
                  }}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '0.78rem' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 4. VIEW MODE B: BY PRODUCT (AUDIT VIEW) */}
      {viewMode === 'product' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem' }}>
          {/* Product Selector Sidebar */}
          <div className="panel" style={{ padding: '1rem', height: 'fit-content' }}>
            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Product ({products.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {products.map((p) => {
                const assignedCount = employees.filter((e) => e.assignedProductIds.includes(p.productId)).length;
                const isSelected = p.productId === selectedProductViewId;
                return (
                  <button
                    key={p.productId}
                    type="button"
                    onClick={() => setSelectedProductViewId(p.productId)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--primary-glow, rgba(249, 115, 22, 0.12))' : 'var(--panel-raised)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{p.productName}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: '999px',
                        background: isSelected ? 'var(--primary)' : 'var(--border)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {assignedCount} users
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Assigned Employees Card */}
          <div className="panel" style={{ padding: '1.25rem' }}>
            {(() => {
              const currentProd = products.find((p) => p.productId === selectedProductViewId);
              if (!currentProd) {
                return <div>Please select a product from the list.</div>;
              }

              const assignedEmployees = employees.filter((e) => e.assignedProductIds.includes(currentProd.productId));
              const unassignedEmployees = employees.filter((e) => !e.assignedProductIds.includes(currentProd.productId));

              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {currentProd.productName} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({currentProd.productCode})</span>
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {currentProd.mappedClients?.length || 0} Mapped Clients • {assignedEmployees.length} Authorized Employees
                      </p>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Click any employee to toggle access to this product
                    </div>
                  </div>

                  {/* Section 1: Authorized Employees */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--green, #10b981)', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 0.75rem 0' }}>
                      <UserCheck size={16} />
                      <span>Authorized Employees ({assignedEmployees.length})</span>
                    </h4>
                    {assignedEmployees.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                        No employees currently assigned to this product.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
                        {assignedEmployees.map((emp) => {
                          const isCurrentUser = user?.employeeId === emp.employeeId;
                          const isModified = isRowModified(emp);
                          return (
                            <div
                              key={emp.employeeId}
                              onClick={() => handleToggleProduct(emp.employeeId, currentProd.productId)}
                              style={{
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                background: 'rgba(16, 185, 129, 0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span>{emp.employeeName}</span>
                                  {isCurrentUser && <span style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>(You)</span>}
                                  {isModified && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }} />}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  {emp.departmentName}
                                </div>
                              </div>
                              <Check size={14} color="var(--green, #10b981)" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Other Employees (Click to Add) */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 0.75rem 0' }}>
                      <Users size={16} />
                      <span>Other Employees (Click to Assign) ({unassignedEmployees.length})</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
                      {unassignedEmployees.map((emp) => {
                        const isCurrentUser = user?.employeeId === emp.employeeId;
                        const isModified = isRowModified(emp);
                        return (
                          <div
                            key={emp.employeeId}
                            onClick={() => handleToggleProduct(emp.employeeId, currentProd.productId)}
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              border: '1px dashed var(--border)',
                              background: 'var(--panel-raised)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              opacity: 0.8,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>{emp.employeeName}</span>
                                {isCurrentUser && <span style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>(You)</span>}
                                {isModified && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }} />}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {emp.departmentName}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>+ Add</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 5. STICKY BULK SAVE BAR (Appears whenever any employee has unsaved changes) */}
      {modifiedEmployees.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            background: 'var(--panel)',
            border: '1px solid var(--primary)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            maxWidth: '650px',
            width: 'calc(100% - 2rem)',
            animation: 'fadeInUp 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#f59e0b',
                boxShadow: '0 0 8px #f59e0b',
              }}
            />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {modifiedEmployees.length} employee{modifiedEmployees.length > 1 ? 's have' : ' has'} unsaved changes
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Review changes before leaving this page
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleDiscardAll}
              disabled={isSavingBulk}
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
            >
              <RotateCcw size={13} />
              <span>Discard All</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAllModified}
              disabled={isSavingBulk}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '0.4rem 1rem' }}
            >
              {isSavingBulk ? (
                <>
                  <RefreshCw size={13} className="spin-animation" />
                  <span>Saving All...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save All ({modifiedEmployees.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

