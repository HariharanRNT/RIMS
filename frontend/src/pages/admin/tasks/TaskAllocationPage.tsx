import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import {
  Plus,
  Search,
  Clock,
  XCircle,
  ArrowRightLeft,
  Calendar,
  RotateCcw,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { TaskTimelineDrawer } from '../../../components/tasks/TaskTimelineDrawer';
import type { TaskTimelineEventDto } from '../../../components/tasks/TaskTimelineDrawer';
import { formatTimeIST, formatDateIST, formatDurationToHoursMinutes } from '../../../utils/dateUtils';
import { GlassSelect } from '../../../components/ui/GlassSelect';
import { GlassDatePicker } from '../../../components/ui/GlassDatePicker';

interface EmployeeLookup {
  id: number;
  employeeCode: string;
  name: string;
  departmentId: number;
  reportingPersonId?: number;
}

interface ProductLookup {
  id: number;
  code: string;
  name: string;
}

interface ClientLookup {
  id: number;
  companyName: string;
}

interface ProductClientMappingLookup {
  productId: number;
  clientId: number;
  isActive: boolean;
}

interface TaskItem {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  productId?: number;
  productName: string;
  productCode: string;
  clientId?: number;
  clientCompanyName: string;
  moduleName: string;
  description: string;
  status: string;
  priority: number;
  priorityName: string;
  assignedByEmployeeId?: number;
  assignedByName?: string;
  assignerType: number;
  assignerTypeName: string;
  plannedStart?: string;
  dueDate?: string;
  plannedDurationMinutes?: number;
  instructions?: string;
  createdAt: string;
  duration?: string;
  totalProductiveSeconds: number;
  isOverdue: boolean;
  timelineEvents: TaskTimelineEventDto[];
}

export const TaskAllocationPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeLookup[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [clients, setClients] = useState<ClientLookup[]>([]);
  const [mappings, setMappings] = useState<ProductClientMappingLookup[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterOverdue, setFilterOverdue] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Date & Smart View Filters
  const [filterDatePreset, setFilterDatePreset] = useState<string>('DEFAULT');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showAllTasks, setShowAllTasks] = useState<boolean>(false);

  // Assign Task Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>('');
  const [assignProductId, setAssignProductId] = useState<number | 'CUSTOM' | ''>('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');
  const [assignClientId, setAssignClientId] = useState<number | 'CUSTOM' | ''>('');
  const [isCustomClient, setIsCustomClient] = useState(false);
  const [customClientName, setCustomClientName] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(1); // Medium
  const [plannedStart, setPlannedStart] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [plannedHours, setPlannedHours] = useState<string>('8');
  const [plannedMinutes, setPlannedMinutes] = useState<string>('00');
  const [instructions, setInstructions] = useState('');
  const [assignError, setAssignError] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Timeline Drawer State
  const [selectedTaskForTimeline, setSelectedTaskForTimeline] = useState<TaskItem | null>(null);

  // Reassign Modal State
  const [reassignTask, setReassignTask] = useState<TaskItem | null>(null);
  const [reassignNewEmployeeId, setReassignNewEmployeeId] = useState<string>('');
  const [reassignRemarks, setReassignRemarks] = useState<string>('');
  const [reassignError, setReassignError] = useState<string>('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  // Cancel Modal State
  const [cancelTask, setCancelTask] = useState<TaskItem | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState<string>('');
  const [cancelError, setCancelError] = useState<string>('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const fetchLookups = async () => {
    try {
      const [empRes, deptRes, prodRes, clientRes, mapRes] = await Promise.all([
        apiClient.get('/employees?pageSize=1000'),
        apiClient.get('/departments'),
        apiClient.get('/products'),
        apiClient.get('/clients'),
        apiClient.get('/mappings'),
      ]);

      if (empRes.data?.success) {
        const raw = empRes.data.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
        setEmployees(list.filter((e: any) => e.isActive !== false));
      }
      if (deptRes.data?.success) setDepartments(Array.isArray(deptRes.data.data) ? deptRes.data.data : []);
      if (prodRes.data?.success) setProducts(Array.isArray(prodRes.data.data) ? prodRes.data.data : []);
      if (clientRes.data?.success) setClients(Array.isArray(clientRes.data.data) ? clientRes.data.data : []);
      if (mapRes.data?.success) setMappings(Array.isArray(mapRes.data.data) ? mapRes.data.data : []);
    } catch (err) {
      // Ignore lookup errors
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterEmployeeId) params.employeeId = filterEmployeeId;
      if (filterDepartmentId) params.departmentId = filterDepartmentId;
      if (filterStatus) params.status = filterStatus;
      if (filterOverdue) params.isOverdue = true;

      const res = await apiClient.get('/tasks/admin-all', { params });
      if (res.data?.success) {
        setTasks(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filterEmployeeId, filterDepartmentId, filterStatus, filterOverdue]);

  const availableClients = React.useMemo(() => {
    if (!assignProductId || isCustomProduct) return [];
    const mappedClientIds = mappings
      .filter((m) => m.productId === Number(assignProductId) && m.isActive !== false)
      .map((m) => m.clientId);

    return clients.filter((c) => mappedClientIds.includes(c.id));
  }, [assignProductId, isCustomProduct, clients, mappings]);

  const handleOpenAssignModal = () => {
    setAssignEmployeeId('');
    setAssignProductId('');
    setIsCustomProduct(false);
    setCustomProductName('');
    setAssignClientId('');
    setIsCustomClient(false);
    setCustomClientName('');
    setModuleName('');
    setDescription('');
    setPriority(1);
    setPlannedStart('');
    setDueDate('');
    setPlannedHours('8');
    setPlannedMinutes('00');
    setInstructions('');
    setAssignError('');
    setShowAssignModal(true);
  };

  const handleConfirmAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError('');

    if (!assignEmployeeId) {
      setAssignError('Please select a target employee.');
      return;
    }

    if (!isCustomProduct && (!assignProductId || assignProductId === 'CUSTOM')) {
      setAssignError('Please select a product or enter custom product name.');
      return;
    }

    if (isCustomProduct && !customProductName.trim()) {
      setAssignError('Custom product name cannot be empty.');
      return;
    }

    if (!isCustomClient && (!assignClientId || assignClientId === 'CUSTOM')) {
      setAssignError('Please select a client or enter custom client name.');
      return;
    }

    if (isCustomClient && !customClientName.trim()) {
      setAssignError('Custom client name cannot be empty.');
      return;
    }

    if (!moduleName.trim() || !description.trim()) {
      setAssignError('Task Title / Module Name and Description are required.');
      return;
    }

    if (plannedStart && dueDate && dueDate < plannedStart) {
      setAssignError('Due Date cannot be earlier than Planned Start Date.');
      return;
    }

    setSubmittingAssign(true);

    try {
      const h = parseInt(plannedHours || '0', 10);
      const m = parseInt(plannedMinutes || '0', 10);
      const plannedMins = (h > 0 || m > 0) ? (h * 60 + m) : null;

      await apiClient.post('/tasks/assign', {
        employeeId: Number(assignEmployeeId),
        productId: isCustomProduct ? null : Number(assignProductId),
        customProductName: isCustomProduct ? customProductName.trim() : null,
        clientId: isCustomClient ? null : Number(assignClientId),
        customClientName: isCustomClient ? customClientName.trim() : null,
        moduleName: moduleName.trim(),
        description: description.trim(),
        priority,
        plannedStart: plannedStart ? new Date(plannedStart).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        plannedDurationMinutes: plannedMins,
        instructions: instructions.trim() || null,
      });

      setShowAssignModal(false);
      fetchTasks();
    } catch (err: any) {
      setAssignError(err.response?.data?.message || 'Failed to assign work task.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTask || !reassignNewEmployeeId) return;

    setSubmittingReassign(true);
    setReassignError('');

    try {
      await apiClient.post(`/tasks/${reassignTask.id}/reassign`, {
        newEmployeeId: Number(reassignNewEmployeeId),
        remarks: reassignRemarks.trim() || null,
      });

      setReassignTask(null);
      fetchTasks();
    } catch (err: any) {
      setReassignError(err.response?.data?.message || 'Failed to reassign task.');
    } finally {
      setSubmittingReassign(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTask) return;

    setSubmittingCancel(true);
    setCancelError('');

    try {
      await apiClient.post(`/tasks/${cancelTask.id}/cancel`, {
        remarks: cancelRemarks.trim() || null,
      });

      setCancelTask(null);
      fetchTasks();
    } catch (err: any) {
      setCancelError(err.response?.data?.message || 'Failed to cancel task.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleResetFilters = () => {
    setFilterEmployeeId('');
    setFilterDepartmentId('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterOverdue(false);
    setFilterDatePreset('DEFAULT');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowAllTasks(false);
    setSearchQuery('');
  };

  const isTaskCompletedToday = (t: TaskItem): boolean => {
    if (t.status !== 'Completed') return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const completedEvent = t.timelineEvents?.find((e) => e.eventType === 'Completed');
    if (completedEvent?.timestamp) {
      const eventDateStr = new Date(completedEvent.timestamp).toISOString().split('T')[0];
      return eventDateStr === todayStr;
    }
    if (t.createdAt) {
      const createdDateStr = new Date(t.createdAt).toISOString().split('T')[0];
      return createdDateStr === todayStr;
    }
    return true;
  };

  const isDateInDayWindow = (dateStrOrObj: string | Date | undefined | null, targetDay: Date): boolean => {
    if (!dateStrOrObj) return false;
    const d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) return false;
    return (
      d.getFullYear() === targetDay.getFullYear() &&
      d.getMonth() === targetDay.getMonth() &&
      d.getDate() === targetDay.getDate()
    );
  };

  const isDateInRangeWindow = (dateStrOrObj: string | Date | undefined | null, start: Date, end: Date): boolean => {
    if (!dateStrOrObj) return false;
    const d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) return false;
    return d >= start && d <= end;
  };

  const isTaskInDateRange = (t: TaskItem, preset: string, customStart: string, customEnd: string): boolean => {
    if (preset === 'DEFAULT') return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (preset === 'TODAY') {
      // 1. Employee is working on it today / currently active status
      const isCurrentlyActive =
        t.status === 'Running' ||
        t.status === 'InProgress' ||
        t.status === 'OnHold' ||
        t.status === 'Assigned' ||
        t.status === 'NotStarted';

      if (isCurrentlyActive) return true;

      // 2. Completed today
      if (isTaskCompletedToday(t)) return true;

      // 3. Created today, planned start today, or due today
      if (isDateInDayWindow(t.createdAt, today)) return true;
      if (isDateInDayWindow(t.plannedStart, today)) return true;
      if (isDateInDayWindow(t.dueDate, today)) return true;

      // 4. Timeline events today
      if (t.timelineEvents?.some((e) => isDateInDayWindow(e.timestamp, today))) return true;

      return false;
    }

    if (preset === 'YESTERDAY') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (isDateInDayWindow(t.createdAt, yesterday)) return true;
      if (isDateInDayWindow(t.plannedStart, yesterday)) return true;
      if (isDateInDayWindow(t.dueDate, yesterday)) return true;
      if (t.timelineEvents?.some((e) => isDateInDayWindow(e.timestamp, yesterday))) return true;

      return false;
    }

    if (preset === 'THIS_WEEK') {
      const dayOfWeek = today.getDay();
      const distanceToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      if (t.status === 'Running' || t.status === 'InProgress' || t.status === 'OnHold' || t.status === 'Assigned') return true;
      if (isDateInRangeWindow(t.createdAt, monday, sunday)) return true;
      if (isDateInRangeWindow(t.plannedStart, monday, sunday)) return true;
      if (isDateInRangeWindow(t.dueDate, monday, sunday)) return true;
      if (t.timelineEvents?.some((e) => isDateInRangeWindow(e.timestamp, monday, sunday))) return true;

      return false;
    }

    if (preset === 'THIS_MONTH') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      if (t.status === 'Running' || t.status === 'InProgress' || t.status === 'OnHold' || t.status === 'Assigned') return true;
      if (isDateInRangeWindow(t.createdAt, startOfMonth, endOfMonth)) return true;
      if (isDateInRangeWindow(t.plannedStart, startOfMonth, endOfMonth)) return true;
      if (isDateInRangeWindow(t.dueDate, startOfMonth, endOfMonth)) return true;
      if (t.timelineEvents?.some((e) => isDateInRangeWindow(e.timestamp, startOfMonth, endOfMonth))) return true;

      return false;
    }

    if (preset === 'CUSTOM') {
      if (!customStart && !customEnd) return true;
      const start = customStart ? new Date(customStart) : new Date(0);
      const end = customEnd ? new Date(customEnd) : new Date(8640000000000000);
      end.setHours(23, 59, 59, 999);

      if (isDateInRangeWindow(t.createdAt, start, end)) return true;
      if (isDateInRangeWindow(t.plannedStart, start, end)) return true;
      if (isDateInRangeWindow(t.dueDate, start, end)) return true;
      if (t.timelineEvents?.some((e) => isDateInRangeWindow(e.timestamp, start, end))) return true;

      return false;
    }

    return true;
  };

  const getPriorityOrder = (t: TaskItem): number => {
    if (t.isOverdue && t.status !== 'Completed' && t.status !== 'Cancelled') return 1; // 1: Overdue
    if (t.status === 'OnHold') return 2; // 2: On Hold
    if (t.status === 'Running' || t.status === 'InProgress' || t.status === 'Assigned' || t.status === 'NotStarted') return 3; // 3: In Progress / Active
    if (t.status === 'Completed') return 4; // 4: Completed Today
    return 5; // 5: Cancelled or others
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const filteredTasks = safeTasks.filter((t) => {
    if (!t) return false;

    // Search Query Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (t.moduleName && t.moduleName.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.employeeName && t.employeeName.toLowerCase().includes(q)) ||
        (t.productName && t.productName.toLowerCase().includes(q)) ||
        (t.clientCompanyName && t.clientCompanyName.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Priority Filter
    if (filterPriority && t.priority !== undefined && t.priority !== null && t.priority.toString() !== filterPriority) {
      return false;
    }

    // Status Filter
    if (filterStatus && t.status !== filterStatus) {
      return false;
    }

    // Overdue Filter
    if (filterOverdue && !t.isOverdue) {
      return false;
    }

    // Date Range Filter
    if (filterDatePreset !== 'DEFAULT') {
      if (!isTaskInDateRange(t, filterDatePreset, customStartDate, customEndDate)) {
        return false;
      }
    }

    // Smart Default Mode (applied only when no employee, date range, or explicit filters/showAll are active)
    if (!showAllTasks && !filterEmployeeId && filterDatePreset === 'DEFAULT' && !filterStatus && !filterOverdue) {
      const isCompletedToday = isTaskCompletedToday(t);
      const isPendingOrActive =
        t.isOverdue ||
        t.status === 'OnHold' ||
        t.status === 'Running' ||
        t.status === 'InProgress' ||
        t.status === 'Assigned' ||
        t.status === 'NotStarted';

      if (!isCompletedToday && !isPendingOrActive) {
        return false; // Exclude older completed & cancelled tasks from earlier dates
      }
    }

    return true;
  });

  // Sort items with priority order (Overdue first, then On Hold, then In Progress, then Completed Today last)
  const displayTasks = [...filteredTasks].sort((a, b) => {
    const orderA = getPriorityOrder(a);
    const orderB = getPriorityOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return b.id - a.id;
  });

  // Metrics
  const totalCount = safeTasks.length;
  const assignedCount = safeTasks.filter((t) => t && (t.status === 'Assigned' || t.status === 'NotStarted')).length;
  const inProgressCount = safeTasks.filter((t) => t && (t.status === 'Running' || t.status === 'InProgress')).length;
  const overdueCount = safeTasks.filter((t) => t && t.isOverdue).length;
  const completedCount = safeTasks.filter((t) => t && t.status === 'Completed').length;

  const isAnyFilterActive =
    showAllTasks ||
    !!filterEmployeeId ||
    filterDatePreset !== 'DEFAULT' ||
    !!filterDepartmentId ||
    !!filterStatus ||
    !!filterPriority ||
    filterOverdue ||
    !!searchQuery;

  const selectedEmployeeObj = employees.find((e) => e.id.toString() === filterEmployeeId);

  const badgeStyle: React.CSSProperties = {
    height: '24px',
    padding: '0 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    whiteSpace: 'nowrap'
  };

  const getPriorityBadge = (p: number) => {
    switch (p) {
      case 3:
        return <span className="badge badge-danger" style={badgeStyle}>🔴 Urgent</span>;
      case 2:
        return <span className="badge badge-warning" style={badgeStyle}>🟠 High</span>;
      case 1:
        return <span className="badge badge-info" style={badgeStyle}>🔵 Medium</span>;
      default:
        return <span className="badge badge-secondary" style={badgeStyle}>⚪ Low</span>;
    }
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'Completed' && status !== 'Cancelled') {
      return <span className="badge badge-danger" style={badgeStyle}>⚠️ Overdue</span>;
    }
    switch (status) {
      case 'Assigned':
        return <span className="badge badge-info" style={badgeStyle}>📋 Assigned</span>;
      case 'NotStarted':
        return <span className="badge badge-secondary" style={badgeStyle}>⏳ Not Started</span>;
      case 'Running':
      case 'InProgress':
        return <span className="badge badge-success" style={badgeStyle}>⚙️ In Progress</span>;
      case 'OnHold':
        return <span className="badge badge-warning" style={badgeStyle}>⏸️ On Hold</span>;
      case 'Completed':
        return <span className="badge badge-success" style={badgeStyle}>✅ Completed</span>;
      case 'Cancelled':
        return <span className="badge badge-danger" style={badgeStyle}>❌ Cancelled</span>;
      default:
        return <span className="badge badge-secondary" style={badgeStyle}>{status}</span>;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Work Task Allocation Center
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Assign, schedule, and monitor work task allocation across the entire organization.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAssignModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={18} />
          <span>Assign New Work Task</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="ui-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Tasks</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{totalCount}</div>
        </div>
        <div className="ui-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned / Scheduled</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)', marginTop: '0.25rem' }}>{assignedCount}</div>
        </div>
        <div className="ui-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>In Progress</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>{inProgressCount}</div>
        </div>
        <div className="ui-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Overdue Tasks</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)', marginTop: '0.25rem' }}>{overdueCount}</div>
        </div>
        <div className="ui-card">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Completed</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>{completedCount}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ui-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          {/* Search */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Search Task / Module</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.2rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Employee</label>
            <select className="form-select" value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)}>
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.employeeCode} - {e.name}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Department</label>
            <select className="form-select" value={filterDepartmentId} onChange={(e) => setFilterDepartmentId(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter by Date</label>
            <select className="form-select" value={filterDatePreset} onChange={(e) => setFilterDatePreset(e.target.value)}>
              <option value="DEFAULT">Default (Smart View)</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range...</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Status</label>
            <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Running">In Progress</option>
              <option value="OnHold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Priority</label>
            <select className="form-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="0">Low</option>
              <option value="1">Medium</option>
              <option value="2">High</option>
              <option value="3">Urgent</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Pickers (if CUSTOM date preset selected) */}
        {filterDatePreset === 'CUSTOM' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <GlassDatePicker
                label="From Date"
                value={customStartDate}
                onChange={(val) => setCustomStartDate(val)}
                placeholder="Select start date..."
              />
            </div>
            <div>
              <GlassDatePicker
                label="To Date"
                value={customEndDate}
                onChange={(val) => setCustomEndDate(val)}
                minDate={customStartDate}
                placeholder="Select end date..."
              />
            </div>
          </div>
        )}

        {/* Bottom Actions Row: Show All Toggle & Overdue Checkbox */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowAllTasks(!showAllTasks)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: showAllTasks ? 'var(--primary-tint)' : 'rgba(255, 255, 255, 0.06)',
                color: showAllTasks ? 'var(--primary)' : 'var(--text-secondary)',
                border: showAllTasks ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Eye size={14} />
              <span>{showAllTasks ? 'Show All Tasks (Active)' : 'Show All Tasks'}</span>
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={filterOverdue}
                onChange={(e) => setFilterOverdue(e.target.checked)}
              />
              <span style={{ color: filterOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>⚠️ Overdue Only</span>
            </label>
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                textDecoration: 'underline'
              }}
            >
              <RotateCcw size={13} />
              <span>Reset to Smart Default</span>
            </button>
          )}
        </div>
      </div>

      {/* Smart View / Filter Mode Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-color)',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(232, 135, 60, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {filterEmployeeId && selectedEmployeeObj ? (
              <Search size={18} />
            ) : filterDatePreset !== 'DEFAULT' ? (
              <Calendar size={18} />
            ) : showAllTasks ? (
              <Eye size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {filterEmployeeId && selectedEmployeeObj
                ? `Showing full task history for ${selectedEmployeeObj.employeeCode} - ${selectedEmployeeObj.name}`
                : filterDatePreset !== 'DEFAULT'
                ? `Showing tasks for date filter (${filterDatePreset === 'CUSTOM' ? `${customStartDate || 'Start'} to ${customEndDate || 'End'}` : filterDatePreset})`
                : showAllTasks
                ? `Showing all tasks (Complete Unfiltered View)`
                : `Showing today's activity + all pending items`}
              <span
                style={{
                  marginLeft: '0.75rem',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600
                }}
              >
                {displayTasks.length} tasks
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              {filterEmployeeId && selectedEmployeeObj
                ? `Full historical record across all dates and statuses for this employee.`
                : filterDatePreset !== 'DEFAULT'
                ? `Showing tasks across all statuses within the selected date window.`
                : showAllTasks
                ? `Showing all historical completed, cancelled, and active tasks.`
                : `Excluding older completed & cancelled tasks from earlier dates for daily focus.`}
            </div>
          </div>
        </div>
      </div>

      {/* Task List Table */}
      <div className="table-container" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem' }}>Task / Module</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem' }}>Assigned To</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem' }}>Product & Client</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem' }}>Assigned By</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem' }}>Priority</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem' }}>Schedule & Planned</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem' }}>Status</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem' }}>Actual Time</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderBottom: '2px solid var(--border-color)', fontSize: '0.725rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Loading assigned work tasks...
                </td>
              </tr>
            ) : displayTasks.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No work tasks found matching selected criteria.
                </td>
              </tr>
            ) : (
              displayTasks.map((t) => (
                <tr key={t.id} style={{ height: '76px', borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                  {/* Task / Module */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px', maxWidth: '240px' }}>
                    <div
                      style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={t.moduleName}
                    >
                      {t.moduleName}
                    </div>
                    <div
                      style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}
                      title={t.description}
                    >
                      {t.description}
                    </div>
                  </td>

                  {/* Assigned To */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px', maxWidth: '180px' }}>
                    <div
                      style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={t.employeeName}
                    >
                      {t.employeeName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {t.employeeCode} • {t.departmentName}
                    </div>
                  </td>

                  {/* Product & Client */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px', maxWidth: '180px' }}>
                    <div
                      style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={t.productName}
                    >
                      {t.productName || 'N/A'}
                    </div>
                    <div
                      style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}
                      title={t.clientCompanyName}
                    >
                      {t.clientCompanyName || 'N/A'}
                    </div>
                  </td>

                  {/* Assigned By */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px', maxWidth: '140px' }}>
                    <div
                      style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={t.assignedByName || (t.assignerType === 2 ? 'System Admin' : 'Self')}
                    >
                      {t.assignedByName || (t.assignerType === 2 ? 'System Admin' : 'Self')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {t.assignerType === 2 ? 'Admin' : t.assignerType === 1 ? 'Reporting Person' : 'Employee Self'}
                    </div>
                  </td>

                  {/* Priority */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px' }}>
                    {getPriorityBadge(t.priority)}
                  </td>

                  {/* Schedule & Planned */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: t.isOverdue ? 'var(--danger-text)' : 'var(--text-primary)' }}>
                      {t.plannedStart ? formatDateIST(t.plannedStart) : 'ASAP'} → {t.dueDate ? `${formatDateIST(t.dueDate)} ${formatTimeIST(t.dueDate)}` : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {t.plannedDurationMinutes ? `Planned: ${Math.floor(t.plannedDurationMinutes / 60)}h ${t.plannedDurationMinutes % 60}m` : 'Planned: N/A'}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px' }}>
                    {getStatusBadge(t.status, t.isOverdue)}
                  </td>

                  {/* Actual Productive Time */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--success-text)' }}>
                      {formatDurationToHoursMinutes(t.totalProductiveSeconds / 3600)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ verticalAlign: 'middle', padding: '10px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ width: '30px', height: '30px', padding: 0, borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="View Audit Timeline"
                        onClick={() => setSelectedTaskForTimeline(t)}
                      >
                        <Clock size={15} />
                      </button>

                      {t.status !== 'Completed' && t.status !== 'Cancelled' && (
                        <>
                          <button
                            className="btn btn-secondary"
                            style={{ width: '30px', height: '30px', padding: 0, borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Reassign Task"
                            onClick={() => {
                              setReassignTask(t);
                              setReassignNewEmployeeId('');
                              setReassignRemarks('');
                              setReassignError('');
                            }}
                          >
                            <ArrowRightLeft size={15} />
                          </button>

                          <button
                            className="btn btn-secondary"
                            style={{ width: '30px', height: '30px', padding: 0, borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger-text)' }}
                            title="Cancel Task"
                            onClick={() => {
                              setCancelTask(t);
                              setCancelRemarks('');
                              setCancelError('');
                            }}
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="modal-backdrop">
          <div
            className="modal-content"
            style={{
              maxWidth: '720px',
              width: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(24px) saturate(150%)',
              WebkitBackdropFilter: 'blur(24px) saturate(150%)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              boxShadow: '0 8px 40px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#F5F5F5' }}>
                  Assign Work Task
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Create and allocate a new work task for any employee.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            {assignError && (
              <div style={{ background: 'rgba(240,96,96,0.12)', color: '#FF7B7B', border: '1px solid rgba(240,96,96,0.25)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.825rem', fontWeight: 500 }}>
                ⚠️ {assignError}
              </div>
            )}

            <form onSubmit={handleConfirmAssignTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              {/* SECTION 1: ASSIGNMENT DETAILS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.785rem', fontWeight: 700, color: '#E8873C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  1. Assignment Details
                </div>

                {/* Assign To Employee */}
                <div className="form-group" style={{ margin: 0 }}>
                  <GlassSelect
                    label="Assign To Employee"
                    required
                    searchable
                    placeholder="Search and select employee..."
                    value={assignEmployeeId}
                    onChange={(val) => setAssignEmployeeId(String(val))}
                    options={employees.map((e) => ({
                      value: e.id,
                      label: `${e.employeeCode} - ${e.name}`,
                    }))}
                  />
                </div>

                {/* Product & Client (Side-by-Side 2 Columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {/* Product */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Product Name *</label>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#E8873C', fontSize: '0.785rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        onClick={() => {
                          const newMode = !isCustomProduct;
                          setIsCustomProduct(newMode);
                          setAssignProductId(newMode ? 'CUSTOM' : '');
                          setCustomProductName('');
                          setAssignClientId('');
                          setCustomClientName('');
                          setIsCustomClient(false);
                        }}
                      >
                        {isCustomProduct ? '← Select Existing Product' : '+ Add Other Product'}
                      </button>
                    </div>

                    {isCustomProduct ? (
                      <input
                        type="text"
                        className="form-input"
                        value={customProductName}
                        onChange={(e) => setCustomProductName(e.target.value)}
                        placeholder="Enter custom product name..."
                        required
                      />
                    ) : (
                      <GlassSelect
                        placeholder="Select Product"
                        value={assignProductId}
                        onChange={(val) => {
                          if (val === 'CUSTOM') {
                            setIsCustomProduct(true);
                            setAssignProductId('CUSTOM');
                            setCustomProductName('');
                          } else {
                            setIsCustomProduct(false);
                            setAssignProductId(val ? Number(val) : '');
                          }
                          setAssignClientId('');
                          setCustomClientName('');
                          setIsCustomClient(false);
                        }}
                        options={[
                          ...products.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` })),
                          { value: 'CUSTOM', label: '+ Add Other Product...', isAction: true, dividerAbove: true },
                        ]}
                      />
                    )}
                  </div>

                  {/* Client */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Client Name *</label>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#E8873C', fontSize: '0.785rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        onClick={() => {
                          const newMode = !isCustomClient;
                          setIsCustomClient(newMode);
                          setAssignClientId(newMode ? 'CUSTOM' : '');
                          setCustomClientName('');
                        }}
                        disabled={!isCustomProduct && !assignProductId}
                      >
                        {isCustomClient ? '← Select Existing Client' : '+ Add Other Client'}
                      </button>
                    </div>

                    {isCustomClient ? (
                      <input
                        type="text"
                        className="form-input"
                        value={customClientName}
                        onChange={(e) => setCustomClientName(e.target.value)}
                        placeholder="Enter custom client company name..."
                        required
                      />
                    ) : (
                      <GlassSelect
                        disabled={!isCustomProduct && !assignProductId}
                        placeholder={
                          !isCustomProduct && !assignProductId
                            ? 'Select Product First'
                            : availableClients.length === 0 && !isCustomProduct
                            ? 'No Mapped Clients'
                            : 'Select Client'
                        }
                        value={assignClientId}
                        onChange={(val) => {
                          if (val === 'CUSTOM') {
                            setIsCustomClient(true);
                            setAssignClientId('CUSTOM');
                            setCustomClientName('');
                          } else {
                            setIsCustomClient(false);
                            setAssignClientId(val ? Number(val) : '');
                          }
                        }}
                        options={[
                          ...availableClients.map((c) => ({ value: c.id, label: c.companyName })),
                          { value: 'CUSTOM', label: '+ Add Other Client...', isAction: true, dividerAbove: true },
                        ]}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: TASK DETAILS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.785rem', fontWeight: 700, color: '#E8873C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  2. Task Details
                </div>

                {/* Module / Feature Name (max 100) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Task Title / Module Name *</label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: moduleName.length >= 100 ? '#EF4444' : moduleName.length >= 90 ? '#E8873C' : 'rgba(255, 255, 255, 0.5)',
                        fontWeight: moduleName.length >= 90 ? 600 : 400,
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {moduleName.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="e.g. Sales Portal Bug Fix"
                    maxLength={100}
                    required
                  />
                </div>

                {/* Task Description (max 500) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Task Description *</label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: description.length >= 500 ? '#EF4444' : description.length >= 450 ? '#E8873C' : 'rgba(255, 255, 255, 0.5)',
                        fontWeight: description.length >= 450 ? 600 : 400,
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {description.length}/500
                    </span>
                  </div>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed task description..."
                    maxLength={500}
                    required
                  />
                </div>
              </div>

              {/* SECTION 3: SCHEDULING & INSTRUCTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ fontSize: '0.785rem', fontWeight: 700, color: '#E8873C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  3. Scheduling & Instructions
                </div>

                {/* Priority, Planned Start Date, Due Date (3 Columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                  {/* Priority */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <GlassSelect
                      label="Priority"
                      value={priority}
                      onChange={(val) => setPriority(Number(val))}
                      options={[
                        { value: 0, label: 'Low' },
                        { value: 1, label: 'Medium' },
                        { value: 2, label: 'High' },
                        { value: 3, label: 'Urgent' },
                      ]}
                    />
                  </div>

                  {/* Planned Start Date */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <GlassDatePicker
                      label="Planned Start Date"
                      value={plannedStart}
                      onChange={(val) => setPlannedStart(val)}
                      minDate={new Date().toISOString().split('T')[0]}
                      placeholder="Select start date..."
                    />
                  </div>

                  {/* Due Date */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <GlassDatePicker
                      label="Due Date"
                      value={dueDate}
                      onChange={(val) => setDueDate(val)}
                      minDate={plannedStart || new Date().toISOString().split('T')[0]}
                      placeholder="Select due date..."
                    />
                  </div>
                </div>

                {/* Planned Duration (Hours & Minutes) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.3rem' }}>
                    Planned Duration *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                        Hours:
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="form-input"
                        placeholder="8"
                        value={plannedHours}
                        onChange={(e) => setPlannedHours(e.target.value)}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                        Minutes:
                      </span>
                      <GlassSelect
                        value={plannedMinutes}
                        onChange={(val) => setPlannedMinutes(String(val))}
                        options={[
                          { value: '00', label: '00 Mins' },
                          { value: '15', label: '15 Mins' },
                          { value: '30', label: '30 Mins' },
                          { value: '45', label: '45 Mins' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Instructions / Remarks (max 300) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Instructions / Remarks</label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: instructions.length >= 300 ? '#EF4444' : instructions.length >= 270 ? '#E8873C' : 'rgba(255, 255, 255, 0.5)',
                        fontWeight: instructions.length >= 270 ? 600 : 400,
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {instructions.length}/300
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Additional instructions..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    maxLength={300}
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  style={{
                    padding: '0.65rem 1.35rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.85rem',
                    background: 'linear-gradient(135deg, #E8873C 0%, #F59E0B 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: submittingAssign ? 'not-allowed' : 'pointer',
                    opacity: submittingAssign ? 0.65 : 1,
                    boxShadow: '0 4px 16px rgba(232, 135, 60, 0.4)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <span>{submittingAssign ? 'Assigning Work Task...' : 'Assign Work Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Task Modal */}
      {reassignTask && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
              Reassign Task: {reassignTask.moduleName}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Current Assignee: <strong>{reassignTask.employeeName}</strong>
            </p>

            {reassignError && (
              <div style={{ background: '#FDECEC', color: 'var(--danger)', padding: '0.6rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.825rem' }}>
                {reassignError}
              </div>
            )}

            <form onSubmit={handleConfirmReassign}>
              <div className="form-group">
                <label className="form-label">Select New Employee *</label>
                <select
                  className="form-select"
                  value={reassignNewEmployeeId}
                  onChange={(e) => setReassignNewEmployeeId(e.target.value)}
                  required
                >
                  <option value="">Select New Assignee</option>
                  {employees
                    .filter((e) => e.id !== reassignTask.employeeId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>{e.employeeCode} - {e.name}</option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reassignment Remarks</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Reason for reassignment..."
                  value={reassignRemarks}
                  onChange={(e) => setReassignRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReassignTask(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingReassign}>
                  {submittingReassign ? 'Reassigning...' : 'Confirm Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Task Modal */}
      {cancelTask && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)' }}>
              Cancel Task: {cancelTask.moduleName}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Are you sure you want to cancel this task assigned to <strong>{cancelTask.employeeName}</strong>?
            </p>

            {cancelError && (
              <div style={{ background: '#FDECEC', color: 'var(--danger)', padding: '0.6rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.825rem' }}>
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancel}>
              <div className="form-group">
                <label className="form-label">Cancellation Remarks</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Reason for cancellation..."
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCancelTask(null)}>
                  Keep Task
                </button>
                <button type="submit" className="btn btn-danger" disabled={submittingCancel}>
                  {submittingCancel ? 'Cancelling...' : 'Confirm Cancel Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Timeline Drawer */}
      <TaskTimelineDrawer
        isOpen={!!selectedTaskForTimeline}
        onClose={() => setSelectedTaskForTimeline(null)}
        taskTitle={selectedTaskForTimeline?.moduleName || ''}
        employeeName={selectedTaskForTimeline?.employeeName || ''}
        events={selectedTaskForTimeline?.timelineEvents || []}
      />
    </div>
  );
};
