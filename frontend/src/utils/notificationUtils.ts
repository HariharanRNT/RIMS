/**
 * Notification utility module for browser Notifications API & Audio Chime.
 * Fails silently if notifications are unsupported or permission is denied.
 */

let sharedAudioContext: AudioContext | null = null;

/**
 * Get or create the shared singleton AudioContext instance.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioCtx();
  }
  return sharedAudioContext;
}

/**
 * "Unlock" the shared AudioContext from a real user gesture context
 * (such as button click or key press) so subsequent automated chimes
 * from Web Workers or background timers can play audibly without being blocked by browser autoplay policy.
 */
export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Auto-unlock on first user gesture anywhere on the page
if (typeof window !== 'undefined') {
  const unlockOnFirstGesture = () => {
    unlockAudioContext();
    window.removeEventListener('click', unlockOnFirstGesture);
    window.removeEventListener('keydown', unlockOnFirstGesture);
    window.removeEventListener('touchstart', unlockOnFirstGesture);
  };
  window.addEventListener('click', unlockOnFirstGesture, { once: true, passive: true });
  window.addEventListener('keydown', unlockOnFirstGesture, { once: true, passive: true });
  window.addEventListener('touchstart', unlockOnFirstGesture, { once: true, passive: true });
}

/**
 * Check if the browser supports the Notifications API.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Request notification permission from the user.
 * Must be called from a user-gesture context (e.g., button click).
 * Also unlocks the shared AudioContext instance.
 * Returns the permission state, or 'denied' if unsupported.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  unlockAudioContext();
  if (!isNotificationSupported()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    // Fails silently — some older browsers don't support promise-based API
    return 'denied';
  }
}

/**
 * Play a subtle, pleasant notification chime using Web Audio API (zero assets needed).
 * Reuses a single shared AudioContext and resumes it if suspended.
 */
export async function playNotificationChime(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn('[RIIMS Notification] Chime playback failed:', err);
  }
}

/**
 * Show a stylish on-screen floating toast notification directly inside the browser window.
 */
export function showInAppToast(title: string, body: string, type: 'idle' | 'task' = 'idle'): void {
  if (typeof document === 'undefined') return;

  const existingToast = document.getElementById('riims-active-toast');
  if (existingToast) existingToast.remove();

  const isTask = type === 'task';
  const icon = isTask
    ? title.includes('✅') ? '✅' : title.includes('⚠') ? '⚠' : '⏰'
    : '⏸';
  const accentColor = isTask
    ? title.includes('✅') ? '#10b981' : title.includes('⚠') ? '#f59e0b' : '#3b82f6'
    : '#f97316';

  const cleanTitle = title.replace(/^[✅⚠⏰⏸]\s*/, '');

  const toast = document.createElement('div');
  toast.id = 'riims-active-toast';
  toast.style.position = 'fixed';
  toast.style.top = '24px';
  toast.style.right = '24px';
  toast.style.zIndex = '999999';
  toast.style.minWidth = '320px';
  toast.style.maxWidth = '420px';
  toast.style.backgroundColor = 'var(--panel, #1e293b)';
  toast.style.color = 'var(--text-main, #f8fafc)';
  toast.style.border = `1px solid ${accentColor}40`;
  toast.style.borderLeft = `5px solid ${accentColor}`;
  toast.style.borderRadius = '12px';
  toast.style.padding = '0.9rem 1.15rem';
  toast.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)';
  toast.style.display = 'flex';
  toast.style.flexDirection = 'column';
  toast.style.gap = '0.4rem';
  toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-10px)';

  toast.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 0.95rem; color: ${accentColor};">
        <span style="font-size: 1.1rem;">${icon}</span>
        <span>${cleanTitle}</span>
      </div>
      <button id="riims-toast-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 2px 6px;">✕</button>
    </div>
    <div style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.45;">
      ${body}
    </div>
  `;

  document.body.appendChild(toast);

  // Trigger entrance transition
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  const closeBtn = document.getElementById('riims-toast-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    };
  }

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }
  }, 10000);
}

/**
 * Show a browser notification for a task reminder (OS alert + In-App popup + Chime).
 *
 * @param title - Notification title
 * @param body - Notification body text
 * @param tag - Unique tag to prevent duplicate notifications
 */
export function showTaskReminder(title: string, body: string, tag: string): void {
  showBrowserNotification(title, body, tag);
  showInAppToast(title, body, 'task');
}

/**
 * Show a browser notification for an idle reminder (OS alert + In-App popup + Chime).
 */
export function showIdleNotification(title: string, body: string, tag: string): void {
  showBrowserNotification(title, body, tag);
  showInAppToast(title, body, 'idle');
}

/**
 * Parse an ISO date string reliably in UTC milliseconds.
 * If the string does not end in 'Z' or include timezone offset '+/-', appends 'Z'
 * to prevent Javascript from incorrectly parsing UTC database dates as local time.
 */
export function parseUtcMs(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const str = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const ms = new Date(str).getTime();
  return isNaN(ms) ? 0 : ms;
}

/**
 * Generic browser notification helper with tab-focusing on click and optional chime.
 */
export function showBrowserNotification(title: string, body: string, tag: string): void {
  playNotificationChime().catch(() => {});

  if (!isNotificationSupported()) {
    console.warn('[RIIMS Notification] Notifications API not supported in this browser.');
    return;
  }

  const currentPermission = Notification.permission;
  console.log(`[RIIMS Notification] Dispatching: "${title}" | Permission: "${currentPermission}" | Tag: "${tag}"`);

  if (currentPermission !== 'granted') {
    console.warn(`[RIIMS Notification] Cannot show OS notification: permission is "${currentPermission}". Please allow notifications in your browser.`);
    return;
  }

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    tag, // Prevents duplicate notifications with the same tag
    icon: '/RNT-Logo.png',
    badge: '/RNT-Logo.png',
    renotify: true,
    requireInteraction: false,
  };

  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    console.log('[RIIMS Notification] Desktop Notification displayed successfully.');
  } catch (err: any) {
    console.warn('[RIIMS Notification] Direct Notification constructor failed, trying ServiceWorker fallback:', err);
    // Fallback if direct Notification constructor is restricted
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options);
          console.log('[RIIMS Notification] ServiceWorker showNotification sent successfully.');
        }).catch((swErr) => {
          console.error('[RIIMS Notification] ServiceWorker showNotification failed:', swErr);
        });
      }
    } catch (fallbackErr) {
      console.error('[RIIMS Notification] All notification display methods failed:', fallbackErr);
    }
  }
}

/**
 * Create a background-safe interval timer using an inline Web Worker.
 * Unlike DOM setInterval/setTimeout, Web Workers are not throttled to 1 minute
 * by modern browsers (Chrome/Edge/Firefox) when tabs are backgrounded or minimized.
 *
 * Falls back safely to standard setInterval if Web Workers are unavailable or blocked.
 */
export function createBackgroundInterval(callback: () => void, intervalMs: number = 1000): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
    try {
      const workerScript = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, ${intervalMs});
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      worker.onmessage = () => {
        callback();
      };

      worker.postMessage('start');

      return () => {
        try {
          worker.postMessage('stop');
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
        } catch {
          // Cleanup error fail silently
        }
      };
    } catch {
      // Fallback if Blob or Worker constructor is restricted by CSP
    }
  }

  const id = setInterval(callback, intervalMs);
  return () => clearInterval(id);
}
