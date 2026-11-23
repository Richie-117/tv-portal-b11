import {
  TimetableSlot,
  TimetableOverride,
  CourseType,
  CourseScope,
} from '@/types';
import { getTimetableEntries, getLectureOverrides } from './db';
import { getSriLankaDateTime, parseTimeToMinutes, SriLankaTimeContext } from './time';
import {
  mergeTimetableSlots,
  MergedTimetableSlot,
  isAcademicLecture,
  isStudyOrEmptySlot,
  normalizeSubject,
  findMatchingOverride,
} from './timetableSlotUtils';

export type LectureStatusType =
  | 'LECTURE_ONGOING'
  | 'UPCOMING_LECTURE'
  | 'BREAK'
  | 'LUNCH_BREAK'
  | 'CANCELLED'
  | 'POSTPONED'
  | 'NO_LECTURE_SCHEDULED_TODAY'
  | 'STANDBY';

export interface CourseLiveLectureStatus {
  course: CourseType;
  courseName: string;
  status: LectureStatusType;
  statusLabel: string;
  currentSlot: MergedTimetableSlot | TimetableSlot | null;
  nextSlot: MergedTimetableSlot | TimetableSlot | null;
  override: TimetableOverride | null;
  dayOfWeek: string;
  currentTimeStr: string;
}

export async function getLiveLectureStatus(
  simulatedTime?: string | Date
): Promise<{
  timeContext: SriLankaTimeContext;
  tpopt: CourseLiveLectureStatus;
  tprpt: CourseLiveLectureStatus;
  allSlots: TimetableSlot[];
  overridesToday: TimetableOverride[];
}> {
  const timeContext = getSriLankaDateTime(simulatedTime);
  const [entries, overrides] = await Promise.all([
    getTimetableEntries(),
    getLectureOverrides(timeContext.dateStr),
  ]);

  const tpoptStatus = evaluateCourseStatus('TPOPT', timeContext, entries, overrides);
  const tprptStatus = evaluateCourseStatus('TPRPT', timeContext, entries, overrides);

  return {
    timeContext,
    tpopt: tpoptStatus,
    tprpt: tprptStatus,
    allSlots: entries,
    overridesToday: overrides,
  };
}

function evaluateCourseStatus(
  course: CourseType,
  timeContext: SriLankaTimeContext,
  allSlots: TimetableSlot[],
  overrides: TimetableOverride[]
): CourseLiveLectureStatus {
  const courseName =
    course === 'TPOPT'
      ? 'Television & Digital Media Post-Production Technology'
      : 'Television & Digital Media Production Technology';

  // Filter slots for this course and current weekday
  const dayRawSlots = allSlots
    .filter(
      (s) =>
        (s.course === course || s.course === 'ALL') &&
        s.dayOfWeek.toLowerCase() === timeContext.dayOfWeek.toLowerCase()
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (dayRawSlots.length === 0) {
    return {
      course,
      courseName,
      status: 'NO_LECTURE_SCHEDULED_TODAY',
      statusLabel: 'No Lecture Scheduled Today',
      currentSlot: null,
      nextSlot: null,
      override: null,
      dayOfWeek: timeContext.dayOfWeek,
      currentTimeStr: timeContext.displayTime,
    };
  }

  // Merge contiguous slots of the same module into unified blocks
  const daySlots = mergeTimetableSlots(dayRawSlots);
  const nowMin = timeContext.minutesNow;

  let currentSlot: MergedTimetableSlot | null = null;
  let nextRealAcademicSlot: MergedTimetableSlot | null = null;

  for (let i = 0; i < daySlots.length; i++) {
    const s = daySlots[i];
    const startMin = parseTimeToMinutes(s.startTime);
    const endMin = parseTimeToMinutes(s.endTime);

    if (nowMin >= startMin && nowMin < endMin) {
      currentSlot = s;
    } else if (nowMin < startMin) {
      if (!nextRealAcademicSlot && isAcademicLecture(s)) {
        nextRealAcademicSlot = s;
      }
    }
  }

  // If no upcoming real academic slot was found after currentSlot, search remaining daySlots
  if (!nextRealAcademicSlot && currentSlot) {
    const currentIdx = daySlots.indexOf(currentSlot);
    for (let j = currentIdx + 1; j < daySlots.length; j++) {
      if (isAcademicLecture(daySlots[j])) {
        nextRealAcademicSlot = daySlots[j];
        break;
      }
    }
  }

  // Check overrides for today and this course/slot using comprehensive matcher
  const activeOverride =
    (currentSlot ? findMatchingOverride(currentSlot, overrides, timeContext.dateStr, course) : null) ||
    overrides.find(
      (o) =>
        (o.course === course || o.course === 'ALL') &&
        (o.action === 'holiday' ||
          (!o.slotId &&
            (normalizeSubject(o.subject).includes('postpone') ||
              normalizeSubject(o.subject).includes('cancel') ||
              normalizeSubject(o.subject).includes('all'))))
    );

  if (activeOverride) {
    if (activeOverride.action === 'cancel') {
      return {
        course,
        courseName,
        status: 'CANCELLED',
        statusLabel: `Cancelled: ${activeOverride.subject}`,
        currentSlot: currentSlot || null,
        nextSlot: nextRealAcademicSlot,
        override: activeOverride,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }
    if (activeOverride.action === 'holiday') {
      return {
        course,
        courseName,
        status: 'STANDBY',
        statusLabel: `Holiday: ${activeOverride.subject || 'Academic Recess'}`,
        currentSlot: null,
        nextSlot: null,
        override: activeOverride,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }
    if (activeOverride.action === 'postpone') {
      return {
        course,
        courseName,
        status: 'POSTPONED',
        statusLabel: `Postponed: ${activeOverride.subject}`,
        currentSlot: currentSlot || null,
        nextSlot: nextRealAcademicSlot,
        override: activeOverride,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }
  }

  if (currentSlot) {
    // 1. Practical / Study Period / Empty Slot: NEVER mark as LECTURE_ONGOING or turn green
    if (isStudyOrEmptySlot(currentSlot)) {
      if (nextRealAcademicSlot) {
        return {
          course,
          courseName,
          status: 'UPCOMING_LECTURE',
          statusLabel: `Self-Study Period · Next: ${nextRealAcademicSlot.subject} at ${nextRealAcademicSlot.startTime}`,
          currentSlot: null,
          nextSlot: nextRealAcademicSlot,
          override: null,
          dayOfWeek: timeContext.dayOfWeek,
          currentTimeStr: timeContext.displayTime,
        };
      }
      return {
        course,
        courseName,
        status: 'STANDBY',
        statusLabel: 'Self-Study Period · No further lectures scheduled today',
        currentSlot: null,
        nextSlot: null,
        override: null,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }

    // 2. Break
    if (currentSlot.slotType === 'break') {
      return {
        course,
        courseName,
        status: 'BREAK',
        statusLabel: nextRealAcademicSlot
          ? `Short Break · Next: ${nextRealAcademicSlot.subject} at ${nextRealAcademicSlot.startTime}`
          : 'Short Break Interval',
        currentSlot,
        nextSlot: nextRealAcademicSlot,
        override: null,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }

    // 3. Lunch Break
    if (currentSlot.slotType === 'lunch') {
      return {
        course,
        courseName,
        status: 'LUNCH_BREAK',
        statusLabel: nextRealAcademicSlot
          ? `Lunch Break · Next: ${nextRealAcademicSlot.subject} at ${nextRealAcademicSlot.startTime}`
          : 'Lunch Break Interval',
        currentSlot,
        nextSlot: nextRealAcademicSlot,
        override: null,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }

    // 4. Real Academic Lecture Ongoing
    if (isAcademicLecture(currentSlot)) {
      // Check if current minute is within an internal break of this merged lecture
      const activeBreak = currentSlot.breaksIncluded.find((b) => {
        const bStart = parseTimeToMinutes(b.startTime);
        const bEnd = parseTimeToMinutes(b.endTime);
        return nowMin >= bStart && nowMin < bEnd;
      });

      return {
        course,
        courseName,
        status: 'LECTURE_ONGOING',
        statusLabel: activeBreak
          ? `${currentSlot.subject} · In-Class Break (Resumes ${activeBreak.endTime})`
          : 'Live Session in Progress',
        currentSlot,
        nextSlot: nextRealAcademicSlot,
        override: null,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }
  }

  // If no slot is current, but an upcoming lecture exists today
  if (nextRealAcademicSlot) {
    return {
      course,
      courseName,
      status: 'UPCOMING_LECTURE',
      statusLabel: `Upcoming: ${nextRealAcademicSlot.subject} at ${nextRealAcademicSlot.startTime}`,
      currentSlot: null,
      nextSlot: nextRealAcademicSlot,
      override: null,
      dayOfWeek: timeContext.dayOfWeek,
      currentTimeStr: timeContext.displayTime,
    };
  }

  return {
    course,
    courseName,
    status: 'STANDBY',
    statusLabel: 'Lectures Concluded For Today',
    currentSlot: null,
    nextSlot: null,
    override: null,
    dayOfWeek: timeContext.dayOfWeek,
    currentTimeStr: timeContext.displayTime,
  };
}
