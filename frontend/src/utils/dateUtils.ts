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

export const formatHoursToHM = (hoursVal: number | null | undefined): string => {
  return formatDurationToHoursMinutes(hoursVal);
};

export const formatDurationString = (durStr: string | null | undefined): string => {
  if (!durStr) return '00h 00m';
  if (durStr === 'In Progress' || durStr.includes('In Progress')) return durStr;

  // Handles decimal string like "0.03 hrs", "0.01 hrs", "0.00 hrs" or "0.03"
  const hrsMatch = durStr.match(/^([\d.]+)\s*(?:hrs|hr)?$/i);
  if (hrsMatch) {
    const val = parseFloat(hrsMatch[1]);
    return formatDurationToHoursMinutes(val);
  }

  // Handles TimeSpan string like "01:25:00" or "00:03:15"
  const timeSpanMatch = durStr.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (timeSpanMatch) {
    const h = parseInt(timeSpanMatch[1], 10);
    const m = parseInt(timeSpanMatch[2], 10);
    const s = timeSpanMatch[3] ? parseInt(timeSpanMatch[3], 10) : 0;
    const totalMins = Math.round(h * 60 + m + s / 60);
    const finalH = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const finalM = (totalMins % 60).toString().padStart(2, '0');
    return `${finalH}h ${finalM}m`;
  }

  // Handles "1h 30m" or "0h 5m" format
  const hMRegex = /^(\d+)h\s*(\d+)m$/i;
  const hMatch = durStr.match(hMRegex);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10).toString().padStart(2, '0');
    const m = parseInt(hMatch[2], 10).toString().padStart(2, '0');
    return `${h}h ${m}m`;
  }

  return durStr;
};
