import { useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { showTaskReminder } from '../utils/notificationUtils';

interface TaskForReminder {
  id: number;
  moduleName: string;
  status: string;
  plannedDurationMinutes?: number;
  totalProductiveSeconds: number;
  reminder30Fired?: boolean;
  reminder15Fired?: boolean;
  reminderCompletionFired?: boolean;
}

interface ReminderSettings {
  firstMinutes: number;
  secondMinutes: number;
  completionEnabled: boolean;
}

/**
 * Isolated hook that evaluates task end-time reminder thresholds
 * based on the live-ticking timerSeconds and fires browser notifications.
 *
 * - Reads existing task/settings data only — never mutates task or timer state.
 * - Synchronizes with backend-persisted flags (reminder30Fired, reminder15Fired, reminderCompletionFired)
 *   so page refreshes and multi-tab sessions do not re-fire already alerted notifications.
 * - Resets fired flags when task ID changes (new task).
 * - Immediately notifies backend via /api/tasks/{id}/reminder-fired upon firing.
 * - Only evaluates while task status is Running/InProgress.
 */
export function useTaskEndReminders(
  activeRunningTask: TaskForReminder | null | undefined,
  timerSeconds: number,
  reminderSettings: ReminderSettings
): void {
  // Track which reminders have already fired, keyed by "{taskId}-{type}"
  const firedRef = useRef<Record<string, boolean>>({});
  // Track the last task ID to reset flags on task change
  const lastTaskIdRef = useRef<number | null>(null);

  useEffect(() => {
    // No active running task or no planned duration → nothing to do
    if (!activeRunningTask) return;
    if (!activeRunningTask.plannedDurationMinutes || activeRunningTask.plannedDurationMinutes <= 0) return;

    // Only evaluate for Running/InProgress tasks
    const status = activeRunningTask.status;
    if (status !== 'Running' && status !== 'InProgress') return;

    // Reset fired flags when switching to a different task
    if (lastTaskIdRef.current !== activeRunningTask.id) {
      firedRef.current = {};
      lastTaskIdRef.current = activeRunningTask.id;
    }

    const taskId = activeRunningTask.id;
    const taskTitle = activeRunningTask.moduleName || 'Task';
    const plannedMinutes = activeRunningTask.plannedDurationMinutes;
    const workedMinutes = timerSeconds / 60;
    const remainingMinutes = plannedMinutes - workedMinutes;

    // Synchronize backend-persisted flags so refresh/multi-tab never re-fires
    if (activeRunningTask.reminder30Fired) {
      firedRef.current[`${taskId}-first`] = true;
    }
    if (activeRunningTask.reminder15Fired) {
      firedRef.current[`${taskId}-second`] = true;
    }
    if (activeRunningTask.reminderCompletionFired) {
      firedRef.current[`${taskId}-complete`] = true;
    }

    const { firstMinutes = 30, secondMinutes = 15, completionEnabled = true } = reminderSettings || {};

    // Check completion first (remainingMinutes <= 0)
    if (completionEnabled && remainingMinutes <= 0 && workedMinutes > 0 && !firedRef.current[`${taskId}-complete`]) {
      firedRef.current[`${taskId}-complete`] = true;
      apiClient.post(`/tasks/${taskId}/reminder-fired`, { milestone: 'completion' }).catch(() => {});
      showTaskReminder(
        `✅ Planned Duration Reached`,
        `Planned duration reached for '${taskTitle}'. You've worked ${plannedMinutes} min as planned.`,
        `task-reminder-${taskId}-complete`
      );
    }

    // Check second reminder (higher urgency, fires closer to end)
    if (remainingMinutes <= secondMinutes && remainingMinutes > 0 && plannedMinutes > secondMinutes && !firedRef.current[`${taskId}-second`]) {
      firedRef.current[`${taskId}-second`] = true;
      apiClient.post(`/tasks/${taskId}/reminder-fired`, { milestone: '15min' }).catch(() => {});
      showTaskReminder(
        `⚠ ${secondMinutes} Minutes Left`,
        `${secondMinutes} minutes left for '${taskTitle}' — wrap up soon.`,
        `task-reminder-${taskId}-second`
      );
    }

    // Check first reminder (fires earlier)
    if (remainingMinutes <= firstMinutes && remainingMinutes > secondMinutes && plannedMinutes > firstMinutes && !firedRef.current[`${taskId}-first`]) {
      firedRef.current[`${taskId}-first`] = true;
      apiClient.post(`/tasks/${taskId}/reminder-fired`, { milestone: '30min' }).catch(() => {});
      showTaskReminder(
        `⏰ ${firstMinutes} Minutes Left`,
        `${firstMinutes} minutes left for '${taskTitle}'.`,
        `task-reminder-${taskId}-first`
      );
    }
  }, [
    activeRunningTask?.id,
    activeRunningTask?.status,
    activeRunningTask?.plannedDurationMinutes,
    activeRunningTask?.moduleName,
    activeRunningTask?.reminder30Fired,
    activeRunningTask?.reminder15Fired,
    activeRunningTask?.reminderCompletionFired,
    timerSeconds,
    reminderSettings?.firstMinutes,
    reminderSettings?.secondMinutes,
    reminderSettings?.completionEnabled
  ]);
}
