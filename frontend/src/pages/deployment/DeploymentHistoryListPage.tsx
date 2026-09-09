import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  FileSpreadsheet,
  Search,
  RefreshCw,
  Eye,
  Edit3,
  GitCommit,
  Layers,
  CheckCircle2,
  Send,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  deploymentApi,
  type ProductDeploymentDto,
  type AuthorizedProductOptionDto,
  type ProductDeploymentFilter,
} from '../../api/deploymentApi';
import { DeploymentStatusBadge } from './components/DeploymentStatusBadge';
import { DeploymentFormModal } from './components/DeploymentFormModal';
import { DeploymentDetailsModal } from './components/DeploymentDetailsModal';
import { DeploymentStatusModal } from './components/DeploymentStatusModal';

export const DeploymentHistoryListPage: React.FC = () => {
  const { hasAdminPrivilege } = useAuth();
  const navigate = useNavigate();

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [deployments, setDeployments] = useState<ProductDeploymentDto[]>([]);
  const [authorizedProducts, setAuthorizedProducts] = useState<AuthorizedProductOptionDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [issueDateFrom, setIssueDateFrom] = useState<string>('');
  const [issueDateTo, setIssueDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [selectedDeployment, setSelectedDeployment] = useState<ProductDeploymentDto | null>(null);

  // Load authorized metadata
  const loadMetadata = async () => {
    try {
      const prods = await deploymentApi.getAuthorizedProductsAndClients();
      setAuthorizedProducts(prods);
    } catch (err) {
      console.error('Failed to load authorized products:', err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  // Fetch Deployments
  const fetchDeployments = useCallback(async () => {
    try {
      setIsLoading(true);
      const filter: ProductDeploymentFilter = {
        search: search.trim() || undefined,
        productId: selectedProductId > 0 ? selectedProductId : undefined,
        clientId: selectedClientId > 0 ? selectedClientId : undefined,
        status: selectedStatus || undefined,
        version: selectedVersion.trim() || undefined,
        issueDateFrom: issueDateFrom || undefined,
        issueDateTo: issueDateTo || undefined,
        page,
        pageSize,
      };

      const result = await deploymentApi.getDeployments(filter);
      setDeployments(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    search,
    selectedProductId,
    selectedClientId,
    selectedStatus,
    selectedVersion,
    issueDateFrom,
    issueDateTo,
    page,
    pageSize,
  ]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  // Derived Client Options for selected product in filter
  const filterClientOptions = selectedProductId > 0
    ? authorizedProducts.find((p) => p.productId === selectedProductId)?.mappedClients || []
    : authorizedProducts.flatMap((p) => p.mappedClients);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedProductId(0);
    setSelectedClientId(0);
    setSelectedStatus('');
    setSelectedVersion('');
    setIssueDateFrom('');
    setIssueDateTo('');
    setPage(1);
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const filter: ProductDeploymentFilter = {
        search: search.trim() || undefined,
        productId: selectedProductId > 0 ? selectedProductId : undefined,
        clientId: selectedClientId > 0 ? selectedClientId : undefined,
        status: selectedStatus || undefined,
        version: selectedVersion.trim() || undefined,
        issueDateFrom: issueDateFrom || undefined,
        issueDateTo: issueDateTo || undefined,
      };
      await deploymentApi.exportToExcel(filter);
    } catch (err) {
      console.error('Failed to export deployments:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const inDevCount = deployments.filter((d) => d.currentStatus.includes('Development')).length;
  const inTestingCount = deployments.filter((d) => d.currentStatus.includes('Testing')).length;
  const deliveredCount = deployments.filter((d) => d.currentStatus === 'Delivered').length;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
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
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Product Deployment History
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Track issue lifecycles from Development → Testing → Completion → Delivery
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {hasAdminPrivilege && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/admin/deployment-access')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              <Users size={15} color="var(--primary)" />
              <span>Employee Product Access</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportExcel}
            disabled={isExporting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              padding: '0.45rem 0.85rem',
              color: 'var(--green)',
              borderColor: 'var(--border)',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSelectedDeployment(null);
              setIsFormModalOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
          >
            <Plus size={16} />
            <span>Add Deployment</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="kpi-grid">
        <div className="kpi" style={{ '--accent': '#6366f1', '--accent-dim': 'rgba(99, 102, 241, 0.15)' } as React.CSSProperties}>
          <div className="kpi-top">
            <div className="kpi-label">Total Deployments</div>
            <div className="kpi-icon"><Layers size={16} /></div>
          </div>
          <div className="kpi-value">{totalCount}</div>
          <div className="kpi-foot">All tracked issues</div>
        </div>

        <div className="kpi" style={{ '--accent': '#3b82f6', '--accent-dim': 'rgba(59, 130, 246, 0.15)' } as React.CSSProperties}>
          <div className="kpi-top">
            <div className="kpi-label">In Development</div>
            <div className="kpi-icon"><Clock size={16} /></div>
          </div>
          <div className="kpi-value">{inDevCount}</div>
          <div className="kpi-foot">Active engineering fix</div>
        </div>

        <div className="kpi" style={{ '--accent': '#8b5cf6', '--accent-dim': 'rgba(139, 92, 246, 0.15)' } as React.CSSProperties}>
          <div className="kpi-top">
            <div className="kpi-label">In QA Testing</div>
            <div className="kpi-icon"><CheckCircle2 size={16} /></div>
          </div>
          <div className="kpi-value">{inTestingCount}</div>
          <div className="kpi-foot">QA verification in progress</div>
        </div>

        <div className="kpi" style={{ '--accent': '#10b981', '--accent-dim': 'rgba(16, 185, 129, 0.15)' } as React.CSSProperties}>
          <div className="kpi-top">
            <div className="kpi-label">Delivered</div>
            <div className="kpi-icon"><Send size={16} /></div>
          </div>
          <div className="kpi-value">{deliveredCount}</div>
          <div className="kpi-foot tag-green">Client production sign-off</div>
        </div>
      </div>

      {/* 3. Filters Panel */}
      <div
        className="panel"
        style={{
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
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
              placeholder="Search Issue, Description, Version, Product..."
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

          {/* Product Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(Number(e.target.value));
                setSelectedClientId(0);
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
              <option value={0}>All Products</option>
              {authorizedProducts.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName}
                </option>
              ))}
            </select>
          </div>

          {/* Client Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(Number(e.target.value));
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
              <option value={0}>All Clients</option>
              {filterClientOptions.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
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
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Development In Progress">Development In Progress</option>
              <option value="Development Completed">Development Completed</option>
              <option value="Moved to Testing">Moved to Testing</option>
              <option value="Testing In Progress">Testing In Progress</option>
              <option value="Testing Completed">Testing Completed</option>
              <option value="Ready for Delivery">Ready for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Rejected">Rejected</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
          >
            <RefreshCw size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Date & Version sub-row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '0.65rem',
            borderTop: '1px solid var(--border-soft)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} color="var(--primary)" />
            <span style={{ fontWeight: 600 }}>Issue Date:</span>
            <input
              type="date"
              max={todayStr}
              value={issueDateFrom}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val > todayStr) {
                  setIssueDateFrom(todayStr);
                } else {
                  setIssueDateFrom(val);
                }
                if (issueDateTo && val > issueDateTo) {
                  setIssueDateTo('');
                }
                setPage(1);
              }}
              style={{
                padding: '0.3rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--panel-raised)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
              }}
            />
            <span>to</span>
            <input
              type="date"
              min={issueDateFrom || undefined}
              max={todayStr}
              value={issueDateTo}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val > todayStr) {
                  setIssueDateTo(todayStr);
                } else if (issueDateFrom && val && val < issueDateFrom) {
                  setIssueDateTo(issueDateFrom);
                } else {
                  setIssueDateTo(val);
                }
                setPage(1);
              }}
              style={{
                padding: '0.3rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--panel-raised)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <span style={{ fontWeight: 600 }}>Version:</span>
            <input
              type="text"
              value={selectedVersion}
              onChange={(e) => {
                setSelectedVersion(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. v2.4.1"
              style={{
                width: '120px',
                padding: '0.3rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--panel-raised)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. Deployments Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.82rem',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--bg-table-header)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontSize: '0.72rem',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: '0.55rem 0.65rem' }}>Product & Client</th>
                <th style={{ padding: '0.55rem 0.65rem' }}>Description / Version</th>
                <th style={{ padding: '0.55rem 0.65rem' }}>Issue Date</th>
                <th style={{ padding: '0.55rem 0.65rem' }}>Lifecycle Status</th>
                <th style={{ padding: '0.55rem 0.65rem' }}>QA Testing</th>
                <th style={{ padding: '0.55rem 0.65rem' }}>Delivery</th>
                <th style={{ padding: '0.55rem 0.65rem' }}>Last Updated</th>
                <th
                  style={{
                    padding: '0.55rem 0.75rem',
                    textAlign: 'right',
                    position: 'sticky',
                    right: 0,
                    background: 'var(--bg-table-header)',
                    zIndex: 2,
                    boxShadow: '-2px 0 6px rgba(0,0,0,0.05)',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
                      <span>Loading deployments...</span>
                    </div>
                  </td>
                </tr>
              ) : deployments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-faint)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Package size={32} style={{ opacity: 0.5 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                        No deployment records found
                      </span>
                      <span style={{ fontSize: '0.8rem' }}>
                        Adjust filters above or click "+ Add Deployment" to create a new tracking entry.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                deployments.map((d, index) => {
                  const rowBg = index % 2 === 1 ? 'var(--bg-table-stripe)' : 'var(--panel)';
                  return (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: '1px solid var(--border-soft)',
                        background: index % 2 === 1 ? 'var(--bg-table-stripe)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Product & Client */}
                      <td style={{ padding: '0.55rem 0.65rem', maxWidth: '140px' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            fontSize: '0.83rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={d.productName}
                        >
                          {d.productName}
                        </div>
                        <div
                          style={{
                            fontSize: '0.73rem',
                            color: 'var(--text-dim)',
                            marginTop: '1px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={d.clientCompanyName}
                        >
                          {d.clientCompanyName}
                        </div>
                      </td>

                      {/* Description & Version (compact ellipsis) */}
                      <td style={{ padding: '0.55rem 0.65rem', maxWidth: '170px' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            fontSize: '0.81rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={d.description || d.issue}
                        >
                          {d.description || d.issue}
                        </div>
                        {d.version ? (
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '2px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontFamily: 'inherit',
                              background: 'var(--panel-raised)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-dim)',
                            }}
                          >
                            {d.version}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td style={{ padding: '0.55rem 0.65rem', color: 'var(--text-dim)', fontSize: '0.79rem', whiteSpace: 'nowrap' }}>
                        {d.formattedIssueDate}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.55rem 0.65rem' }}>
                        <DeploymentStatusBadge status={d.currentStatus} size="sm" />
                      </td>

                      {/* QA Testing */}
                      <td style={{ padding: '0.55rem 0.65rem', whiteSpace: 'nowrap' }}>
                        {d.testingCompleted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--teal, #0d9488)', fontWeight: 600, fontSize: '0.75rem' }}>
                            <CheckCircle2 size={13} /> Completed
                          </span>
                        ) : d.movedToTesting ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--violet, #8b5cf6)', fontWeight: 600, fontSize: '0.75rem' }}>
                            <Clock size={13} /> In QA
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* Delivery */}
                      <td style={{ padding: '0.55rem 0.65rem', whiteSpace: 'nowrap' }}>
                        {d.formattedDeliveryDate ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--green, #10b981)', fontWeight: 600, fontSize: '0.75rem' }}>
                            <Send size={13} /> {d.formattedDeliveryDate}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-faint)' }}>—</span>
                        )}
                      </td>

                      {/* Last Updated (compact single line) */}
                      <td style={{ padding: '0.55rem 0.65rem', whiteSpace: 'nowrap' }}>
                        <div style={{ color: 'var(--text-main)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{d.formattedUpdatedAt?.slice(0, 10)}</span>
                          <span style={{ fontSize: '0.71rem', color: 'var(--text-faint)' }}>
                            · by {d.modifiedByName || d.createdByName}
                          </span>
                        </div>
                      </td>

                      {/* Actions (sticky right on narrow viewports) */}
                      <td
                        style={{
                          padding: '0.55rem 0.75rem',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                          position: 'sticky',
                          right: 0,
                          background: rowBg,
                          zIndex: 1,
                          boxShadow: '-2px 0 6px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDeployment(d);
                              setIsDetailsModalOpen(true);
                            }}
                            title="View Details & Timeline"
                            style={{
                              padding: '3px 6px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--panel-raised)',
                              color: 'var(--text-dim)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDeployment(d);
                              setIsStatusModalOpen(true);
                            }}
                            title="Change Status"
                            style={{
                              padding: '3px 6px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--panel-raised)',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <GitCommit size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDeployment(d);
                              setIsFormModalOpen(true);
                            }}
                            title="Edit"
                            style={{
                              padding: '3px 6px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--panel-raised)',
                              color: 'var(--text-dim)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>
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
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            Showing {deployments.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, totalCount)} of {totalCount} records
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
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn btn-outline"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DeploymentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchDeployments}
        deployment={selectedDeployment}
        authorizedProducts={authorizedProducts}
      />

      <DeploymentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        deployment={selectedDeployment}
        onEdit={(dep) => {
          setSelectedDeployment(dep);
          setIsFormModalOpen(true);
        }}
        onChangeStatus={(dep) => {
          setSelectedDeployment(dep);
          setIsStatusModalOpen(true);
        }}
      />

      <DeploymentStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSuccess={fetchDeployments}
        deployment={selectedDeployment}
      />
    </div>
  );
};
