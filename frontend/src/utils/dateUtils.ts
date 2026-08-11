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
