import { useEffect } from 'react';
import apiClient from '../api/client';

export const useHeartbeat = (isAuthenticated: boolean) => {
  useEffect(() => {
    if (!isAuthenticated) return;

    const sendHeartbeat = async () => {
      try {
        await apiClient.post('/sessions/heartbeat');
      } catch {
        // Heartbeat failure due to temporary network outage is ignored safely
      }
    };

    // Initial heartbeat ping
    sendHeartbeat();

    // 60-second periodic heartbeat interval
    const interval = setInterval(sendHeartbeat, 60000);

    // Reconnection listener: when internet comes back online, notify application to re-hydrate state
    const handleOnline = () => {
      sendHeartbeat();
      window.dispatchEvent(new Event('activity-changed'));
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated]);
};
