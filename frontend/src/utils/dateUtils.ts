/**
 * Utility functions to format UTC timestamps consistently in Indian Standard Time (IST - Asia/Kolkata).
 */

export const formatTimeIST = (isoStr: string | null | undefined): string => {
  if (!isoStr) return '--:--';
  const utcStr = isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z';
  const dateObj = new Date(utcStr);
  if (isNaN(dateObj.getTime())) return '--:--';
  return dateObj.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDateIST = (isoStr: string | null | undefined): string => {
  if (!isoStr) return '--';
  const utcStr = isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z';
  const dateObj = new Date(utcStr);
  if (isNaN(dateObj.getTime())) return '--';
  return dateObj.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Converts decimal hours into HHh MMm formatted string (e.g. 0.27 hrs -> "00h 16m", 1.5 hrs -> "01h 30m").
 */
export const formatDurationToHoursMinutes = (hours: number | null | undefined): string => {
  if (hours == null || isNaN(hours) || hours <= 0) {
    return '00h 00m';
  }
  const totalMins = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
};
