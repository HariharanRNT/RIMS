import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { formatDurationToHoursMinutes, formatDateIST, formatTimeIST } from '../../utils/dateUtils';
import { TaskTimelineDrawer } from '../../components/tasks/TaskTimelineDrawer';
import type { TaskTimelineEventDto } from '../../components/tasks/TaskTimelineDrawer';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassDatePicker } from '../../components/ui/GlassDatePicker';
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Briefcase,
  UserCheck,
  Plus,
  Users,
  ArrowRightLeft,
  XCircle,
  Coffee,
  Activity,
  AlertCircle,
  Search,
  Calendar,
  RotateCcw,
  Eye
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  code: string;
}

interface Client {
  id: number;
  companyName: string;
}

interface ProductClientMapping {
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
  updatedAt?: string;
  duration?: string;
  totalProductiveSeconds: number;
  isOverdue: boolean;
  timelineEvents: TaskTimelineEventDto[];
}

interface TeamEmployee {
  id: number;
  employeeCode: string;
  name: string;
  departmentName: string;
  designationName: string;
}

export const WorkTaskPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'assigned-tasks' | 'team-tasks'>('my-tasks');

  // Master Data
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<ProductClientMapping[]>([]);

  // Self Task Form State
  const [productId, setProductId] = useState<number | 'CUSTOM' | ''>('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');

  const [clientId, setClientId] = useState<number | 'CUSTOM' | ''>('');
  const [isCustomClient, setIsCustomClient] = useState(false);
  const [customClientName, setCustomClientName] = useState('');

  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');

  // Task Lists
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<TaskItem[]>([]);

  // Team Tasks State (Reporting Person Only)
  const [teamEmployees, setTeamEmployees] = useState<TeamEmployee[]>([]);
  const [teamTasks, setTeamTasks] = useState<TaskItem[]>([]);
  const [showTeamAssignModal, setShowTeamAssignModal] = useState(false);

  // Team Tasks Filters & Smart View
  const [teamFilterEmployeeId, setTeamFilterEmployeeId] = useState<string>('');
  const [teamFilterStatus, setTeamFilterStatus] = useState<string>('');
  const [teamFilterPriority, setTeamFilterPriority] = useState<string>('');
  const [teamFilterOverdue, setTeamFilterOverdue] = useState<boolean>(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');
  const [teamFilterDatePreset, setTeamFilterDatePreset] = useState<string>('DEFAULT');
  const [teamCustomStartDate, setTeamCustomStartDate] = useState<string>('');
  const [teamCustomEndDate, setTeamCustomEndDate] = useState<string>('');
  const [teamShowAllTasks, setTeamShowAllTasks] = useState<boolean>(false);

  // Team Task Modal Form
  const [teamTargetEmployeeId, setTeamTargetEmployeeId] = useState('');
  const [teamProductId, setTeamProductId] = useState<number | 'CUSTOM' | ''>('');
  const [isTeamCustomProduct, setIsTeamCustomProduct] = useState(false);
  const [teamCustomProductName, setTeamCustomProductName] = useState('');
  const [teamClientId, setTeamClientId] = useState<number | 'CUSTOM' | ''>('');
  const [isTeamCustomClient, setIsTeamCustomClient] = useState(false);
  const [teamCustomClientName, setTeamCustomClientName] = useState('');
  const [teamModuleName, setTeamModuleName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamPriority, setTeamPriority] = useState<number>(1);
  const [teamPlannedStart, setTeamPlannedStart] = useState('');
  const [teamDueDate, setTeamDueDate] = useState('');
  const [teamPlannedHours, setTeamPlannedHours] = useState('8');
  const [teamPlannedMinutes, setTeamPlannedMinutes] = useState('00');
  const [teamInstructions, setTeamInstructions] = useState('');
  const [teamAssignError, setTeamAssignError] = useState('');
  const [submittingTeamAssign, setSubmittingTeamAssign] = useState(false);

  // Reassign / Cancel Team Task Modals
  const [reassignTask, setReassignTask] = useState<TaskItem | null>(null);
  const [reassignNewEmployeeId, setReassignNewEmployeeId] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  const [cancelTask, setCancelTask] = useState<TaskItem | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Timeline Drawer State
  const [selectedTaskForTimeline, setSelectedTaskForTimeline] = useState<TaskItem | null>(null);

  const [loading, setLoading] = useState(false);

  const fetchLookups = async () => {
    try {
      const [prodRes, clientRes, mapRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/clients'),
        apiClient.get('/mappings'),
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (clientRes.data.success) setClients(clientRes.data.data);
      if (mapRes.data.success) setMappings(mapRes.data.data);
    } catch {
      // Ignore
    }
  };

  const fetchMyTasksData = async () => {
    if (!user?.employeeId) return;
    setLoading(true);

    try {
      const [historyRes, assignedRes] = await Promise.all([
        apiClient.get(`/tasks/history/${user.employeeId}`),
        apiClient.get(`/tasks/assigned/${user.employeeId}`),
      ]);

      if (historyRes.data.success) setMyTasks(historyRes.data.data);
      if (assignedRes.data.success) setAssignedTasks(assignedRes.data.data);
    } catch (err) {
      console.error('Failed to load employee tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamData = async () => {
    try {
      const [teamEmpRes, teamTaskRes] = await Promise.all([
        apiClient.get('/tasks/team-employees'),
        apiClient.get('/tasks/team-tasks'),
      ]);

      if (teamEmpRes.data.success) setTeamEmployees(teamEmpRes.data.data);
      if (teamTaskRes.data.success) setTeamTasks(teamTaskRes.data.data);
    } catch {
      // User may not be a reporting person
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchMyTasksData();
    fetchTeamData();
    fetchMetrics();
  }, [user]);

  useEffect(() => {
    const handleActivityChanged = () => {
      fetchMyTasksData();
      fetchMetrics();
    };
    window.addEventListener('activity-changed', handleActivityChanged);
    return () => window.removeEventListener('activity-changed', handleActivityChanged);
  }, [user]);

  // Active Running Task & Metrics State
  const [metrics, setMetrics] = useState<{
    todayProductiveHours: number;
    todayBreakHours: number;
    todayActivitiesCount: number;
  } | null>(null);

  const fetchMetrics = async () => {
    if (!user?.employeeId) return;
    try {
      const res = await apiClient.get(`/reports/employee-dashboard/${user.employeeId}`);
      if (res.data.success) {
        setMetrics({
          todayProductiveHours: res.data.data.todayProductiveHours || 0,
          todayBreakHours: res.data.data.todayBreakHours || 0,
          todayActivitiesCount: res.data.data.todayActivitiesCount || 0,
        });
      }
    } catch {
      // Ignore
    }
  };

  const isTodayIST = (isoStr: string | null | undefined): boolean => {
    if (!isoStr) return false;
    const todayStr = formatDateIST(new Date().toISOString());
    const itemDateStr = formatDateIST(isoStr);
    return todayStr === itemDateStr;
  };

  const myRecentTasks = React.useMemo(() => {
    return myTasks.filter((t) => {
      const isDoneOrCancelled = t.status === 'Completed' || t.status === 'Cancelled';
      if (isDoneOrCancelled) {
        const isUpdatedToday = t.updatedAt ? isTodayIST(t.updatedAt) : false;
        const isCreatedToday = isTodayIST(t.createdAt);
        const hasTodayTimelineEvent = t.timelineEvents?.some(
          (e) => (e.eventType === 'Completed' || e.eventType === 'Cancelled') && isTodayIST(e.timestamp)
        );
        return isUpdatedToday || isCreatedToday || !!hasTodayTimelineEvent;
      }
      return true;
    });
  }, [myTasks]);

  const activeRunningTask = React.useMemo(() => {
    return (
      myTasks.find((t) => t.status === 'Running' || t.status === 'InProgress') ||
      assignedTasks.find((t) => t.status === 'Running' || t.status === 'InProgress') ||
      null
    );
  }, [myTasks, assignedTasks]);

  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    if (!activeRunningTask) {
      setTimerSeconds(0);
      return;
    }

    setTimerSeconds(activeRunningTask.totalProductiveSeconds || 0);

    const timer = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRunningTask?.id, activeRunningTask?.status]);

  const formatSecondsToHHMMSS = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const availableClients = React.useMemo(() => {
    if (!productId || isCustomProduct) return [];
    const mappedClientIds = mappings
      .filter((m) => m.productId === Number(productId) && m.isActive !== false)
      .map((m) => m.clientId);

    return clients.filter((c) => mappedClientIds.includes(c.id));
  }, [productId, isCustomProduct, clients, mappings]);

  const availableTeamClients = React.useMemo(() => {
    if (!teamProductId || isTeamCustomProduct) return [];
    const mappedClientIds = mappings
      .filter((m) => m.productId === Number(teamProductId) && m.isActive !== false)
      .map((m) => m.clientId);

    return clients.filter((c) => mappedClientIds.includes(c.id));
  }, [teamProductId, isTeamCustomProduct, clients, mappings]);

  // Form Submission
  const handleStartSelfTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCustomProduct && !productId) {
      alert('Please select a Product or enter a Custom Product.');
      return;
    }
    if (!isCustomClient && !clientId) {
      alert('Please select a Client or enter a Custom Client.');
      return;
    }
    if (!moduleName.trim()) {
      alert('Please enter a Module Name.');
      return;
    }

    try {
      const payload: any = {
        moduleName: moduleName.trim(),
        description: description.trim(),
      };

      if (isCustomProduct) {
        payload.customProductName = customProductName.trim();
      } else {
        payload.productId = Number(productId);
      }

      if (isCustomClient) {
        payload.customClientCompanyName = customClientName.trim();
      } else {
        payload.clientId = Number(clientId);
      }

      const res = await apiClient.post('/tasks/self-start', payload);

      if (res.data.success) {
        setModuleName('');
        setDescription('');
        setProductId('');
        setIsCustomProduct(false);
        setCustomProductName('');
        setClientId('');
        setIsCustomClient(false);
        setCustomClientName('');

        window.dispatchEvent(new Event('activity-changed'));
        fetchMyTasksData();
        fetchMetrics();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start task.');
    }
  };

  // Task Actions
  const handleHoldTask = async (taskId: number) => {
    try {
      const res = await apiClient.post(`/tasks/${taskId}/hold`);
      if (res.data.success) {
        window.dispatchEvent(new Event('activity-changed'));
        fetchMyTasksData();
        fetchMetrics();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to hold task.');
    }
  };

  const handleResumeTask = async (taskId: number) => {
    try {
      const res = await apiClient.post(`/tasks/${taskId}/resume`);
      if (res.data.success) {
        window.dispatchEvent(new Event('activity-changed'));
        fetchMyTasksData();
        fetchMetrics();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume task.');
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      const res = await apiClient.post(`/tasks/${taskId}/complete`);
      if (res.data.success) {
        window.dispatchEvent(new Event('activity-changed'));
        fetchMyTasksData();
        fetchMetrics();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete task.');
    }
  };

  const handleStartAssignedTask = async (taskId: number) => {
    try {
      const res = await apiClient.post(`/tasks/assigned/${taskId}/start`);
      if (res.data.success) {
        window.dispatchEvent(new Event('activity-changed'));
        fetchMyTasksData();
        fetchMetrics();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start assigned task.');
    }
  };

  // Team Task Actions
  const handleCreateTeamTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamAssignError('');

    if (!teamTargetEmployeeId) {
      setTeamAssignError('Please select a team member.');
      return;
    }
    if (!isTeamCustomProduct && !teamProductId) {
      setTeamAssignError('Please select a product or add custom product.');
      return;
    }
    if (!isTeamCustomClient && !teamClientId) {
      setTeamAssignError('Please select a client or add custom client.');
      return;
    }
    if (!teamModuleName.trim()) {
      setTeamAssignError('Please enter module name.');
      return;
    }
    if (teamPlannedStart && teamDueDate && teamDueDate < teamPlannedStart) {
      setTeamAssignError('Due Date cannot be earlier than Planned Start Date.');
      return;
    }

    setSubmittingTeamAssign(true);

    try {
      const plannedMinutes = (parseInt(teamPlannedHours || '0') * 60) + parseInt(teamPlannedMinutes || '0');

      const payload: any = {
        employeeId: Number(teamTargetEmployeeId),
        moduleName: teamModuleName.trim(),
        description: teamDescription.trim(),
        priority: Number(teamPriority),
        plannedStart: teamPlannedStart ? new Date(teamPlannedStart).toISOString() : undefined,
        dueDate: teamDueDate ? new Date(teamDueDate).toISOString() : undefined,
        plannedDurationMinutes: plannedMinutes > 0 ? plannedMinutes : undefined,
        instructions: teamInstructions.trim() || undefined,
      };

      if (isTeamCustomProduct) {
        payload.customProductName = teamCustomProductName.trim();
      } else {
        payload.productId = Number(teamProductId);
      }

      if (isTeamCustomClient) {
        payload.customClientCompanyName = teamCustomClientName.trim();
      } else {
        payload.clientId = Number(teamClientId);
      }

      const res = await apiClient.post('/tasks/assign', payload);

      if (res.data.success) {
        setShowTeamAssignModal(false);
        fetchTeamData();
      }
    } catch (err: any) {
      setTeamAssignError(err.response?.data?.message || 'Failed to assign team task.');
    } finally {
      setSubmittingTeamAssign(false);
    }
  };

  const handleReassignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTask || !reassignNewEmployeeId) return;
    setSubmittingReassign(true);

    try {
      const res = await apiClient.post(`/tasks/${reassignTask.id}/reassign`, {
        newEmployeeId: Number(reassignNewEmployeeId),
        remarks: reassignRemarks.trim() || undefined,
      });

      if (res.data.success) {
        setReassignTask(null);
        fetchTeamData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reassign task.');
    } finally {
      setSubmittingReassign(false);
    }
  };

  const handleCancelTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTask) return;
    setSubmittingCancel(true);

    try {
      const res = await apiClient.post(`/tasks/${cancelTask.id}/cancel`, {
        remarks: cancelRemarks.trim() || undefined,
      });

      if (res.data.success) {
        setCancelTask(null);
        fetchTeamData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel task.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Team Task Filtering & Smart Default Logic
  const handleResetTeamFilters = () => {
    setTeamFilterEmployeeId('');
    setTeamFilterStatus('');
    setTeamFilterPriority('');
    setTeamFilterOverdue(false);
    setTeamSearchQuery('');
    setTeamFilterDatePreset('DEFAULT');
    setTeamCustomStartDate('');
    setTeamCustomEndDate('');
    setTeamShowAllTasks(false);
  };

  const isTaskCompletedToday = (t: TaskItem): boolean => {
    if (t.status !== 'Completed') return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const completedEvent = t.timelineEvents?.find((e) => e.eventType === 'Completed');
    if (completedEvent?.timestamp) {
      const eventDateStr = new Date(completedEvent.timestamp).toISOString().split('T')[0];
      return eventDateStr === todayStr;
    }
    if (t.updatedAt) {
      const updatedDateStr = new Date(t.updatedAt).toISOString().split('T')[0];
      if (updatedDateStr === todayStr) return true;
    }
    if (t.createdAt) {
      const createdDateStr = new Date(t.createdAt).toISOString().split('T')[0];
      if (createdDateStr === todayStr) return true;
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
      const isCurrentlyActive =
        t.status === 'Running' ||
        t.status === 'InProgress' ||
        t.status === 'OnHold' ||
        t.status === 'Hold' ||
        t.status === 'Assigned' ||
        t.status === 'NotStarted';

      if (isCurrentlyActive) return true;
      if (isTaskCompletedToday(t)) return true;
      if (isDateInDayWindow(t.createdAt, today)) return true;
      if (isDateInDayWindow(t.plannedStart, today)) return true;
      if (isDateInDayWindow(t.dueDate, today)) return true;
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

      if (t.status === 'Running' || t.status === 'InProgress' || t.status === 'OnHold' || t.status === 'Hold' || t.status === 'Assigned') return true;
      if (isDateInRangeWindow(t.createdAt, monday, sunday)) return true;
      if (isDateInRangeWindow(t.plannedStart, monday, sunday)) return true;
      if (isDateInRangeWindow(t.dueDate, monday, sunday)) return true;
      if (t.timelineEvents?.some((e) => isDateInRangeWindow(e.timestamp, monday, sunday))) return true;

      return false;
    }

    if (preset === 'THIS_MONTH') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      if (t.status === 'Running' || t.status === 'InProgress' || t.status === 'OnHold' || t.status === 'Hold' || t.status === 'Assigned') return true;
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

  const getTeamTaskPriorityOrder = (t: TaskItem): number => {
    if (t.isOverdue && t.status !== 'Completed' && t.status !== 'Cancelled') return 1; // 1: Overdue
    if (t.status === 'OnHold' || t.status === 'Hold') return 2; // 2: On Hold
    if (t.status === 'Running' || t.status === 'InProgress' || t.status === 'Assigned' || t.status === 'NotStarted') return 3; // 3: In Progress / Active
    if (t.status === 'Completed') return 4; // 4: Completed Today
    return 5; // 5: Cancelled or others
  };

  const safeTeamTasks = Array.isArray(teamTasks) ? teamTasks : [];

  const filteredTeamTasks = safeTeamTasks.filter((t) => {
    if (!t) return false;

    // Search Query
    if (teamSearchQuery) {
      const q = teamSearchQuery.toLowerCase();
      const match =
        (t.moduleName && t.moduleName.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.employeeName && t.employeeName.toLowerCase().includes(q)) ||
        (t.productName && t.productName.toLowerCase().includes(q)) ||
        (t.clientCompanyName && t.clientCompanyName.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Employee Filter
    if (teamFilterEmployeeId && t.employeeId.toString() !== teamFilterEmployeeId) {
      return false;
    }

    // Status Filter
    if (teamFilterStatus && t.status !== teamFilterStatus) {
      return false;
    }

    // Priority Filter
    if (teamFilterPriority && t.priority !== undefined && t.priority !== null && t.priority.toString() !== teamFilterPriority) {
      return false;
    }

    // Overdue Filter
    if (teamFilterOverdue && !t.isOverdue) {
      return false;
    }

    // Date Range Filter
    if (teamFilterDatePreset !== 'DEFAULT') {
      if (!isTaskInDateRange(t, teamFilterDatePreset, teamCustomStartDate, teamCustomEndDate)) {
        return false;
      }
    }

    // Smart Default Mode (applied only when no employee, date range, or explicit filters/showAll are active)
    if (!teamShowAllTasks && !teamFilterEmployeeId && teamFilterDatePreset === 'DEFAULT' && !teamFilterStatus && !teamFilterOverdue) {
      const isCompletedToday = isTaskCompletedToday(t);
      const isPendingOrActive =
        t.isOverdue ||
        t.status === 'OnHold' ||
        t.status === 'Hold' ||
        t.status === 'Running' ||
        t.status === 'InProgress' ||
        t.status === 'Assigned' ||
        t.status === 'NotStarted';

      if (!isCompletedToday && !isPendingOrActive) {
        return false; // Exclude older completed & cancelled tasks
      }
    }

    return true;
  });

  // Sort by Urgency Priority Order
  const displayTeamTasks = [...filteredTeamTasks].sort((a, b) => {
    const orderA = getTeamTaskPriorityOrder(a);
    const orderB = getTeamTaskPriorityOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return b.id - a.id;
  });

  const isAnyTeamFilterActive =
    teamShowAllTasks ||
    !!teamFilterEmployeeId ||
    teamFilterDatePreset !== 'DEFAULT' ||
    !!teamFilterStatus ||
    !!teamFilterPriority ||
    teamFilterOverdue ||
    !!teamSearchQuery;

  const selectedTeamMemberObj = teamEmployees.find((e) => e.id.toString() === teamFilterEmployeeId);

  // Status and Priority Badges (Pill Shape, Glass Colors)
  const getPriorityBadge = (priority: number) => {
    const badgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.25rem 0.65rem',
      borderRadius: '9999px',
      fontSize: '0.725rem',
      fontWeight: 600
    };

    switch (priority) {
      case 3:
        return <span style={{ ...badgeStyle, background: 'rgba(239, 68, 68, 0.15)', color: '#FF7B7B', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Urgent</span>;
      case 2:
        return <span style={{ ...badgeStyle, background: 'rgba(245, 165, 36, 0.15)', color: '#F5C060', border: '1px solid rgba(245, 165, 36, 0.3)' }}>High</span>;
      case 1:
        return <span style={{ ...badgeStyle, background: 'rgba(60, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(60, 130, 246, 0.3)' }}>Medium</span>;
      default:
        return <span style={{ ...badgeStyle, background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>Low</span>;
    }
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    const badgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.3rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.2,
      whiteSpace: 'nowrap'
    };

    if (isOverdue && status !== 'Completed' && status !== 'Cancelled') {
      return (
        <span style={{
          ...badgeStyle,
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#FF7B7B',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <AlertCircle size={13} />
          Overdue
        </span>
      );
    }

    switch (status) {
      case 'Running':
      case 'InProgress':
        return (
          <span style={{
            ...badgeStyle,
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#34D399',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <Clock size={13} className="spin-animation" />
            Running
          </span>
        );
      case 'Completed':
        return (
          <span style={{
            ...badgeStyle,
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#34D399',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <CheckCircle2 size={13} />
            Completed
          </span>
        );
      case 'OnHold':
      case 'Hold':
        return (
          <span style={{
            ...badgeStyle,
            background: 'rgba(245, 165, 36, 0.15)',
            color: '#F5C060',
            border: '1px solid rgba(245, 165, 36, 0.3)'
          }}>
            <Pause size={13} />
            On Hold
          </span>
        );
      case 'Cancelled':
        return (
          <span style={{
            ...badgeStyle,
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'rgba(255, 255, 255, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            <XCircle size={13} />
            Cancelled
          </span>
        );
      case 'Assigned':
      case 'NotStarted':
      default:
        return (
          <span style={{
            ...badgeStyle,
            background: 'rgba(60, 130, 246, 0.15)',
            color: '#60A5FA',
            border: '1px solid rgba(60, 130, 246, 0.3)'
          }}>
            <UserCheck size={13} />
            Assigned
          </span>
        );
    }
  };

  return (
    <div className="page-container">
      {/* Featured Active Running Task Compact Status Strip */}
      {activeRunningTask && (
        <div
          className="ui-card"
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1.25rem',
            borderLeft: '4px solid #34D399',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
          }}
        >
          {/* Row 1: Badges & Product/Client Info Left, Right-aligned Pause & Complete Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: 'rgba(34,197,94,0.15)',
                color: '#34D399',
                border: '1px solid rgba(34,197,94,0.3)',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <Clock size={12} className="spin-animation" />
                Running
              </span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                Product: <strong style={{ color: '#F5F5F5' }}>{activeRunningTask.productName}</strong> • Client: <strong style={{ color: '#F5F5F5' }}>{activeRunningTask.clientCompanyName}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  borderColor: 'rgba(245,165,36,0.4)',
                  color: '#F5C060',
                  backgroundColor: 'rgba(245,165,36,0.12)',
                  fontSize: '0.785rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                onClick={() => handleHoldTask(activeRunningTask.id)}
              >
                <Pause size={13} />
                <span>Pause / Hold</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  background: 'var(--accent-gradient)',
                  borderColor: 'rgba(232,135,60,0.4)',
                  color: '#FFFFFF',
                  fontSize: '0.785rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                onClick={() => handleCompleteTask(activeRunningTask.id)}
              >
                <CheckCircle2 size={13} />
                <span>Complete</span>
              </button>
            </div>
          </div>

          {/* Row 2: Task Title + Description on single line */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#F5F5F5', flexShrink: 0 }}>
              {activeRunningTask.moduleName}
            </h4>
            {activeRunningTask.description && (
              <span style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                — {activeRunningTask.description}
              </span>
            )}
          </div>

          {/* Row 3: Compact Inline Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#34D399', letterSpacing: '0.5px' }}>
              {formatSecondsToHHMMSS(timerSeconds)}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
              Running Duration
            </span>
          </div>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div className="icon-badge icon-badge-primary" style={{ backgroundColor: 'rgba(232,135,60,0.15)', color: '#E8873C', padding: '0.65rem', borderRadius: '10px' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Work Time</span>
            <h4 style={{ margin: '0.1rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>
              {formatDurationToHoursMinutes(metrics?.todayProductiveHours || 0)}
            </h4>
          </div>
        </div>

        <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div className="icon-badge icon-badge-warning" style={{ backgroundColor: 'rgba(245,165,36,0.15)', color: '#F5C060', padding: '0.65rem', borderRadius: '10px' }}>
            <Coffee size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Break Time</span>
            <h4 style={{ margin: '0.1rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>
              {formatDurationToHoursMinutes(metrics?.todayBreakHours || 0)}
            </h4>
          </div>
        </div>

        <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div className="icon-badge icon-badge-success" style={{ backgroundColor: 'rgba(61,214,140,0.15)', color: '#5EE0A0', padding: '0.65rem', borderRadius: '10px' }}>
            <Activity size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Activities</span>
            <h4 style={{ margin: '0.1rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>
              {metrics?.todayActivitiesCount || myTasks.length}
            </h4>
          </div>
        </div>
      </div>

      {/* Tabs — Amber Tinted Glass Active Pill */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        paddingBottom: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('my-tasks')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'my-tasks' ? '1px solid rgba(232, 135, 60, 0.4)' : '1px solid rgba(255, 255, 255, 0.10)',
            background: activeTab === 'my-tasks' ? 'rgba(232, 135, 60, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            color: activeTab === 'my-tasks' ? '#E8873C' : 'rgba(255, 255, 255, 0.6)',
            boxShadow: activeTab === 'my-tasks' ? '0 0 12px rgba(232, 135, 60, 0.2)' : 'none'
          }}
        >
          <Briefcase size={16} />
          <span>My Self-Tasks ({myRecentTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assigned-tasks')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'assigned-tasks' ? '1px solid rgba(232, 135, 60, 0.4)' : '1px solid rgba(255, 255, 255, 0.10)',
            background: activeTab === 'assigned-tasks' ? 'rgba(232, 135, 60, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            color: activeTab === 'assigned-tasks' ? '#E8873C' : 'rgba(255, 255, 255, 0.6)',
            boxShadow: activeTab === 'assigned-tasks' ? '0 0 12px rgba(232, 135, 60, 0.2)' : 'none'
          }}
        >
          <UserCheck size={16} />
          <span>Assigned Tasks ({assignedTasks.length})</span>
        </button>

        {/* My Team Tasks Tab Button (Visible only to Reporting Persons & Admins) */}
        {(teamEmployees.length > 0 || user?.role === 'Admin') && (
          <button
            onClick={() => setActiveTab('team-tasks')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: activeTab === 'team-tasks' ? '1px solid rgba(232, 135, 60, 0.4)' : '1px solid rgba(255, 255, 255, 0.10)',
              background: activeTab === 'team-tasks' ? 'rgba(232, 135, 60, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              color: activeTab === 'team-tasks' ? '#E8873C' : 'rgba(255, 255, 255, 0.6)',
              boxShadow: activeTab === 'team-tasks' ? '0 0 12px rgba(232, 135, 60, 0.2)' : 'none'
            }}
          >
            <Users size={16} />
            <span>My Team Tasks ({teamTasks.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1: My Self-Tasks — Single-Column Full-Width Stacked Layout */}
      {activeTab === 'my-tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Full-Width "Start New Work Task" Form Card */}
          <div className="ui-card" style={{ padding: '1.5rem', width: '100%' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>
              Start New Work Task
            </h3>

            <form onSubmit={handleStartSelfTask}>
              {/* Product & Client Side-by-Side in 2 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
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
                        setProductId(newMode ? 'CUSTOM' : '');
                        setCustomProductName('');
                        setClientId('');
                        setCustomClientName('');
                        setIsCustomClient(false);
                      }}
                    >
                      {isCustomProduct ? '← Select Existing Product' : '+ Add Other Product'}
                    </button>
                  </div>

                  {isCustomProduct ? (
                    <div>
                      <input
                        type="text"
                        className="form-input"
                        value={customProductName}
                        onChange={(e) => setCustomProductName(e.target.value)}
                        placeholder="Enter custom product name..."
                        required
                      />
                      <span style={{ fontSize: '0.725rem', color: '#E8873C', marginTop: '0.25rem', display: 'inline-block', fontWeight: 500 }}>
                        ✨ Custom Product Name (Stored on this task)
                      </span>
                    </div>
                  ) : (
                    <GlassSelect
                      placeholder="Select Product"
                      value={productId}
                      onChange={(val) => {
                        if (val === 'CUSTOM') {
                          setIsCustomProduct(true);
                          setProductId('CUSTOM');
                          setCustomProductName('');
                        } else {
                          setIsCustomProduct(false);
                          setProductId(val ? Number(val) : '');
                        }
                        setClientId('');
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
                        setClientId(newMode ? 'CUSTOM' : '');
                        setCustomClientName('');
                      }}
                      disabled={!isCustomProduct && !productId}
                    >
                      {isCustomClient ? '← Select Existing Client' : '+ Add Other Client'}
                    </button>
                  </div>

                  {isCustomClient ? (
                    <div>
                      <input
                        type="text"
                        className="form-input"
                        value={customClientName}
                        onChange={(e) => setCustomClientName(e.target.value)}
                        placeholder="Enter custom client company name..."
                        required
                      />
                      <span style={{ fontSize: '0.725rem', color: '#E8873C', marginTop: '0.25rem', display: 'inline-block', fontWeight: 500 }}>
                        ✨ Custom Client Name (Stored on this task)
                      </span>
                    </div>
                  ) : (
                    <GlassSelect
                      disabled={!isCustomProduct && !productId}
                      placeholder={
                        !isCustomProduct && !productId
                          ? 'Select Product First'
                          : availableClients.length === 0 && !isCustomProduct
                            ? 'No Mapped Clients'
                            : 'Select Client'
                      }
                      value={clientId}
                      onChange={(val) => {
                        if (val === 'CUSTOM') {
                          setIsCustomClient(true);
                          setClientId('CUSTOM');
                          setCustomClientName('');
                        } else {
                          setIsCustomClient(false);
                          setClientId(val ? Number(val) : '');
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

              {/* Module / Feature Name (Full Width) */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Module / Feature Name *</label>
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
                  placeholder="e.g. Employee Payslip Generation"
                  maxLength={100}
                  required
                />
              </div>

              {/* Task Description (Full Width) */}
              <div className="form-group">
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
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of task objectives..."
                  maxLength={500}
                  required
                />
              </div>

              {/* Start Button Right-Aligned */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.75rem',
                    height: '42px',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  <Play size={18} />
                  <span>Start Task Engine</span>
                </button>
              </div>
            </form>
          </div>

          {/* Full-Width "Recent Work Tasks" Section Stacked Directly Below */}
          <div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>
              Recent Work Tasks
            </h3>

            {loading ? (
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading task history...</p>
            ) : myRecentTasks.length === 0 ? (
              <div className="ui-card" style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                No active or today's tasks found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myRecentTasks.map((t) => (
                  <div key={t.id} className="ui-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#F5F5F5' }}>{t.moduleName}</h4>
                      {getStatusBadge(t.status, t.isOverdue)}
                    </div>

                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                      {t.description}
                    </p>

                    {/* Fixed 3-Column Metadata Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '0.85rem 1.25rem'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 500 }}>Product</span>
                        <span style={{ fontSize: '0.875rem', color: '#F5F5F5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.productName || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 500 }}>Client</span>
                        <span style={{ fontSize: '0.875rem', color: '#F5F5F5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.clientCompanyName || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 500 }}>Worked</span>
                        <span style={{ fontSize: '0.875rem', color: '#5EE0A0', fontWeight: 700, display: 'block' }}>{formatDurationToHoursMinutes(t.totalProductiveSeconds / 3600)}</span>
                      </div>
                    </div>

                    {/* Footer & Standardized Action Buttons Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                        Created {formatDateIST(t.createdAt)} at {formatTimeIST(t.createdAt)}
                      </span>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {t.status === 'OnHold' && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.785rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => handleResumeTask(t.id)}
                          >
                            <Play size={14} />
                            <span>Resume</span>
                          </button>
                        )}

                        {(t.status === 'Running' || t.status === 'InProgress') && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              padding: '0.4rem 0.85rem',
                              fontSize: '0.785rem',
                              borderRadius: '8px',
                              background: 'rgba(245, 165, 36, 0.12)',
                              border: '1px solid rgba(245, 165, 36, 0.3)',
                              color: '#F5C060',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                            onClick={() => handleHoldTask(t.id)}
                          >
                            <Pause size={14} />
                            <span>Hold</span>
                          </button>
                        )}

                        {t.status !== 'Completed' && t.status !== 'Cancelled' && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.785rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => handleCompleteTask(t.id)}
                          >
                            <CheckCircle2 size={14} />
                            <span>Complete</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.785rem', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.6)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => setSelectedTaskForTimeline(t)}
                          title="View Audit Timeline"
                        >
                          <Clock size={14} />
                          <span>Timeline</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Assigned Tasks */}
      {activeTab === 'assigned-tasks' && (
        <div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>
            Tasks Assigned To Me
          </h3>

          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading assigned tasks...</p>
          ) : assignedTasks.length === 0 ? (
            <div className="ui-card" style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
              No tasks currently assigned to you by Admin or Management.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {assignedTasks.map((t) => (
                <div key={t.id} className="ui-card" style={{ padding: '1.5rem', borderLeft: '4px solid #E8873C', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#F5F5F5' }}>{t.moduleName}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>
                        Assigned By: <strong style={{ color: '#F5F5F5' }}>{t.assignedByName || (t.assignerType === 2 ? 'System Admin' : 'Manager')}</strong> ({t.assignerTypeName})
                      </div>
                    </div>
                    {getPriorityBadge(t.priority)}
                  </div>

                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {t.description}
                  </p>

                  {/* Fixed 3-Column Metadata Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 500 }}>Product</span>
                      <span style={{ fontSize: '0.85rem', color: '#F5F5F5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.productName || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 500 }}>Client</span>
                      <span style={{ fontSize: '0.85rem', color: '#F5F5F5', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.clientCompanyName || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 500 }}>Due Date</span>
                      <span style={{ fontSize: '0.85rem', color: t.isOverdue ? '#FF7B7B' : '#F5F5F5', fontWeight: 600, display: 'block' }}>
                        {t.dueDate ? formatDateIST(t.dueDate) : 'No due date'}
                      </span>
                    </div>
                  </div>

                  {/* Footer & Action Buttons Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      {getStatusBadge(t.status, t.isOverdue)}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {(t.status === 'Assigned' || t.status === 'NotStarted') && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.785rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleStartAssignedTask(t.id)}
                        >
                          <Play size={14} />
                          <span>Start Task</span>
                        </button>
                      )}
                      {(t.status === 'Running' || t.status === 'InProgress') && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.785rem',
                            borderRadius: '8px',
                            background: 'rgba(245, 165, 36, 0.12)',
                            border: '1px solid rgba(245, 165, 36, 0.3)',
                            color: '#F5C060',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          onClick={() => handleHoldTask(t.id)}
                        >
                          <Pause size={14} />
                          <span>Hold</span>
                        </button>
                      )}
                      {t.status === 'OnHold' && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.785rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleResumeTask(t.id)}
                        >
                          <Play size={14} />
                          <span>Resume</span>
                        </button>
                      )}
                      {t.status !== 'Completed' && t.status !== 'Cancelled' && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.785rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleCompleteTask(t.id)}
                        >
                          <CheckCircle2 size={14} />
                          <span>Complete</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.785rem', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.6)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => setSelectedTaskForTimeline(t)}
                        title="View Audit Timeline"
                      >
                        <Clock size={14} />
                        <span>Timeline</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: My Team Tasks (Reporting Person & Admin) */}
      {activeTab === 'team-tasks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5' }}>
                My Direct Team Tasks
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'rgba(255,255,255,0.6)' }}>
                Assign and monitor tasks for employees reporting to you ({teamEmployees.length} team members).
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}
              onClick={() => {
                setTeamTargetEmployeeId('');
                setTeamProductId('');
                setIsTeamCustomProduct(false);
                setTeamCustomProductName('');
                setTeamClientId('');
                setIsTeamCustomClient(false);
                setTeamCustomClientName('');
                setTeamModuleName('');
                setTeamDescription('');
                setTeamPriority(1);
                setTeamPlannedStart('');
                setTeamDueDate('');
                setTeamPlannedHours('8');
                setTeamPlannedMinutes('00');
                setTeamInstructions('');
                setTeamAssignError('');
                setShowTeamAssignModal(true);
              }}
            >
              <Plus size={16} />
              <span>Assign Task to Direct Reportee</span>
            </button>
          </div>

          {teamEmployees.length === 0 ? (
            <div className="ui-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'rgba(255,255,255,0.6)' }}>
              <Users size={36} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#F5F5F5' }}>No Direct Reportees Linked</h4>
              <p style={{ fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto' }}>
                You currently do not have any active employees assigned to report directly to you in the system. Contact your System Administrator to link employees to your profile in Employee Management.
              </p>
            </div>
          ) : (
            <div>
              {/* Filter Bar for Team Tasks */}
              <div className="ui-card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  {/* Search */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Search Task / Module</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search team tasks..."
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2.2rem' }}
                      />
                      <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    </div>
                  </div>

                  {/* Employee Filter */}
                  <div>
                    <GlassSelect
                      label="Filter by Team Member"
                      value={teamFilterEmployeeId}
                      onChange={(val) => setTeamFilterEmployeeId(String(val))}
                      placeholder="All Team Members"
                      options={[
                        { value: '', label: 'All Team Members' },
                        ...teamEmployees.map((e) => ({
                          value: e.id,
                          label: `${e.employeeCode} - ${e.name}`,
                        })),
                      ]}
                    />
                  </div>

                  {/* Date Filter */}
                  <div>
                    <GlassSelect
                      label="Filter by Date"
                      value={teamFilterDatePreset}
                      onChange={(val) => setTeamFilterDatePreset(String(val))}
                      options={[
                        { value: 'DEFAULT', label: 'Default (Smart View)' },
                        { value: 'TODAY', label: 'Today' },
                        { value: 'YESTERDAY', label: 'Yesterday' },
                        { value: 'THIS_WEEK', label: 'This Week' },
                        { value: 'THIS_MONTH', label: 'This Month' },
                        { value: 'CUSTOM', label: 'Custom Range...' },
                      ]}
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <GlassSelect
                      label="Filter Status"
                      value={teamFilterStatus}
                      onChange={(val) => setTeamFilterStatus(String(val))}
                      placeholder="All Statuses"
                      options={[
                        { value: '', label: 'All Statuses' },
                        { value: 'Assigned', label: 'Assigned' },
                        { value: 'Running', label: 'In Progress' },
                        { value: 'OnHold', label: 'On Hold' },
                        { value: 'Completed', label: 'Completed' },
                        { value: 'Cancelled', label: 'Cancelled' },
                      ]}
                    />
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <GlassSelect
                      label="Filter Priority"
                      value={teamFilterPriority}
                      onChange={(val) => setTeamFilterPriority(String(val))}
                      placeholder="All Priorities"
                      options={[
                        { value: '', label: 'All Priorities' },
                        { value: '0', label: 'Low' },
                        { value: '1', label: 'Medium' },
                        { value: '2', label: 'High' },
                        { value: '3', label: 'Urgent' },
                      ]}
                    />
                  </div>
                </div>

                {/* Custom Date Range Pickers */}
                {teamFilterDatePreset === 'CUSTOM' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <GlassDatePicker
                        label="From Date"
                        value={teamCustomStartDate}
                        onChange={(val) => setTeamCustomStartDate(val)}
                        placeholder="Select start date..."
                      />
                    </div>
                    <div>
                      <GlassDatePicker
                        label="To Date"
                        value={teamCustomEndDate}
                        onChange={(val) => setTeamCustomEndDate(val)}
                        minDate={teamCustomStartDate}
                        placeholder="Select end date..."
                      />
                    </div>
                  </div>
                )}

                {/* Bottom Bar: Show All Button & Overdue Checkbox */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setTeamShowAllTasks(!teamShowAllTasks)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: teamShowAllTasks ? 'rgba(232, 135, 60, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        color: teamShowAllTasks ? '#E8873C' : 'rgba(255, 255, 255, 0.6)',
                        border: teamShowAllTasks ? '1px solid rgba(232, 135, 60, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Eye size={14} />
                      <span>{teamShowAllTasks ? `Show All Tasks (${safeTeamTasks.length})` : `Show All Tasks (${safeTeamTasks.length})`}</span>
                    </button>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={teamFilterOverdue}
                        onChange={(e) => setTeamFilterOverdue(e.target.checked)}
                      />
                      <span style={{ color: teamFilterOverdue ? '#FF7B7B' : '#F5F5F5' }}>⚠️ Overdue Only</span>
                    </label>
                  </div>

                  {isAnyTeamFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetTeamFilters}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#E8873C',
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

              {/* View Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
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
                      color: '#E8873C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {teamFilterEmployeeId && selectedTeamMemberObj ? (
                      <Search size={18} />
                    ) : teamFilterDatePreset !== 'DEFAULT' ? (
                      <Calendar size={18} />
                    ) : teamShowAllTasks ? (
                      <Eye size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F5F5F5' }}>
                      {teamFilterEmployeeId && selectedTeamMemberObj
                        ? `Showing full task history for ${selectedTeamMemberObj.employeeCode} - ${selectedTeamMemberObj.name}`
                        : teamFilterDatePreset !== 'DEFAULT'
                        ? `Showing team tasks for date filter (${teamFilterDatePreset === 'CUSTOM' ? `${teamCustomStartDate || 'Start'} to ${teamCustomEndDate || 'End'}` : teamFilterDatePreset})`
                        : teamShowAllTasks
                        ? `Showing all team tasks (Complete Unfiltered View)`
                        : `Showing today's activity + all pending items for your team`}
                      <span
                        style={{
                          marginLeft: '0.75rem',
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontWeight: 600
                        }}
                      >
                        {displayTeamTasks.length} tasks
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.1rem' }}>
                      {teamFilterEmployeeId && selectedTeamMemberObj
                        ? `Full historical record across all dates and statuses for this team member.`
                        : teamFilterDatePreset !== 'DEFAULT'
                        ? `Showing team tasks across all statuses within the selected date window.`
                        : teamShowAllTasks
                        ? `Showing all historical completed, cancelled, and active team tasks.`
                        : `Excluding older completed & cancelled tasks from earlier dates for daily focus.`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Tasks Table */}
              <div className="table-container" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Task / Module</th>
                      <th>Assigned To</th>
                      <th>Product & Client</th>
                      <th>Priority</th>
                      <th>Planned Start & Due Date</th>
                      <th>Status</th>
                      <th>Actual Productive Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTeamTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                          No team tasks found matching selected criteria.
                        </td>
                      </tr>
                    ) : (
                      displayTeamTasks.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#F5F5F5' }}>{t.moduleName}</div>
                            <div style={{ fontSize: '0.785rem', color: 'rgba(255,255,255,0.6)' }}>{t.description}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#F5F5F5' }}>{t.employeeName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{t.employeeCode}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F5F5F5' }}>{t.productName}</div>
                            <div style={{ fontSize: '0.785rem', color: 'rgba(255,255,255,0.6)' }}>{t.clientCompanyName}</div>
                          </td>
                          <td>{getPriorityBadge(t.priority)}</td>
                          <td>
                            <div style={{ fontSize: '0.785rem', color: 'rgba(255,255,255,0.6)' }}>
                              Due: {t.dueDate ? formatDateIST(t.dueDate) : 'N/A'}
                            </div>
                          </td>
                          <td>{getStatusBadge(t.status, t.isOverdue)}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#5EE0A0' }}>
                              {formatDurationToHoursMinutes(t.totalProductiveSeconds / 3600)}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Audit Timeline"
                                onClick={() => setSelectedTaskForTimeline(t)}
                              >
                                <Clock size={14} />
                              </button>
                              {t.status !== 'Completed' && t.status !== 'Cancelled' && (
                                <>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    title="Reassign Task"
                                    onClick={() => {
                                      setReassignTask(t);
                                      setReassignNewEmployeeId('');
                                      setReassignRemarks('');
                                    }}
                                  >
                                    <ArrowRightLeft size={14} />
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    title="Cancel Task"
                                    onClick={() => {
                                      setCancelTask(t);
                                      setCancelRemarks('');
                                    }}
                                  >
                                    <XCircle size={14} />
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
            </div>
          )}
        </div>
      )}

      {/* TEAM TASK MODAL */}
      {showTeamAssignModal && (
        <div className="modal-overlay">
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
                  Assign Task to Direct Team Member
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Create and schedule a new work task for your direct reportees.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeamAssignModal(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            {teamAssignError && (
              <div style={{ background: 'rgba(240,96,96,0.12)', color: '#FF7B7B', border: '1px solid rgba(240,96,96,0.25)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.825rem', fontWeight: 500 }}>
                ⚠️ {teamAssignError}
              </div>
            )}

            <form onSubmit={handleCreateTeamTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

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
                    placeholder="Search and select team member..."
                    value={teamTargetEmployeeId}
                    onChange={(val) => setTeamTargetEmployeeId(String(val))}
                    options={teamEmployees.map((emp) => ({
                      value: emp.id,
                      label: `${emp.name} (${emp.employeeCode}) - ${emp.designationName || emp.departmentName}`,
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
                          const newMode = !isTeamCustomProduct;
                          setIsTeamCustomProduct(newMode);
                          setTeamProductId(newMode ? 'CUSTOM' : '');
                          setTeamCustomProductName('');
                          setTeamClientId('');
                          setTeamCustomClientName('');
                          setIsTeamCustomClient(false);
                        }}
                      >
                        {isTeamCustomProduct ? '← Select Existing Product' : '+ Add Other Product'}
                      </button>
                    </div>

                    {isTeamCustomProduct ? (
                      <input
                        type="text"
                        className="form-input"
                        value={teamCustomProductName}
                        onChange={(e) => setTeamCustomProductName(e.target.value)}
                        placeholder="Enter custom product name..."
                        required
                      />
                    ) : (
                      <GlassSelect
                        placeholder="Select Product"
                        value={teamProductId}
                        onChange={(val) => {
                          if (val === 'CUSTOM') {
                            setIsTeamCustomProduct(true);
                            setTeamProductId('CUSTOM');
                            setTeamCustomProductName('');
                          } else {
                            setIsTeamCustomProduct(false);
                            setTeamProductId(val ? Number(val) : '');
                          }
                          setTeamClientId('');
                          setTeamCustomClientName('');
                          setIsTeamCustomClient(false);
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
                          const newMode = !isTeamCustomClient;
                          setIsTeamCustomClient(newMode);
                          setTeamClientId(newMode ? 'CUSTOM' : '');
                          setTeamCustomClientName('');
                        }}
                        disabled={!isTeamCustomProduct && !teamProductId}
                      >
                        {isTeamCustomClient ? '← Select Existing Client' : '+ Add Other Client'}
                      </button>
                    </div>

                    {isTeamCustomClient ? (
                      <input
                        type="text"
                        className="form-input"
                        value={teamCustomClientName}
                        onChange={(e) => setTeamCustomClientName(e.target.value)}
                        placeholder="Enter custom client company name..."
                        required
                      />
                    ) : (
                      <GlassSelect
                        disabled={!isTeamCustomProduct && !teamProductId}
                        placeholder={
                          !isTeamCustomProduct && !teamProductId
                            ? 'Select Product First'
                            : availableTeamClients.length === 0 && !isTeamCustomProduct
                            ? 'No Mapped Clients'
                            : 'Select Client'
                        }
                        value={teamClientId}
                        onChange={(val) => {
                          if (val === 'CUSTOM') {
                            setIsTeamCustomClient(true);
                            setTeamClientId('CUSTOM');
                            setTeamCustomClientName('');
                          } else {
                            setIsTeamCustomClient(false);
                            setTeamClientId(val ? Number(val) : '');
                          }
                        }}
                        options={[
                          ...availableTeamClients.map((c) => ({ value: c.id, label: c.companyName })),
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
                    <label className="form-label" style={{ margin: 0 }}>Module / Feature Name *</label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: teamModuleName.length >= 100 ? '#EF4444' : teamModuleName.length >= 90 ? '#E8873C' : 'rgba(255, 255, 255, 0.5)',
                        fontWeight: teamModuleName.length >= 90 ? 600 : 400,
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {teamModuleName.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    value={teamModuleName}
                    onChange={(e) => setTeamModuleName(e.target.value)}
                    placeholder="e.g. Payroll Calculation Module"
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
                        color: teamDescription.length >= 500 ? '#EF4444' : teamDescription.length >= 450 ? '#E8873C' : 'rgba(255, 255, 255, 0.5)',
                        fontWeight: teamDescription.length >= 450 ? 600 : 400,
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {teamDescription.length}/500
                    </span>
                  </div>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Task detailed requirements and acceptance criteria..."
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
                      value={teamPriority}
                      onChange={(val) => setTeamPriority(Number(val))}
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
                      value={teamPlannedStart}
                      onChange={(val) => setTeamPlannedStart(val)}
                      minDate={new Date().toISOString().split('T')[0]}
                      placeholder="Select start date..."
                    />
                  </div>

                  {/* Due Date */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <GlassDatePicker
                      label="Due Date"
                      value={teamDueDate}
                      onChange={(val) => setTeamDueDate(val)}
                      minDate={teamPlannedStart || new Date().toISOString().split('T')[0]}
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
                        value={teamPlannedHours}
                        onChange={(e) => setTeamPlannedHours(e.target.value)}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                        Minutes:
                      </span>
                      <GlassSelect
                        value={teamPlannedMinutes}
                        onChange={(val) => setTeamPlannedMinutes(String(val))}
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
                        color: teamInstructions.length >= 300 ? '#EF4444' : teamInstructions.length >= 270 ? '#E8873C' : 'rgba(255, 255, 255, 0.5)',
                        fontWeight: teamInstructions.length >= 270 ? 600 : 400,
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {teamInstructions.length}/300
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Special instructions for employee..."
                    value={teamInstructions}
                    onChange={(e) => setTeamInstructions(e.target.value)}
                    maxLength={300}
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTeamAssignModal(false)}
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
                  disabled={submittingTeamAssign}
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
                    cursor: submittingTeamAssign ? 'not-allowed' : 'pointer',
                    opacity: submittingTeamAssign ? 0.65 : 1,
                    boxShadow: '0 4px 16px rgba(232, 135, 60, 0.4)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <span>{submittingTeamAssign ? 'Assigning Work Task...' : 'Assign Work Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN TASK MODAL */}
      {reassignTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#F5F5F5' }}>
              Reassign Task: {reassignTask.moduleName}
            </h3>

            <form onSubmit={handleReassignTaskSubmit}>
              <div className="form-group">
                <label className="form-label">New Assignee *</label>
                <select
                  className="form-select"
                  value={reassignNewEmployeeId}
                  onChange={(e) => setReassignNewEmployeeId(e.target.value)}
                  required
                >
                  <option value="">Select Team Member</option>
                  {teamEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reassignment Reason / Remarks</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={reassignRemarks}
                  onChange={(e) => setReassignRemarks(e.target.value)}
                  placeholder="Reason for reassigning this task..."
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

      {/* CANCEL TASK MODAL */}
      {cancelTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#F5F5F5' }}>
              Cancel Task: {cancelTask.moduleName}
            </h3>

            <form onSubmit={handleCancelTaskSubmit}>
              <div className="form-group">
                <label className="form-label">Cancellation Reason</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  placeholder="Reason for cancelling this task..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCancelTask(null)}>
                  Keep Task
                </button>
                <button type="submit" className="btn btn-danger" disabled={submittingCancel}>
                  {submittingCancel ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK TIMELINE DRAWER */}
      {selectedTaskForTimeline && (
        <TaskTimelineDrawer
          isOpen={!!selectedTaskForTimeline}
          onClose={() => setSelectedTaskForTimeline(null)}
          taskTitle={`${selectedTaskForTimeline.moduleName} (${selectedTaskForTimeline.productName || ''} - ${selectedTaskForTimeline.clientCompanyName || ''})`}
          employeeName={selectedTaskForTimeline.employeeName || user?.employeeName || ''}
          events={selectedTaskForTimeline.timelineEvents || []}
        />
      )}
    </div>
  );
};