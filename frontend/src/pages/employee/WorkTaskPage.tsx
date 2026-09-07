import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { formatDurationToHoursMinutes, formatDateIST, formatTimeIST } from '../../utils/dateUtils';
import { TaskTimelineDrawer } from '../../components/tasks/TaskTimelineDrawer';
import type { TaskTimelineEventDto } from '../../components/tasks/TaskTimelineDrawer';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassDatePicker } from '../../components/ui/GlassDatePicker';
import { useDebounce } from '../../hooks/useDebounce';
import { Pagination } from '../../components/ui/Pagination';
import { requestNotificationPermission } from '../../utils/notificationUtils';
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
  Eye,
  Flag,
  ChevronDown,
  ChevronUp,
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
  isExceededDuration?: boolean;
  timelineEvents: TaskTimelineEventDto[];
}

interface TeamEmployee {
  id: number;
  employeeCode: string;
  name: string;
  departmentName: string;
  designationName: string;
}

interface TaskActionModalState {
  isOpen: boolean;
  type: 'complete' | 'resume' | 'resume-switch' | 'start-self' | 'start-self-switch' | 'start-assigned' | 'start-assigned-switch' | 'hold';
  taskId?: number;
  taskTitle?: string;
  activeTaskId?: number;
  activeTaskTitle?: string;
  pendingSelfTaskPayload?: any;
  remarks: string;
  holdRemarks: string;
  submitting: boolean;
  error?: string;
}

const getTodayLocalDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const WorkTaskPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'assigned-tasks' | 'team-tasks'>('my-tasks');

  const [actionModal, setActionModal] = useState<TaskActionModalState>({
    isOpen: false,
    type: 'complete',
    remarks: '',
    holdRemarks: '',
    submitting: false,
  });

  // Master Data
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [mappings, setMappings] = useState<ProductClientMapping[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: number; name: string; employeeCode: string } | null>(null);

  // Self Task Form State
  const [productId, setProductId] = useState<number | 'CUSTOM' | ''>('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');

  const [clientId, setClientId] = useState<number | 'CUSTOM' | ''>('');
  const [isCustomClient, setIsCustomClient] = useState(false);
  const [customClientName, setCustomClientName] = useState('');

  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');

  const [selfPriority, setSelfPriority] = useState<number>(1);
  const [selfPlannedStart, setSelfPlannedStart] = useState<string>(getTodayLocalDateStr());
  const [selfDueDate, setSelfDueDate] = useState<string>('');
  const [selfPlannedHours, setSelfPlannedHours] = useState<string>('8');
  const [selfPlannedMinutes, setSelfPlannedMinutes] = useState<string>('00');
  const [selfInstructions, setSelfInstructions] = useState<string>('');

  // Description expansion state for long text toggle
  const [expandedDescIds, setExpandedDescIds] = useState<Record<number, boolean>>({});
  const toggleExpandDesc = (taskId: number) => {
    setExpandedDescIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const resetSelfTaskForm = () => {
    setModuleName('');
    setDescription('');
    setSelfPriority(1);
    setSelfPlannedStart(getTodayLocalDateStr());
    setSelfDueDate('');
    setSelfPlannedHours('8');
    setSelfPlannedMinutes('00');
    setSelfInstructions('');

    // Retain smart default product/client if available
    const lastProd = localStorage.getItem('riims_last_product_id');
    if (lastProd && products.some((p) => p.id === Number(lastProd))) {
      setProductId(Number(lastProd));
      setIsCustomProduct(false);
      setCustomProductName('');
      const lastClient = localStorage.getItem('riims_last_client_id');
      if (lastClient) {
        setClientId(Number(lastClient));
        setIsCustomClient(false);
        setCustomClientName('');
      }
    } else {
      setProductId('');
      setIsCustomProduct(false);
      setCustomProductName('');
      setClientId('');
      setIsCustomClient(false);
      setCustomClientName('');
    }
  };

  // Task Lists
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<TaskItem[]>([]);

  // Team Tasks State (Reporting Person Only)
  const [teamEmployees, setTeamEmployees] = useState<TeamEmployee[]>([]);
  const [teamTasks, setTeamTasks] = useState<TaskItem[]>([]);
  const [showTeamAssignModal, setShowTeamAssignModal] = useState(false);

  // Team Tasks Pagination & Loading State
  const [teamPage, setTeamPage] = useState<number>(1);
  const [teamPageSize, setTeamPageSize] = useState<number>(25);
  const [teamTotalCount, setTeamTotalCount] = useState<number>(0);
  const [teamTotalPages, setTeamTotalPages] = useState<number>(0);
  const [teamLoading, setTeamLoading] = useState<boolean>(false);

  // Team Tasks Filters & Smart View
  const [teamFilterEmployeeId, setTeamFilterEmployeeId] = useState<string>('');
  const [teamFilterStatus, setTeamFilterStatus] = useState<string>('');
  const [teamFilterPriority, setTeamFilterPriority] = useState<string>('');
  const [teamFilterOverdue, setTeamFilterOverdue] = useState<boolean>(false);
  const [teamFilterExceededDuration, setTeamFilterExceededDuration] = useState<boolean>(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');
  const debouncedTeamSearch = useDebounce(teamSearchQuery, 350);
  const [teamFilterDatePreset, setTeamFilterDatePreset] = useState<string>('DEFAULT');
  const [teamCustomStartDate, setTeamCustomStartDate] = useState<string>('');
  const [teamCustomEndDate, setTeamCustomEndDate] = useState<string>('');
  const [teamShowAllTasks, setTeamShowAllTasks] = useState<boolean>(false);

  // Reset teamPage to 1 whenever filters change
  useEffect(() => {
    setTeamPage(1);
  }, [debouncedTeamSearch, teamFilterEmployeeId, teamFilterStatus, teamFilterPriority, teamFilterOverdue, teamFilterExceededDuration, teamCustomStartDate, teamCustomEndDate]);

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

  // Auto-scroll highlight state
  const [highlightedTaskId, setHighlightedTaskId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);

  const fetchLookups = async () => {
    try {
      const [prodRes, clientRes, mapRes, profileRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/clients'),
        apiClient.get('/mappings'),
        apiClient.get('/employees/profile'),
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (clientRes.data.success) setClients(clientRes.data.data);
      if (mapRes.data.success) setMappings(mapRes.data.data);
      if (profileRes.data.success) setCurrentUserProfile(profileRes.data.data);
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

  const fetchTeamEmployees = async () => {
    try {
      const res = await apiClient.get('/tasks/team-employees');
      if (res.data.success) setTeamEmployees(res.data.data);
    } catch {
      // User may not be a reporting person
    }
  };

  const fetchTeamTasks = async () => {
    setTeamLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', teamPage.toString());
      params.append('pageSize', teamPageSize.toString());
      if (debouncedTeamSearch) params.append('search', debouncedTeamSearch);
      if (teamFilterEmployeeId) params.append('employeeId', teamFilterEmployeeId);
      if (teamFilterStatus) params.append('status', teamFilterStatus);
      if (teamFilterPriority) params.append('priority', teamFilterPriority);
      if (teamFilterOverdue) params.append('smartView', 'overdue');
      if (teamFilterExceededDuration) params.append('smartView', 'exceeded-duration');
      if (teamCustomStartDate) params.append('fromDate', teamCustomStartDate);
      if (teamCustomEndDate) params.append('toDate', teamCustomEndDate);

      const res = await apiClient.get(`/tasks/team-tasks?${params.toString()}`);
      if (res.data.success) {
        if (Array.isArray(res.data.data)) {
          setTeamTasks(res.data.data);
          setTeamTotalCount(res.data.data.length);
          setTeamTotalPages(1);
        } else {
          setTeamTasks(res.data.data.items || []);
          setTeamTotalCount(res.data.data.totalCount || 0);
          setTeamTotalPages(res.data.data.totalPages || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch team tasks', err);
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'team-tasks') {
      fetchTeamTasks();
    }
  }, [activeTab, teamPage, teamPageSize, debouncedTeamSearch, teamFilterEmployeeId, teamFilterStatus, teamFilterPriority, teamFilterOverdue, teamFilterExceededDuration, teamCustomStartDate, teamCustomEndDate]);

  useEffect(() => {
    fetchLookups();
    fetchMyTasksData();
    fetchTeamEmployees();
    fetchMetrics();
    fetchServerState();
  }, [user]);

  useEffect(() => {
    const handleActivityChanged = () => {
      fetchMyTasksData();
      fetchMetrics();
      fetchServerState();
    };
    window.addEventListener('activity-changed', handleActivityChanged);
    return () => window.removeEventListener('activity-changed', handleActivityChanged);
  }, [user]);





  // Server State & Metrics
  const [serverState, setServerState] = useState<{
    state: string;
    idleStartedAt?: string;
    todayWorkSeconds: number;
    todayBreakSeconds: number;
    todayIdleSeconds: number;
    todayActivitiesCount: number;
  } | null>(null);

  const fetchServerState = async () => {
    if (!user?.employeeId) return;
    try {
      const res = await apiClient.get('/idle/current-state');
      if (res.data.success) {
        setServerState(res.data.data);
      }
    } catch {
      // Ignore
    }
  };

  const [metrics, setMetrics] = useState<{
    todayProductiveHours: number;
    todayBreakHours: number;
    todayIdleHours: number;
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
          todayIdleHours: res.data.data.todayIdleHours || 0,
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

  // Auto-select last-used product & client from localStorage on initial load
  useEffect(() => {
    if (products.length > 0 && !productId && !isCustomProduct) {
      const lastProd = localStorage.getItem('riims_last_product_id');
      if (lastProd && products.some((p) => p.id === Number(lastProd))) {
        setProductId(Number(lastProd));
      }
    }
  }, [products]);

  useEffect(() => {
    if (productId && typeof productId === 'number' && availableClients.length > 0 && !clientId && !isCustomClient) {
      const lastClient = localStorage.getItem('riims_last_client_id');
      if (lastClient && availableClients.some((c) => c.id === Number(lastClient))) {
        setClientId(Number(lastClient));
      }
    }
  }, [productId, availableClients]);

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

    const hoursNum = parseInt(selfPlannedHours || '0', 10);
    const minsNum = parseInt(selfPlannedMinutes || '0', 10);
    const totalPlannedMins = (isNaN(hoursNum) ? 0 : hoursNum) * 60 + (isNaN(minsNum) ? 0 : minsNum);

    const payload: any = {
      moduleName: moduleName.trim(),
      description: description.trim(),
      priority: selfPriority,
      plannedStart: selfPlannedStart ? new Date(selfPlannedStart).toISOString() : null,
      dueDate: selfDueDate ? new Date(selfDueDate).toISOString() : null,
      plannedDurationMinutes: totalPlannedMins > 0 ? totalPlannedMins : null,
      instructions: selfInstructions.trim() || null,
    };

    if (isCustomProduct) {
      payload.customProductName = customProductName.trim();
    } else {
      payload.productId = Number(productId);
    }

    if (isCustomClient) {
      payload.customClientName = customClientName.trim();
    } else {
      payload.clientId = Number(clientId);
    }

    if (activeRunningTask) {
      // Confirmation switch popup
      setActionModal({
        isOpen: true,
        type: 'start-self-switch',
        pendingSelfTaskPayload: payload,
        taskTitle: payload.moduleName,
        activeTaskId: activeRunningTask.id,
        activeTaskTitle: activeRunningTask.moduleName,
        remarks: '',
        holdRemarks: '',
        submitting: false,
      });
    } else {
      try {
        const res = await apiClient.post('/tasks/start', payload);

        if (res.data.success) {
          const newTaskId = res.data.data?.id;
          if (!isCustomProduct && typeof productId === 'number') {
            localStorage.setItem('riims_last_product_id', String(productId));
          }
          if (!isCustomClient && typeof clientId === 'number') {
            localStorage.setItem('riims_last_client_id', String(clientId));
          }
          resetSelfTaskForm();

          window.dispatchEvent(new Event('activity-changed'));
          window.dispatchEvent(new Event('task-changed'));
          await fetchMyTasksData();
          fetchMetrics();
          scrollToTask(newTaskId);
          requestNotificationPermission(); // Request on first task start (user gesture)
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to start task.');
      }
    }
  };

  // Task Action Prompts
  const handleHoldTask = (taskId: number, taskTitle?: string) => {
    const target = myTasks.find((t) => t.id === taskId) || assignedTasks.find((t) => t.id === taskId);
    const title = taskTitle || target?.moduleName || 'Task';
    setActionModal({
      isOpen: true,
      type: 'hold',
      taskId,
      taskTitle: title,
      remarks: '',
      holdRemarks: '',
      submitting: false,
    });
  };

  const handleResumeTask = async (taskId: number, taskTitle?: string) => {
    const target = myTasks.find((t) => t.id === taskId) || assignedTasks.find((t) => t.id === taskId);
    const title = taskTitle || target?.moduleName || 'Task';

    if (activeRunningTask && activeRunningTask.id !== taskId) {
      // Switch Confirmation Popup
      setActionModal({
        isOpen: true,
        type: 'resume-switch',
        taskId,
        taskTitle: title,
        activeTaskId: activeRunningTask.id,
        activeTaskTitle: activeRunningTask.moduleName,
        remarks: '',
        holdRemarks: '',
        submitting: false,
      });
    } else {
      // Direct resume when no task is running
      try {
        const res = await apiClient.post(`/tasks/${taskId}/resume`);
        if (res.data.success) {
          window.dispatchEvent(new Event('activity-changed'));
          window.dispatchEvent(new Event('task-changed'));
          fetchMyTasksData();
          fetchMetrics();
          requestNotificationPermission(); // Request on resume (user gesture)
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to resume task.');
      }
    }
  };

  const handleCompleteTask = (taskId: number, taskTitle?: string) => {
    const target = myTasks.find((t) => t.id === taskId) || assignedTasks.find((t) => t.id === taskId);
    const title = taskTitle || target?.moduleName || 'Task';
    setActionModal({
      isOpen: true,
      type: 'complete',
      taskId,
      taskTitle: title,
      remarks: '',
      holdRemarks: '',
      submitting: false,
    });
  };

  const handleStartAssignedTask = (taskId: number, taskTitle?: string) => {
    const target = assignedTasks.find((t) => t.id === taskId) || myTasks.find((t) => t.id === taskId);
    const title = taskTitle || target?.moduleName || 'Task';

    if (activeRunningTask && activeRunningTask.id !== taskId) {
      // Switch Confirmation Popup
      setActionModal({
        isOpen: true,
        type: 'start-assigned-switch',
        taskId,
        taskTitle: title,
        activeTaskId: activeRunningTask.id,
        activeTaskTitle: activeRunningTask.moduleName,
        remarks: '',
        holdRemarks: '',
        submitting: false,
      });
    } else {
      directStartAssignedTask(taskId);
    }
  };

  const directStartAssignedTask = async (taskId: number) => {
    try {
      const res = await apiClient.post(`/tasks/${taskId}/start-assigned`);
      if (res.data.success) {
        window.dispatchEvent(new Event('activity-changed'));
        window.dispatchEvent(new Event('task-changed'));
        fetchMyTasksData();
        fetchMetrics();
        requestNotificationPermission(); // Request on start-assigned (user gesture)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start assigned task.');
    }
  };

  const submitTaskActionModal = async () => {
    setActionModal((prev) => ({ ...prev, submitting: true, error: undefined }));

    try {
      const { type, taskId, pendingSelfTaskPayload, remarks, holdRemarks } = actionModal;

      if (type === 'complete') {
        const res = await apiClient.post(`/tasks/${taskId}/complete`, { remarks: remarks.trim() });
        if (res.data.success) finishModalSuccess();
      } else if (type === 'hold') {
        const res = await apiClient.post(`/tasks/${taskId}/hold`, { remarks: remarks.trim() });
        if (res.data.success) finishModalSuccess();
      } else if (type === 'resume') {
        const res = await apiClient.post(`/tasks/${taskId}/resume`, { remarks: remarks.trim() });
        if (res.data.success) finishModalSuccess();
      } else if (type === 'resume-switch') {
        const res = await apiClient.post(`/tasks/${taskId}/resume`, {
          remarks: remarks.trim(),
          holdRemarks: holdRemarks.trim(),
        });
        if (res.data.success) finishModalSuccess();
      } else if (type === 'start-self') {
        const payload = {
          ...pendingSelfTaskPayload,
          remarks: remarks.trim(),
        };
        const res = await apiClient.post('/tasks/start', payload);
        if (res.data.success) {
          const newTaskId = res.data.data?.id;
          if (payload.productId && typeof payload.productId === 'number') {
            localStorage.setItem('riims_last_product_id', String(payload.productId));
          }
          if (payload.clientId && typeof payload.clientId === 'number') {
            localStorage.setItem('riims_last_client_id', String(payload.clientId));
          }
          resetSelfTaskForm();
          finishModalSuccess(newTaskId);
        }
      } else if (type === 'start-self-switch') {
        const payload = {
          ...pendingSelfTaskPayload,
          remarks: remarks.trim(),
          holdRemarks: holdRemarks.trim(),
        };
        const res = await apiClient.post('/tasks/start', payload);
        if (res.data.success) {
          const newTaskId = res.data.data?.id;
          if (payload.productId && typeof payload.productId === 'number') {
            localStorage.setItem('riims_last_product_id', String(payload.productId));
          }
          if (payload.clientId && typeof payload.clientId === 'number') {
            localStorage.setItem('riims_last_client_id', String(payload.clientId));
          }
          resetSelfTaskForm();
          finishModalSuccess(newTaskId);
        }
      } else if (type === 'start-assigned') {
        const res = await apiClient.post(`/tasks/${taskId}/start-assigned`, {
          remarks: remarks.trim(),
        });
        if (res.data.success) finishModalSuccess(taskId);
      } else if (type === 'start-assigned-switch') {
        const res = await apiClient.post(`/tasks/${taskId}/start-assigned`, {
          remarks: remarks.trim(),
          holdRemarks: holdRemarks.trim(),
        });
        if (res.data.success) finishModalSuccess(taskId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Action failed. Please try again.';
      setActionModal((prev) => ({ ...prev, submitting: false, error: msg }));
    }
  };

  const finishModalSuccess = (scrollToId?: number) => {
    setActionModal({ isOpen: false, type: 'complete', remarks: '', holdRemarks: '', submitting: false });
    window.dispatchEvent(new Event('activity-changed'));
    window.dispatchEvent(new Event('task-changed'));
    fetchMyTasksData().then(() => {
      if (scrollToId) {
        scrollToTask(scrollToId);
      }
    });
    fetchMetrics();
  };

  const scrollToTask = (taskId?: number) => {
    setActiveTab('my-tasks');
    if (taskId) {
      setHighlightedTaskId(taskId);
      setTimeout(() => {
        setHighlightedTaskId(null);
      }, 3500);
    }

    setTimeout(() => {
      if (taskId) {
        const cardEl = document.getElementById(`task-card-${taskId}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      const sectionEl = document.getElementById('recent-work-tasks-section');
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 180);
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
        payload.customClientName = teamCustomClientName.trim();
      } else {
        payload.clientId = Number(teamClientId);
      }

      const res = await apiClient.post('/tasks/assign', payload);

      if (res.data.success) {
        setShowTeamAssignModal(false);
        fetchTeamTasks();
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
        fetchTeamTasks();
        fetchMyTasksData();
        fetchMetrics();
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
        fetchTeamTasks();
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
    setTeamFilterExceededDuration(false);
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

    // Exceeded Duration Filter
    if (teamFilterExceededDuration) {
      const isExceeded = t.isExceededDuration || (t.plannedDurationMinutes != null && t.plannedDurationMinutes > 0 && t.totalProductiveSeconds > (t.plannedDurationMinutes * 60));
      if (!isExceeded) return false;
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
    teamFilterExceededDuration ||
    !!teamSearchQuery;

  const selectedTeamMemberObj = teamEmployees.find((e) => e.id.toString() === teamFilterEmployeeId);

  // Helper to get distinct accent colors for each status
  const getTaskStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'Completed' && status !== 'Cancelled') {
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        text: '#EF4444',
        border: 'rgba(239, 68, 68, 0.35)',
        accent: '#EF4444',
      };
    }
    switch (status) {
      case 'Running':
      case 'InProgress':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          text: '#10B981',
          border: 'rgba(16, 185, 129, 0.35)',
          accent: '#10B981',
        };
      case 'Completed':
        return {
          bg: 'rgba(99, 102, 241, 0.15)',
          text: '#818CF8',
          border: 'rgba(99, 102, 241, 0.35)',
          accent: '#818CF8',
        };
      case 'OnHold':
      case 'Hold':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          text: '#F59E0B',
          border: 'rgba(245, 158, 11, 0.35)',
          accent: '#F59E0B',
        };
      case 'Cancelled':
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          text: '#94A3B8',
          border: 'rgba(148, 163, 184, 0.3)',
          accent: '#94A3B8',
        };
      case 'Assigned':
      case 'NotStarted':
      default:
        return {
          bg: 'rgba(14, 165, 233, 0.15)',
          text: '#38BDF8',
          border: 'rgba(14, 165, 233, 0.35)',
          accent: '#38BDF8',
        };
    }
  };

  // Status and Priority Badges (Pill Shape, Glass Colors)
  const getPriorityBadge = (priority: number) => {
    const badgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.2rem 0.55rem',
      borderRadius: '6px',
      fontSize: '0.725rem',
      fontWeight: 600
    };

    switch (priority) {
      case 3:
        return (
          <span style={{ ...badgeStyle, background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <Flag size={11} /> Urgent
          </span>
        );
      case 2:
        return (
          <span style={{ ...badgeStyle, background: 'rgba(249, 115, 22, 0.12)', color: '#EA580C', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
            <Flag size={11} /> High
          </span>
        );
      case 1:
        return (
          <span style={{ ...badgeStyle, background: 'rgba(14, 165, 233, 0.12)', color: '#0284C7', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
            <Flag size={11} /> Medium
          </span>
        );
      default:
        return (
          <span style={{ ...badgeStyle, background: 'rgba(100, 116, 139, 0.12)', color: '#64748B', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
            <Flag size={11} /> Low
          </span>
        );
    }
  };

  const getExceededBadge = (isExceeded?: boolean) => {
    if (!isExceeded) return null;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.22rem 0.6rem',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: 600,
        background: 'rgba(217, 119, 6, 0.12)',
        color: '#D97706',
        border: '1px solid rgba(217, 119, 6, 0.35)',
        whiteSpace: 'nowrap'
      }}>
        ⏳ Exceeded Estimate
      </span>
    );
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
          background: 'rgba(225, 29, 72, 0.15)',
          color: '#E11D48',
          border: '1px solid rgba(225, 29, 72, 0.4)'
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
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.35)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 6px #10B981',
              display: 'inline-block'
            }} />
            Running
          </span>
        );
      case 'Completed':
        return (
          <span style={{
            ...badgeStyle,
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#818CF8',
            border: '1px solid rgba(99, 102, 241, 0.35)'
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
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#F59E0B',
            border: '1px solid rgba(245, 158, 11, 0.35)'
          }}>
            <Pause size={13} />
            On Hold
          </span>
        );
      case 'Cancelled':
        return (
          <span style={{
            ...badgeStyle,
            background: 'rgba(148, 163, 184, 0.15)',
            color: '#94A3B8',
            border: '1px solid rgba(148, 163, 184, 0.3)'
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
            background: 'rgba(14, 165, 233, 0.15)',
            color: '#38BDF8',
            border: '1px solid rgba(14, 165, 233, 0.35)'
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
      {activeRunningTask && (() => {
        const plannedSecs = (activeRunningTask.plannedDurationMinutes || 0) * 60;
        const hasPlanned = plannedSecs > 0;
        const progressRatio = hasPlanned ? (timerSeconds / plannedSecs) : 0;
        const progressPercent = hasPlanned ? Math.min(100, Math.round(progressRatio * 100)) : 0;
        const isExceeded = hasPlanned && timerSeconds > plannedSecs;
        const isNearEnd = hasPlanned && progressRatio >= 0.75 && !isExceeded;
        const barColor = isExceeded ? '#EF4444' : isNearEnd ? '#F59E0B' : '#10B981';
        const timerColor = isExceeded ? '#EF4444' : isNearEnd ? '#D97706' : '#059669';

        return (
          <div
            className="ui-card"
            style={{
              marginBottom: '1.25rem',
              padding: '1rem 1.25rem',
              borderLeft: `4px solid ${barColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            {/* Row 1: Badges & Product/Client Info Left, Right-aligned Pause & Complete Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
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
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Product: <strong style={{ color: 'var(--text-main)' }}>{activeRunningTask.productName}</strong> • Client: <strong style={{ color: 'var(--text-main)' }}>{activeRunningTask.clientCompanyName}</strong> • Due: <strong style={{ color: activeRunningTask.isOverdue ? 'var(--danger-text)' : (activeRunningTask.dueDate ? 'var(--text-main)' : 'var(--text-muted)') }}>{activeRunningTask.dueDate ? formatDateIST(activeRunningTask.dueDate) : 'No due date set'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    borderColor: '#fde68a',
                    color: '#d97706',
                    backgroundColor: '#fffbeb',
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
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', flexShrink: 0 }}>
                {activeRunningTask.moduleName}
              </h4>
              {activeRunningTask.description && (
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  — {activeRunningTask.description}
                </span>
              )}
            </div>

            {/* Row 3: Prominent Timer & Visual Progress Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'monospace', color: timerColor, letterSpacing: '0.5px' }}>
                    {formatSecondsToHHMMSS(timerSeconds)}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Running Duration
                  </span>
                </div>

                {hasPlanned && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      background: 'var(--panel-raised)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '0.2rem 0.55rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <Clock size={12} style={{ color: 'var(--primary)' }} />
                      Planned: {formatDurationToHoursMinutes(activeRunningTask.plannedDurationMinutes! / 60)}
                    </span>
                    {isExceeded ? (
                      <span style={{
                        fontSize: '0.725rem',
                        color: '#EF4444',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        padding: '0.2rem 0.55rem',
                        fontWeight: 700
                      }}>
                        ⚠️ +{formatDurationToHoursMinutes((timerSeconds - plannedSecs) / 3600)} over estimate
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.725rem',
                        color: isNearEnd ? '#D97706' : 'var(--text-muted)',
                        fontWeight: 600
                      }}>
                        {formatDurationToHoursMinutes(Math.max(0, plannedSecs - timerSeconds) / 3600)} remaining
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Visual Progress Bar */}
              {hasPlanned && (
                <div style={{ width: '100%', marginTop: '0.15rem' }}>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(100, Math.round(progressRatio * 100))}%`,
                      height: '100%',
                      backgroundColor: barColor,
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease, background-color 0.3s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>0%</span>
                    <span style={{ fontWeight: 600, color: barColor }}>
                      {isExceeded ? 'Exceeded 100%' : `${progressPercent}% completed`}
                    </span>
                    <span>100% ({formatDurationToHoursMinutes(activeRunningTask.plannedDurationMinutes! / 60)})</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Summary Metrics Cards (4 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div className="icon-badge icon-badge-primary" style={{ backgroundColor: '#fff4e6', color: '#E8873C', padding: '0.65rem', borderRadius: '10px' }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Work Time</span>
            <h4 style={{ margin: '0.1rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {formatDurationToHoursMinutes((serverState?.todayWorkSeconds || (metrics?.todayProductiveHours ? metrics.todayProductiveHours * 3600 : 0)) / 3600)}
            </h4>
          </div>
        </div>

        <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div className="icon-badge icon-badge-warning" style={{ backgroundColor: '#fffbeb', color: '#d97706', padding: '0.65rem', borderRadius: '10px' }}>
            <Coffee size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Break Time</span>
            <h4 style={{ margin: '0.1rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {formatDurationToHoursMinutes((serverState?.todayBreakSeconds || (metrics?.todayBreakHours ? metrics.todayBreakHours * 3600 : 0)) / 3600)}
            </h4>
          </div>
        </div>

        <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div className="icon-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.65rem', borderRadius: '10px' }}>
            <Clock size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Idle Time</span>
              <span
                title="Time with no detected activity while task was running"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--panel-raised)',
                  border: '1px solid var(--border)',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  cursor: 'help'
                }}
              >
                ⓘ
              </span>
            </div>
            <h4 style={{ margin: '0.1rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {formatDurationToHoursMinutes(
                serverState?.todayIdleSeconds != null
                  ? serverState.todayIdleSeconds / 3600
                  : (metrics?.todayIdleHours || 0)
              )}
            </h4>
          </div>
        </div>

        <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div className="icon-badge icon-badge-success" style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '0.65rem', borderRadius: '10px' }}>
            <Activity size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Activities</span>
            <h4 style={{ margin: '0.1rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {serverState?.todayActivitiesCount || metrics?.todayActivitiesCount || myTasks.length}
            </h4>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
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
            border: activeTab === 'my-tasks' ? '1px solid var(--primary)' : '1px solid #e5e7eb',
            background: activeTab === 'my-tasks' ? '#fff4e6' : '#ffffff',
            color: activeTab === 'my-tasks' ? 'var(--primary)' : 'var(--text-secondary)',
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
            border: activeTab === 'assigned-tasks' ? '1px solid var(--primary)' : '1px solid #e5e7eb',
            background: activeTab === 'assigned-tasks' ? '#fff4e6' : '#ffffff',
            color: activeTab === 'assigned-tasks' ? 'var(--primary)' : 'var(--text-secondary)',
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
              border: activeTab === 'team-tasks' ? '1px solid var(--primary)' : '1px solid #e5e7eb',
              background: activeTab === 'team-tasks' ? '#fff4e6' : '#ffffff',
              color: activeTab === 'team-tasks' ? 'var(--primary)' : 'var(--text-secondary)',
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
          {/* Full-Width "Start New Work Task" Form Card — 3-Section SaaS Design */}
          <div className="ui-card" style={{ padding: '1.5rem', width: '100%', borderRadius: '12px' }}>
            <div style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Start New Work Task
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Fill in the details below to initiate and track your work task.
              </p>
            </div>

            <form onSubmit={handleStartSelfTask} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* SECTION 1: TASK DETAILS */}
              <div style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1.15rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.15rem' }}>
                  <Briefcase size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-main)',
                  }}>
                    Task Details
                  </span>
                </div>
                {/* Product & Client Side-by-Side with Inline Quick-Add Button */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {/* Product */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                        Product Name <span style={{ color: 'var(--primary)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.785rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                          transition: 'color 0.15s ease',
                        }}
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
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '38px', padding: '0.4rem 0.75rem', fontSize: '0.8125rem', flex: 1 }}
                            value={customProductName}
                            onChange={(e) => setCustomProductName(e.target.value)}
                            placeholder="Enter custom product name..."
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: '38px', padding: '0 0.65rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}
                            onClick={() => {
                              setIsCustomProduct(false);
                              setProductId('');
                              setCustomProductName('');
                              setClientId('');
                              setCustomClientName('');
                              setIsCustomClient(false);
                            }}
                            title="Switch back to standard product list"
                          >
                            <RotateCcw size={13} />
                            <span style={{ fontSize: '0.75rem' }}>List</span>
                          </button>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem', display: 'inline-block', fontWeight: 600 }}>
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
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                        Client Name <span style={{ color: 'var(--primary)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: (!isCustomProduct && !productId) ? 'var(--text-muted)' : 'var(--primary)',
                          fontSize: '0.785rem',
                          fontWeight: 700,
                          cursor: (!isCustomProduct && !productId) ? 'not-allowed' : 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                          transition: 'color 0.15s ease',
                        }}
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
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '38px', padding: '0.4rem 0.75rem', fontSize: '0.8125rem', flex: 1 }}
                            value={customClientName}
                            onChange={(e) => setCustomClientName(e.target.value)}
                            placeholder="Enter custom client company name..."
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: '38px', padding: '0 0.65rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}
                            onClick={() => {
                              setIsCustomClient(false);
                              setClientId('');
                              setCustomClientName('');
                            }}
                            title="Switch back to standard client list"
                          >
                            <RotateCcw size={13} />
                            <span style={{ fontSize: '0.75rem' }}>List</span>
                          </button>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem', display: 'inline-block', fontWeight: 600 }}>
                          ✨ Custom Client Name (Stored on this task)
                        </span>
                      </div>
                    ) : (
                      <>
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
                        {!isCustomProduct && !productId && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                            Select a product first
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Module / Feature Name */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                      Module / Feature Name <span style={{ color: 'var(--primary)' }}>*</span>
                    </label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: moduleName.length >= 95 ? '#ef4444' : moduleName.length >= 80 ? '#f59e0b' : 'var(--text-muted)',
                        fontWeight: moduleName.length >= 80 ? 700 : 400,
                        opacity: moduleName.length === 0 ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {moduleName.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ height: '38px', padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="e.g. Employee Payslip Generation"
                    maxLength={100}
                    required
                  />
                </div>

                {/* Task Description */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                      Task Description <span style={{ color: 'var(--primary)' }}>*</span>
                    </label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: description.length >= 475 ? '#ef4444' : description.length >= 400 ? '#f59e0b' : 'var(--text-muted)',
                        fontWeight: description.length >= 400 ? 700 : 400,
                        opacity: description.length === 0 ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {description.length}/500
                    </span>
                  </div>
                  <textarea
                    className="form-input"
                    rows={2}
                    style={{
                      height: '75px',
                      minHeight: '75px',
                      maxHeight: '160px',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.8125rem',
                      lineHeight: 1.4,
                      resize: 'vertical',
                    }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed description of task objectives..."
                    maxLength={500}
                    required
                  />
                </div>
              </div>

              {/* SECTION 2: SCHEDULE */}
              <div style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1.15rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.15rem' }}>
                  <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-main)',
                  }}>
                    Schedule & Estimated Effort
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {/* Priority with leading Flag icon */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Flag size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>Priority</span>
                    </label>
                    <GlassSelect
                      value={selfPriority}
                      onChange={(val) => setSelfPriority(Number(val))}
                      options={[
                        { value: 0, label: 'Low' },
                        { value: 1, label: 'Medium' },
                        { value: 2, label: 'High' },
                        { value: 3, label: 'Urgent' },
                      ]}
                    />
                  </div>

                  {/* Planned Start Date with leading Calendar icon */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>Planned Start Date</span>
                    </label>
                    <GlassDatePicker
                      value={selfPlannedStart}
                      onChange={(val) => setSelfPlannedStart(val)}
                      minDate={new Date().toISOString().split('T')[0]}
                      placeholder="Select start date..."
                    />
                  </div>

                  {/* Due Date with leading Calendar icon */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>Due Date</span>
                    </label>
                    <GlassDatePicker
                      value={selfDueDate}
                      onChange={(val) => setSelfDueDate(val)}
                      minDate={selfPlannedStart || new Date().toISOString().split('T')[0]}
                      placeholder="Select due date..."
                    />
                  </div>

                  {/* Unified Planned Duration Control with Clock icon */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>Planned Duration <span style={{ color: 'var(--primary)' }}>*</span></span>
                    </label>

                    {/* Compact unified duration control */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--input)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 4px',
                      height: '38px',
                      boxShadow: 'var(--shadow-xs)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.35rem' }}>
                        <Clock size={14} style={{ color: 'var(--text-muted)', marginRight: '0.35rem', flexShrink: 0 }} />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          placeholder="8"
                          value={selfPlannedHours}
                          onChange={(e) => setSelfPlannedHours(e.target.value)}
                          style={{
                            width: '36px',
                            border: 'none',
                            outline: 'none',
                            textAlign: 'center',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            background: 'transparent',
                            padding: 0,
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginRight: '0.4rem' }}>h</span>
                      </div>

                      <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 0.25rem' }} />

                      <div style={{ flex: 1 }}>
                        <select
                          value={selfPlannedMinutes}
                          onChange={(e) => setSelfPlannedMinutes(e.target.value)}
                          style={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            padding: '0 0.25rem',
                            colorScheme: 'inherit',
                          }}
                        >
                          <option value="00" style={{ background: 'var(--panel)', color: 'var(--text-main)' }}>00m</option>
                          <option value="15" style={{ background: 'var(--panel)', color: 'var(--text-main)' }}>15m</option>
                          <option value="30" style={{ background: 'var(--panel)', color: 'var(--text-main)' }}>30m</option>
                          <option value="45" style={{ background: 'var(--panel)', color: 'var(--text-main)' }}>45m</option>
                        </select>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', alignItems: 'flex-start', gap: '0.3rem', lineHeight: 1.3 }}>
                      <span>💡</span>
                      <span>This is your estimated working time — can be less than the full Start–Due window</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: NOTES */}
              <div style={{
                background: 'var(--panel-raised)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1.15rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.15rem' }}>
                  <Activity size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-main)',
                  }}>
                    Notes
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>
                      Instructions / Remarks <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: selfInstructions.length >= 285 ? '#ef4444' : selfInstructions.length >= 240 ? '#f59e0b' : 'var(--text-muted)',
                        fontWeight: selfInstructions.length >= 240 ? 700 : 400,
                        opacity: selfInstructions.length === 0 ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {selfInstructions.length}/300
                    </span>
                  </div>
                  <textarea
                    className="form-input"
                    rows={2}
                    style={{
                      height: '58px',
                      minHeight: '58px',
                      maxHeight: '140px',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.8125rem',
                      lineHeight: 1.4,
                      resize: 'vertical',
                    }}
                    value={selfInstructions}
                    onChange={(e) => setSelfInstructions(e.target.value)}
                    placeholder="Optional notes or instructions for yourself..."
                    maxLength={300}
                  />
                </div>
              </div>

              {/* Sticky / Dedicated Action Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border)',
              }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.6rem',
                    height: '40px',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(232, 135, 60, 0.25)',
                  }}
                >
                  <Play size={16} />
                  <span>Start Task</span>
                </button>
              </div>
            </form>
          </div>

          {/* Full-Width "Recent Work Tasks" Section Stacked Directly Below */}
          <div id="recent-work-tasks-section">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Recent Work Tasks
            </h3>

            {loading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading task history...</p>
            ) : myRecentTasks.length === 0 ? (
              <div className="ui-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No active or today's tasks found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myRecentTasks.map((t) => {
                  const statusColor = getTaskStatusColor(t.status, t.isOverdue);
                  const isHighlighted = highlightedTaskId === t.id;
                  const isExceededWorked = (t.plannedDurationMinutes != null && t.plannedDurationMinutes > 0 && t.totalProductiveSeconds > (t.plannedDurationMinutes * 60)) || t.isExceededDuration;
                  const isLongDesc = (t.description || '').length > 130;
                  const isExpanded = !!expandedDescIds[t.id];

                  return (
                    <div
                      key={t.id}
                      id={`task-card-${t.id}`}
                      className="ui-card"
                      style={{
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        borderLeft: `4px solid ${statusColor.accent}`,
                        transition: 'all 0.35s ease',
                        ...(isHighlighted ? {
                          boxShadow: `0 0 0 2px ${statusColor.accent}, 0 8px 24px rgba(232, 135, 60, 0.35)`,
                          transform: 'translateY(-2px)',
                        } : {})
                      }}
                    >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{t.moduleName}</h4>
                        {getPriorityBadge(t.priority)}
                        {getExceededBadge(isExceededWorked)}
                      </div>
                      {getStatusBadge(t.status, t.isOverdue)}
                    </div>

                    <div>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        ...(!isExpanded && isLongDesc ? {
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        } : {})
                      }}>
                        {t.description}
                      </p>
                      {isLongDesc && (
                        <button
                          type="button"
                          onClick={() => toggleExpandDesc(t.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0.25rem 0 0 0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {isExpanded ? (
                            <>
                              <span>Show less</span>
                              <ChevronUp size={13} />
                            </>
                          ) : (
                            <>
                              <span>Show more</span>
                              <ChevronDown size={13} />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Fixed Metadata Grid - Always 5 Symmetrical Columns */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.85rem',
                      background: 'var(--panel-raised)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '0.85rem 1.25rem'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Product</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.productName || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Client</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.clientCompanyName || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Planned Duration</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600, display: 'block' }}>
                          {t.plannedDurationMinutes != null && t.plannedDurationMinutes > 0
                            ? formatDurationToHoursMinutes(t.plannedDurationMinutes / 60)
                            : '--'}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Worked</span>
                        <span style={{
                          fontSize: '0.875rem',
                          color: isExceededWorked ? '#EF4444' : 'var(--success-text)',
                          fontWeight: 700,
                          display: 'block'
                        }}>
                          {formatDurationToHoursMinutes(t.totalProductiveSeconds / 3600)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Due Date</span>
                        <span style={{
                          fontSize: '0.875rem',
                          color: t.isOverdue ? 'var(--danger-text)' : (t.dueDate ? 'var(--text-main)' : 'var(--text-muted)'),
                          fontWeight: 600,
                          display: 'block'
                        }}>
                          {t.dueDate ? formatDateIST(t.dueDate) : 'No due date set'}
                        </span>
                      </div>
                    </div>

                    {/* Footer & Standardized Action Buttons Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
                              backgroundColor: 'var(--warning-bg)',
                              borderColor: 'rgba(245, 158, 11, 0.3)',
                              color: 'var(--warning-text)',
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
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.785rem', borderRadius: '8px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => setSelectedTaskForTimeline(t)}
                          title="View Audit Timeline"
                        >
                          <Clock size={14} />
                          <span>Timeline</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Assigned Tasks */}
      {activeTab === 'assigned-tasks' && (
        <div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Tasks Assigned To Me
          </h3>

          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading assigned tasks...</p>
          ) : assignedTasks.length === 0 ? (
            <div className="ui-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No tasks currently assigned to you by Admin or Management.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {assignedTasks.map((t) => {
                const statusColor = getTaskStatusColor(t.status, t.isOverdue);
                const isExceededWorked = (t.plannedDurationMinutes != null && t.plannedDurationMinutes > 0 && t.totalProductiveSeconds > (t.plannedDurationMinutes * 60)) || t.isExceededDuration;
                const isLongDesc = (t.description || '').length > 130;
                const isExpanded = !!expandedDescIds[t.id];

                return (
                  <div key={t.id} id={`task-card-${t.id}`} className="ui-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${statusColor.accent}`, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{t.moduleName}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Assigned By: <strong style={{ color: 'var(--text-main)' }}>{t.assignedByName || (t.assignerType === 2 ? 'System Admin' : 'Manager')}</strong> ({t.assignerTypeName})
                      </div>
                    </div>
                    {getPriorityBadge(t.priority)}
                  </div>

                  <div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      ...(!isExpanded && isLongDesc ? {
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      } : {})
                    }}>
                      {t.description}
                    </p>
                    {isLongDesc && (
                      <button
                        type="button"
                        onClick={() => toggleExpandDesc(t.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '0.25rem 0 0 0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <span>Show less</span>
                            <ChevronUp size={13} />
                          </>
                        ) : (
                          <>
                            <span>Show more</span>
                            <ChevronDown size={13} />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Fixed Metadata Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.75rem',
                    background: 'var(--panel-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Product</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.productName || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Client</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t.clientCompanyName || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Planned Duration</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, display: 'block' }}>
                        {t.plannedDurationMinutes != null && t.plannedDurationMinutes > 0
                          ? formatDurationToHoursMinutes(t.plannedDurationMinutes / 60)
                          : '--'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Worked</span>
                      <span style={{
                        fontSize: '0.85rem',
                        color: isExceededWorked ? '#EF4444' : 'var(--success-text)',
                        fontWeight: 700,
                        display: 'block'
                      }}>
                        {formatDurationToHoursMinutes(t.totalProductiveSeconds / 3600)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>Due Date</span>
                      <span style={{ fontSize: '0.85rem', color: t.isOverdue ? 'var(--danger-text)' : (t.dueDate ? 'var(--text-main)' : 'var(--text-muted)'), fontWeight: 600, display: 'block' }}>
                        {t.dueDate ? formatDateIST(t.dueDate) : 'No due date set'}
                      </span>
                    </div>
                  </div>

                  {/* Footer & Action Buttons Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {getStatusBadge(t.status, t.isOverdue)}
                      {getExceededBadge(t.isExceededDuration || (t.plannedDurationMinutes != null && t.plannedDurationMinutes > 0 && t.totalProductiveSeconds > (t.plannedDurationMinutes * 60)))}
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
                            backgroundColor: 'var(--warning-bg)',
                            borderColor: 'rgba(245, 158, 11, 0.3)',
                            color: 'var(--warning-text)',
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
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.785rem', borderRadius: '8px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => setSelectedTaskForTimeline(t)}
                          title="View Audit Timeline"
                        >
                          <Clock size={14} />
                          <span>Timeline</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
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
            <div className="ui-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
              <Users size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>No Direct Reportees Linked</h4>
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
                      <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setTeamShowAllTasks(!teamShowAllTasks)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: teamShowAllTasks ? 'var(--primary-tint)' : 'var(--panel-raised)',
                        color: teamShowAllTasks ? 'var(--primary)' : 'var(--text-secondary)',
                        border: teamShowAllTasks ? '1px solid var(--primary)' : '1px solid var(--border)',
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
                      <span style={{ color: teamFilterOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>⚠️ Overdue Only</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={teamFilterExceededDuration}
                        onChange={(e) => setTeamFilterExceededDuration(e.target.checked)}
                      />
                      <span style={{ color: teamFilterExceededDuration ? '#F59E0B' : 'var(--text-primary)' }}>⏳ Exceeded Estimate Only</span>
                    </label>
                  </div>

                  {isAnyTeamFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetTeamFilters}
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

              {/* View Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-xs)',
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
                      background: 'var(--primary-tint)',
                      color: 'var(--primary)',
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
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
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
                          background: 'var(--panel-raised)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          fontWeight: 600
                        }}
                      >
                        {displayTeamTasks.length} tasks
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
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
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No team tasks found matching selected criteria.
                        </td>
                      </tr>
                    ) : (
                      displayTeamTasks.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{t.moduleName}</div>
                            <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>{t.description}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.employeeName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.employeeCode}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{t.productName}</div>
                            <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>{t.clientCompanyName}</div>
                          </td>
                          <td>{getPriorityBadge(t.priority)}</td>
                          <td>
                            <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
                              Due: {t.dueDate ? formatDateIST(t.dueDate) : 'N/A'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Planned: {t.plannedDurationMinutes != null && t.plannedDurationMinutes > 0 ? formatDurationToHoursMinutes(t.plannedDurationMinutes / 60) : 'N/A'}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              {getStatusBadge(t.status, t.isOverdue)}
                              {getExceededBadge(t.isExceededDuration || (t.plannedDurationMinutes != null && t.plannedDurationMinutes > 0 && t.totalProductiveSeconds > (t.plannedDurationMinutes * 60)))}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--success-text)' }}>
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

              {/* Server-Side Pagination Component */}
              <Pagination
                currentPage={teamPage}
                totalPages={teamTotalPages}
                totalCount={teamTotalCount}
                pageSize={teamPageSize}
                onPageChange={(p) => setTeamPage(p)}
                onPageSizeChange={(s) => {
                  setTeamPageSize(s);
                  setTeamPage(1);
                }}
                disabled={teamLoading}
              />
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
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Assign Task to Direct Team Member
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Create and schedule a new work task for your direct reportees.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeamAssignModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            {teamAssignError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.825rem', fontWeight: 500 }}>
                ⚠️ {teamAssignError}
              </div>
            )}

            <form onSubmit={handleCreateTeamTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              {/* SECTION 1: ASSIGNMENT DETAILS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.785rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
                      <label className="form-label" style={{ margin: 0, color: 'var(--text-main)' }}>Product Name *</label>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.785rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
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
                      <label className="form-label" style={{ margin: 0, color: 'var(--text-main)' }}>Client Name *</label>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: (!isTeamCustomProduct && !teamProductId) ? 'var(--text-muted)' : 'var(--primary)', fontSize: '0.785rem', fontWeight: 700, cursor: (!isTeamCustomProduct && !teamProductId) ? 'not-allowed' : 'pointer', textDecoration: 'underline', padding: 0 }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.785rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  2. Task Details
                </div>

                {/* Module / Feature Name (max 100) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0, color: 'var(--text-main)' }}>Module / Feature Name *</label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: teamModuleName.length >= 100 ? '#ef4444' : teamModuleName.length >= 90 ? 'var(--primary)' : 'var(--text-muted)',
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
                    <label className="form-label" style={{ margin: 0, color: 'var(--text-main)' }}>Task Description *</label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: teamDescription.length >= 500 ? '#ef4444' : teamDescription.length >= 450 ? 'var(--primary)' : 'var(--text-muted)',
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
                <div style={{ fontSize: '0.785rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.3rem', color: 'var(--text-main)' }}>
                    Planned Duration *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
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
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
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
                    <label className="form-label" style={{ margin: 0, color: 'var(--text-main)' }}>Instructions / Remarks</label>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        color: teamInstructions.length >= 300 ? '#ef4444' : teamInstructions.length >= 270 ? 'var(--primary)' : 'var(--text-muted)',
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTeamAssignModal(false)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeamAssign}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.85rem',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: submittingTeamAssign ? 'not-allowed' : 'pointer',
                    opacity: submittingTeamAssign ? 0.65 : 1,
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
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
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
                  {user?.employeeId && (
                    <option value={user.employeeId}>
                      {currentUserProfile?.name || user.employeeName} ({currentUserProfile?.employeeCode || `EMP #${user.employeeId}`})
                    </option>
                  )}
                  {teamEmployees
                    .filter((emp) => emp.id !== user?.employeeId)
                    .map((emp) => (
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
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
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
          productName={selectedTaskForTimeline.productName}
          clientCompanyName={selectedTaskForTimeline.clientCompanyName}
          status={selectedTaskForTimeline.status}
          isOverdue={selectedTaskForTimeline.isOverdue}
          isExceededDuration={selectedTaskForTimeline.isExceededDuration}
          plannedDurationMinutes={selectedTaskForTimeline.plannedDurationMinutes}
          totalProductiveSeconds={selectedTaskForTimeline.totalProductiveSeconds}
          dueDate={selectedTaskForTimeline.dueDate}
          plannedStart={selectedTaskForTimeline.plannedStart}
        />
      )}

      {/* TASK ACTION & CONFIRMATION REMARKS MODAL */}
      {actionModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeInOverlay 0.2s ease-out',
          }}
          onClick={() => !actionModal.submitting && setActionModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: 'var(--panel)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              animation: 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--panel-raised)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {actionModal.type.includes('switch') ? (
                  <div style={{ padding: '0.5rem', borderRadius: '10px', background: '#F59E0B', color: '#ffffff', display: 'flex' }}>
                    <AlertCircle size={20} />
                  </div>
                ) : actionModal.type === 'complete' ? (
                  <div style={{ padding: '0.5rem', borderRadius: '10px', background: '#10B981', color: '#ffffff', display: 'flex' }}>
                    <CheckCircle2 size={20} />
                  </div>
                ) : (
                  <div style={{ padding: '0.5rem', borderRadius: '10px', background: '#3B82F6', color: '#ffffff', display: 'flex' }}>
                    <Play size={20} />
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {actionModal.type.includes('switch')
                      ? 'Task Currently Running'
                      : actionModal.type === 'complete'
                        ? 'Complete Work Task'
                        : actionModal.type === 'hold'
                          ? 'Put Task On Hold'
                          : actionModal.type === 'resume'
                            ? 'Resume Work Task'
                            : actionModal.type === 'start-assigned'
                              ? 'Start Assigned Task'
                              : 'Start Work Task'}
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {actionModal.taskTitle}
                  </p>
                </div>
              </div>

              {!actionModal.submitting && (
                <button
                  type="button"
                  onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.35rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              {actionModal.error && (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger-text)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {actionModal.error}
                </div>
              )}

              {actionModal.type.includes('switch') ? (
                <>
                  <div style={{ padding: '0.875rem 1rem', background: 'var(--panel-raised)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    Task <strong>"{actionModal.activeTaskTitle}"</strong> is currently running.<br />
                    Do you want to put it <strong>On Hold</strong> and {actionModal.type === 'resume-switch' ? 'resume' : 'start'} <strong>"{actionModal.taskTitle}"</strong>?
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Remarks for putting "{actionModal.activeTaskTitle}" On Hold: <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter remarks for putting current task on hold..."
                      value={actionModal.holdRemarks}
                      onChange={(e) => setActionModal((prev) => ({ ...prev, holdRemarks: e.target.value }))}
                      className="form-input"
                      style={{
                        width: '100%',
                        resize: 'none',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Remarks for {actionModal.type === 'resume-switch' ? 'resuming' : 'starting'} "{actionModal.taskTitle}":
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter action remarks (optional)..."
                      value={actionModal.remarks}
                      onChange={(e) => setActionModal((prev) => ({ ...prev, remarks: e.target.value }))}
                      className="form-input"
                      style={{
                        width: '100%',
                        resize: 'none',
                      }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Remarks for {
                      actionModal.type === 'complete' ? 'completing' :
                        actionModal.type === 'hold' ? 'holding' :
                          actionModal.type === 'resume' ? 'resuming' : 'starting'
                    } task: <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder={`Enter remarks for ${actionModal.type === 'complete' ? 'completing' :
                        actionModal.type === 'hold' ? 'holding' :
                          actionModal.type === 'resume' ? 'resuming' : 'starting'
                      } this task...`}
                    value={actionModal.remarks}
                    onChange={(e) => setActionModal((prev) => ({ ...prev, remarks: e.target.value }))}
                    className="form-input"
                    style={{
                      width: '100%',
                      resize: 'none',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                padding: '1rem 1.5rem',
                background: 'var(--panel-raised)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                disabled={actionModal.submitting}
                onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {actionModal.type.includes('switch') ? 'No' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={
                  actionModal.submitting ||
                  (actionModal.type.includes('switch') && !actionModal.holdRemarks.trim()) ||
                  (!actionModal.type.includes('switch') && !actionModal.remarks.trim())
                }
                onClick={submitTaskActionModal}
                className="btn btn-primary"
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  background: actionModal.type === 'complete' ? '#10B981' : '#3B82F6',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  opacity:
                    actionModal.submitting ||
                      (actionModal.type.includes('switch') && !actionModal.holdRemarks.trim()) ||
                      (!actionModal.type.includes('switch') && !actionModal.remarks.trim())
                      ? 0.6
                      : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {actionModal.submitting
                  ? 'Processing...'
                  : actionModal.type.includes('switch')
                    ? 'Yes, Switch & Proceed'
                    : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};