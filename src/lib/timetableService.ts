import {
  TimetableSlot,
  TimetableOverride,
  CourseType,
  CourseScope,
} from '@/types';
import { getTimetableEntries, getLectureOverrides } from './db';
import { getSriLankaDateTime, parseTimeToMinutes, SriLankaTimeContext } from './time';

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
  currentSlot: TimetableSlot | null;
  nextSlot: TimetableSlot | null;
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
  const daySlots = allSlots
    .filter(
      (s) =>
        (s.course === course || s.course === 'ALL') &&
        s.dayOfWeek.toLowerCase() === timeContext.dayOfWeek.toLowerCase()
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (daySlots.length === 0) {
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

  const nowMin = timeContext.minutesNow;

  let currentSlot: TimetableSlot | null = null;
  let nextSlot: TimetableSlot | null = null;

  for (let i = 0; i < daySlots.length; i++) {
    const s = daySlots[i];
    const startMin = parseTimeToMinutes(s.startTime);
    const endMin = parseTimeToMinutes(s.endTime);

    if (nowMin >= startMin && nowMin < endMin) {
      currentSlot = s;
      nextSlot = daySlots[i + 1] || null;
      break;
    } else if (nowMin < startMin) {
      if (!nextSlot) nextSlot = s;
    }
  }

  // Check overrides for today and this course/slot
  const activeOverride = overrides.find(
    (o) =>
      (o.course === course || o.course === 'ALL') &&
      (!o.slotId ||
        (currentSlot && o.slotId === currentSlot.id) ||
        (currentSlot && currentSlot.subject && o.subject && o.subject.toLowerCase() === currentSlot.subject.toLowerCase()))
  );

  if (activeOverride) {
    if (activeOverride.action === 'cancel') {
      return {
        course,
        courseName,
        status: 'CANCELLED',
        statusLabel: `Cancelled: ${activeOverride.subject}`,
        currentSlot: currentSlot || null,
        nextSlot,
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
        nextSlot,
        override: activeOverride,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }
  }

  if (currentSlot) {
    if (currentSlot.slotType === 'break') {
      return {
        course,
        courseName,
        status: 'BREAK',
        statusLabel: 'Short Break Interval',
        currentSlot,
        nextSlot,
        override: null,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }
    if (currentSlot.slotType === 'lunch') {
      return {
        course,
        courseName,
        status: 'LUNCH_BREAK',
        statusLabel: 'Lunch Break Interval',
        currentSlot,
        nextSlot,
        override: null,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }
    if (currentSlot.subject && currentSlot.slotType === 'class') {
      return {
        course,
        courseName,
        status: 'LECTURE_ONGOING',
        statusLabel: 'Live Session in Progress',
        currentSlot,
        nextSlot,
        override: null,
        dayOfWeek: timeContext.dayOfWeek,
        currentTimeStr: timeContext.displayTime,
      };
    }
  }

  if (nextSlot) {
    return {
      course,
      courseName,
      status: 'UPCOMING_LECTURE',
      statusLabel: `Upcoming at ${nextSlot.startTime}`,
      currentSlot: null,
      nextSlot,
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

