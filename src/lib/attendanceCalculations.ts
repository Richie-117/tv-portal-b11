import { AttendanceRecord, CheckinSession, CourseType } from '@/types';

export const TRACKING_START_DATE = '2026-10-25';
export const TIMEZONE = 'Asia/Colombo';

export interface AttendanceRateResult {
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  validSessionsCount: number;
  rate: number | null; // null if denominator is 0
  formattedRate: string; // "92%" or "No attendance data"
  hasData: boolean;
}

export function isSessionValid(session: {
  date: string;
  sessionStatus?: string;
}): boolean {
  if (!session || !session.date) return false;
  if (
    session.sessionStatus === 'cancelled' ||
    session.sessionStatus === 'postponed'
  ) {
    return false;
  }
  return true;
}

export function calculateAttendanceRate(
  presentCount: number,
  absentCount: number,
  excusedCount: number = 0
): AttendanceRateResult {
  const denominator = presentCount + absentCount;
  const validSessionsCount = denominator + excusedCount;

  if (denominator <= 0) {
    return {
      presentCount,
      absentCount,
      excusedCount,
      validSessionsCount,
      rate: null,
      formattedRate: 'No attendance data',
      hasData: false,
    };
  }

  const rate = Math.round((presentCount / denominator) * 100);

  return {
    presentCount,
    absentCount,
    excusedCount,
    validSessionsCount,
    rate,
    formattedRate: `${rate}%`,
    hasData: true,
  };
}

export function calculateStudentAttendanceMetrics(
  student: { id: string; studentNumber: string; course?: CourseType },
  sessions: CheckinSession[],
  records: AttendanceRecord[],
  options?: {
    startDate?: string;
    endDate?: string;
    moduleId?: string;
  }
): AttendanceRateResult & {
  sessionDetails: Array<{
    sessionId: string;
    date: string;
    moduleCode?: string;
    moduleTitle: string;
    sessionType: string;
    status: 'present' | 'absent' | 'excused' | 'cancelled' | 'pending';
    excuseReason?: string;
    isValid: boolean;
  }>;
} {
  const applicableSessions = (sessions || []).filter((s) => {
    if (student.course && s.course !== 'ALL' && s.course !== student.course) {
      return false;
    }
    if (options?.startDate && s.date < options.startDate) return false;
    if (options?.endDate && s.date > options.endDate) return false;
    if (options?.moduleId && options.moduleId !== 'ALL' && s.moduleId !== options.moduleId && s.moduleCode !== options.moduleId) {
      return false;
    }
    return true;
  });

  const studentRecords = (records || []).filter(
    (r) =>
      r.studentId === student.id ||
      r.studentNumber?.toUpperCase() === student.studentNumber?.toUpperCase()
  );
  const recordMap = new Map<string, AttendanceRecord>();
  studentRecords.forEach((r) => recordMap.set(r.sessionId, r));

  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  const sessionDetails = applicableSessions.map((sess) => {
    const isCancelled = sess.sessionStatus === 'cancelled' || sess.sessionStatus === 'postponed';
    const rec = recordMap.get(sess.id);
    let status: 'present' | 'absent' | 'excused' | 'cancelled' | 'pending' = 'pending';
    let isValid = false;

    if (isCancelled) {
      status = 'cancelled';
    } else if (rec) {
      status = rec.status as any;
      isValid = true;
      if (rec.status === 'present') presentCount++;
      else if (rec.status === 'absent') absentCount++;
      else if (rec.status === 'excused') excusedCount++;
    } else {
      status = 'pending';
    }

    return {
      sessionId: sess.id,
      date: sess.date,
      moduleCode: sess.moduleCode,
      moduleTitle: sess.moduleTitle,
      sessionType: sess.sessionType,
      status,
      excuseReason: rec?.excuseReason,
      isValid,
    };
  });

  const rateResult = calculateAttendanceRate(presentCount, absentCount, excusedCount);

  return {
    ...rateResult,
    sessionDetails,
  };
}

