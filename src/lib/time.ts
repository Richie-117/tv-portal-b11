export const TIMEZONE = 'Asia/Colombo';

export interface SriLankaTimeContext {
  now: Date;
  dateStr: string;         // "YYYY-MM-DD"
  timeStr: string;         // "HH:MM"
  timeWithSeconds: string; // "HH:MM:SS"
  minutesNow: number;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  displayDate: string;     // "Thursday, 22 November 2026"
  displayTime: string;     // "10:08 PM"
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export function getSriLankaDateTime(simulatedDate?: Date | string): SriLankaTimeContext {
  const d = simulatedDate ? new Date(simulatedDate) : new Date();

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(d);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const day = partMap.day || '01';
  const weekday = (partMap.weekday || 'Monday') as SriLankaTimeContext['dayOfWeek'];
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);
  const second = parseInt(partMap.second || '0', 10);

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const timeWithSeconds = `${timeStr}:${second.toString().padStart(2, '0')}`;
  const minutesNow = hour * 60 + minute;

  const displayDate = d.toLocaleDateString('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const displayTime = d.toLocaleTimeString('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    now: d,
    dateStr,
    timeStr,
    timeWithSeconds,
    minutesNow,
    dayOfWeek: weekday,
    displayDate,
    displayTime,
  };
}
