import { useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { showIdleNotification, requestNotificationPermission, parseUtcMs, createBackgroundInterval } from '../utils/notificationUtils';

export interface IdleNotificationSettings {
  idleNotificationEnabled: boolean;
  idleThresholdMinutes: number;
  idleRepeatIntervalMinutes: number;
}

/**
 * Hook that monitors employee idle gaps (periods where an employee has NO active task,
 * NO break, and NO support activity running) and triggers OS-level browser notifications
 * and on-screen alerts at admin-configured intervals (e.g. 2m, 4m, 6m...).
 *
 * Rules:
 * 1. Mounted inside EmployeeLayout for any logged-in user with an employee profile.
 * 2. If the employee is currently doing a task (TaskStatus == Running), taking a break,
 *    or performing a support activity, idle notifications are NEVER sent.
 * 3. Only when a task is stopped/completed/held and no break/support is active,
 *    continuous idle time is counted.
 * 4. Resets to 0 immediately when a task is started/resumed or a break/support begins.
 * 5. Uses Web Worker-backed background interval so notifications fire on-schedule even
 *    when the RIMS tab is in the background, another tab is active, or browser is minimized.
 */
export function useIdleReminders(overrideSettings?: Partial<IdleNotificationSettings>): void {
  const { user } = useAuth();
  const employeeId = user?.employeeId;

  // Idle time notifications are active for any authenticated employee session
  const isEligibleEmployee = Boolean(employeeId && Number(employeeId) > 0);

  const settingsRef = useRef<IdleNotificationSettings>({
    idleNotificationEnabled: true,
    idleThresholdMinutes: 5,
    idleRepeatIntervalMinutes: 5,
    ...overrideSettings,
  });

  const hasActiveSessionRef = useRef<boolean>(false);
  const idleStartTimestampRef = useRef<number>(Date.now());
  const firedMilestonesRef = useRef<Record<number, boolean>>({});
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');

  // 1. Fetch system settings for idle notifications on mount, on settings-changed event, and periodically
  useEffect(() => {
    if (!isEligibleEmployee) return;

    let isMounted = true;

    const fetchSettings = () => {
      apiClient
        .get('/settings/idle-notifications')
        .then((res) => {
          if (isMounted && res.data?.success && res.data?.data) {
            const data = res.data.data;
            const thresh = Number(data.idleThresholdMinutes);
            const rep = Number(data.idleRepeatIntervalMinutes);

            settingsRef.current = {
              idleNotificationEnabled:
                data.idleNotificationEnabled === true ||
                String(data.idleNotificationEnabled).toLowerCase() === 'true',
              idleThresholdMinutes: !isNaN(thresh) && thresh > 0 ? thresh : 5,
              idleRepeatIntervalMinutes: !isNaN(rep) && rep > 0 ? rep : 5,
              ...overrideSettings,
            };
          }
        })
        .catch(() => {
          // Fail silently and use defaults
        });
    };

    fetchSettings();
    window.addEventListener('settings-changed', fetchSettings);
    const stopPoll = createBackgroundInterval(fetchSettings, 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('settings-changed', fetchSettings);
      stopPoll();
    };
  }, [overrideSettings, isEligibleEmployee]);

  // ---------------------------------------------------------------------------
  // (A) PURE LOCAL WEB WORKER NOTIFICATION ENGINE
  // Evaluates idle duration second-by-second strictly using local Date.now().
  // Runs 100% independently of network status, API latency, or server responses.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isEligibleEmployee) return;

    if (typeof document !== 'undefined') {
      originalTitleRef.current = document.title;
    }

    const stopTimer = createBackgroundInterval(() => {
      // 1. Guard: If an active task, break, or support session is running, skip
      if (hasActiveSessionRef.current) {
        return;
      }

      // 2. Guard: Settings check
      const { idleNotificationEnabled, idleThresholdMinutes, idleRepeatIntervalMinutes } = settingsRef.current;
      if (!idleNotificationEnabled) return;
      if (idleThresholdMinutes <= 0 || idleRepeatIntervalMinutes <= 0) return;

      // 3. Local elapsed idle time calculation (independent of network)
      const continuousIdleMs = Date.now() - idleStartTimestampRef.current;
      if (continuousIdleMs < 0) return;

      const continuousIdleMinutes = Math.floor(continuousIdleMs / 60000);

      // 4. Threshold check
      if (continuousIdleMinutes < idleThresholdMinutes) {
        return;
      }

      // 5. Milestone calculation: threshold + k * repeatInterval
      const elapsedSinceThreshold = continuousIdleMinutes - idleThresholdMinutes;
      const repeatStep = Math.floor(elapsedSinceThreshold / idleRepeatIntervalMinutes);
      const milestoneMinutes = idleThresholdMinutes + repeatStep * idleRepeatIntervalMinutes;

      // 6. Check if this milestone has already fired
      if (!firedMilestonesRef.current[milestoneMinutes]) {
        console.log(`[RIIMS Idle Engine] Local milestone ${milestoneMinutes}m reached (continuous idle: ${continuousIdleMinutes}m, threshold: ${idleThresholdMinutes}m, repeat: ${idleRepeatIntervalMinutes}m). Firing alert...`);

        // Mark all milestones up to this one as fired to prevent duplicates
        for (let m = idleThresholdMinutes; m <= milestoneMinutes; m += idleRepeatIntervalMinutes) {
          firedMilestonesRef.current[m] = true;
        }

        // Persist to backend so refreshes and multi-tabs don't duplicate
        apiClient.post('/idle/reminder-fired', { milestoneMinutes }).catch(() => {});

        if (milestoneMinutes === idleThresholdMinutes) {
          showIdleNotification(
            'Idle Time Alert',
            `You have no active task running and have been idle for ${milestoneMinutes} minutes. Please start or resume a task.`,
            `idle-gap-${milestoneMinutes}`
          );
        } else {
          showIdleNotification(
            'Still Idle',
            `No active task running — ${milestoneMinutes} minutes idle now. Please start or resume a task.`,
            `idle-gap-${milestoneMinutes}`
          );
        }

        // Update document title for visual awareness
        if (typeof document !== 'undefined') {
          document.title = `⏸ (${milestoneMinutes}m Idle) ${originalTitleRef.current || 'RIMS'}`;
        }
      }
    }, 1000);

    return () => {
      stopTimer();
    };
  }, [isEligibleEmployee]);

  // ---------------------------------------------------------------------------
  // (B) BACKGROUND SERVER RECONCILIATION ONLY
  // Periodically queries /api/idle/current-state to align timestamps if needed.
  // Completely decoupled: Failures/delays here NEVER block notification Engine (A).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isEligibleEmployee) return;

    let isMounted = true;

    const reconcileWithServer = async () => {
      try {
        const res = await apiClient.get('/idle/current-state');
        if (!isMounted || !res.data?.success || !res.data?.data) return;

        const data = res.data.data;
        const hasActiveActivity =
          data.state === 'TASK' ||
          data.state === 'BREAK' ||
          data.state === 'SUPPORT_ACTIVITY' ||
          (data.activeTaskId != null && Number(data.activeTaskId) > 0) ||
          (data.activeBreakId != null && Number(data.activeBreakId) > 0) ||
          (data.activeSupportId != null && Number(data.activeSupportId) > 0);

        if (!hasActiveActivity) {
          if (hasActiveSessionRef.current) {
            // Transitioned from active to idle -> reset fired milestones & zero-out local timestamp
            firedMilestonesRef.current = {};
            idleStartTimestampRef.current = Date.now();
          }
          hasActiveSessionRef.current = false;

          // Reconcile start timestamp if server provides a valid earlier/aligned timestamp
          if (data.idleStartedAt) {
            const serverIdleStart = parseUtcMs(data.idleStartedAt);
            if (serverIdleStart > 0 && serverIdleStart <= Date.now() + 60000) {
              if (Math.abs(idleStartTimestampRef.current - serverIdleStart) > 2000) {
                idleStartTimestampRef.current = serverIdleStart;
              }
            }
          }

          // Sync backend-persisted fired milestones
          if (Array.isArray(data.idleMilestonesFired)) {
            data.idleMilestonesFired.forEach((m: number) => {
              firedMilestonesRef.current[m] = true;
            });
          }
        } else {
          hasActiveSessionRef.current = true;
          idleStartTimestampRef.current = Date.now();
          firedMilestonesRef.current = {};
          if (typeof document !== 'undefined' && document.title.startsWith('⏸')) {
            document.title = originalTitleRef.current || 'RIMS';
          }
        }
      } catch {
        // Network/server errors fail silently — Engine (A) continues on local clock
      }
    };

    reconcileWithServer();

    // Reconcile whenever task/activity changes, on window focus, and periodically every 5s
    const handleReconcileTrigger = () => {
      reconcileWithServer();
    };

    window.addEventListener('activity-changed', handleReconcileTrigger);
    window.addEventListener('task-changed', handleReconcileTrigger);
    window.addEventListener('focus', handleReconcileTrigger);
    const stopInterval = createBackgroundInterval(reconcileWithServer, 5000);

    return () => {
      isMounted = false;
      window.removeEventListener('activity-changed', handleReconcileTrigger);
      window.removeEventListener('task-changed', handleReconcileTrigger);
      window.removeEventListener('focus', handleReconcileTrigger);
      stopInterval();
    };
  }, [isEligibleEmployee]);

  // ---------------------------------------------------------------------------
  // (C) BROWSER NOTIFICATION PERMISSION PROMPT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isEligibleEmployee) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const handleFirstInteraction = () => {
          requestNotificationPermission();
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
          window.removeEventListener('touchstart', handleFirstInteraction);
          window.removeEventListener('pointerdown', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction, { once: true });
        window.addEventListener('keydown', handleFirstInteraction, { once: true });
        window.addEventListener('touchstart', handleFirstInteraction, { once: true });
        window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
        return () => {
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
          window.removeEventListener('touchstart', handleFirstInteraction);
          window.removeEventListener('pointerdown', handleFirstInteraction);
        };
      }
    }
  }, [isEligibleEmployee]);
}
