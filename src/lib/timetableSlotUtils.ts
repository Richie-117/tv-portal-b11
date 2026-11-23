import { TimetableSlot, CourseScope, DayOfWeek, TimetableOverride } from '@/types';

export interface MergedTimetableSlot {
  id: string;
  slotIds: string[];
  course: CourseScope;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  timeLabel?: string;
  subject: string;
  studentGroup?: string;
  slotType: 'class' | 'break' | 'lunch' | 'empty';
  breaksIncluded: Array<{
    startTime: string;
    endTime: string;
    label: string;
  }>;
  isMerged: boolean;
  subSlotCount: number;
  rawSlots: TimetableSlot[];
}

export function normalizeSubject(s?: string | null): string {
  return (s || '').trim().toLowerCase();
}

/**
 * Checks whether a slot represents a practical or self-study / empty period,
 * rather than a formal academic lecture module.
 */
export function isStudyOrEmptySlot(
  slot?: { subject?: string | null; slotType?: string | null } | null
): boolean {
  if (!slot) return true;
  if (slot.slotType === 'empty') return true;
  const sub = normalizeSubject(slot.subject);
  if (!sub || sub === '' || sub === 'empty' || sub === 'empty slot') return true;
  if (sub.includes('study period') || sub.includes('practical / study') || sub.includes('self-study')) {
    return true;
  }
  return false;
}

/**
 * Checks whether a slot represents a real scheduled academic lecture module.
 */
export function isAcademicLecture(
  slot?: { subject?: string | null; slotType?: string | null } | null
): boolean {
  if (!slot) return false;
  if (isStudyOrEmptySlot(slot)) return false;
  if (slot.slotType === 'break' || slot.slotType === 'lunch') return false;
  const sub = normalizeSubject(slot.subject);
  if (sub === 'break' || sub === 'lunch' || sub === 'lunch break' || sub === 'interval') {
    return false;
  }
  return true;
}

/**
 * Converts HH:MM string to total minutes since midnight
 */
export function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Merges contiguous timetable slots and slots separated by short intervals (e.g. 10m breaks)
 * sharing the same subject, course, and student group into unified block sessions.
 */
export function mergeTimetableSlots(slots: TimetableSlot[]): MergedTimetableSlot[] {
  if (!slots || slots.length === 0) return [];

  // Sort chronologically by start time and sortOrder
  const sorted = [...slots].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.startTime);
    const bStart = parseTimeToMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  const result: MergedTimetableSlot[] = [];
  let i = 0;

  while (i < sorted.length) {
    const cur = sorted[i];
    const curStudyOrEmpty = isStudyOrEmptySlot(cur);
    const curLunch = cur.slotType === 'lunch';
    const curBreak = cur.slotType === 'break';
    const curCourse = cur.course;
    const curSubjectNorm = normalizeSubject(cur.subject);

    // Initial merged descriptor
    const merged: MergedTimetableSlot = {
      id: cur.id,
      slotIds: [cur.id],
      course: cur.course,
      dayOfWeek: cur.dayOfWeek,
      startTime: cur.startTime,
      endTime: cur.endTime,
      timeLabel: cur.timeLabel,
      subject: curStudyOrEmpty ? (cur.subject?.trim() || 'Practical / Study Period') : cur.subject,
      studentGroup: cur.studentGroup,
      slotType: curStudyOrEmpty ? 'empty' : (cur.slotType as any),
      breaksIncluded: [],
      isMerged: false,
      subSlotCount: 1,
      rawSlots: [cur],
    };

    // Lunch break is never merged into adjacent lectures
    if (curLunch) {
      result.push(merged);
      i++;
      continue;
    }

    let j = i + 1;
    while (j < sorted.length) {
      const next = sorted[j];
      const nextStudyOrEmpty = isStudyOrEmptySlot(next);
      const nextCourseMatch = next.course === curCourse || next.course === 'ALL' || curCourse === 'ALL';
      const nextSubjectNorm = normalizeSubject(next.subject);

      // Case 1: Directly adjacent consecutive slots with matching subject / empty state
      if (next.startTime === merged.endTime && nextCourseMatch) {
        if (curStudyOrEmpty && nextStudyOrEmpty) {
          merged.endTime = next.endTime;
          merged.slotIds.push(next.id);
          merged.rawSlots.push(next);
          merged.isMerged = true;
          merged.subSlotCount++;
          j++;
          continue;
        } else if (
          !curStudyOrEmpty &&
          !curBreak &&
          next.slotType !== 'lunch' &&
          next.slotType !== 'break' &&
          nextSubjectNorm === curSubjectNorm
        ) {
          merged.endTime = next.endTime;
          merged.slotIds.push(next.id);
          merged.rawSlots.push(next);
          merged.isMerged = true;
          merged.subSlotCount++;
          j++;
          continue;
        }
      }

      // Case 2: Academic lecture blocks separated by a short interval break (< 20 mins)
      // e.g. Gaffer 08:30-10:30, Break 10:30-10:40, Gaffer 10:40-12:40 -> 08:30-12:40 Gaffer
      if (
        !curStudyOrEmpty &&
        !curBreak &&
        next.slotType === 'break' &&
        next.startTime === merged.endTime &&
        j + 1 < sorted.length
      ) {
        const afterBreak = sorted[j + 1];
        const afterSubjectNorm = normalizeSubject(afterBreak.subject);
        const afterCourseMatch = afterBreak.course === curCourse || afterBreak.course === 'ALL' || curCourse === 'ALL';

        if (
          afterBreak.startTime === next.endTime &&
          afterCourseMatch &&
          afterSubjectNorm === curSubjectNorm
        ) {
          merged.breaksIncluded.push({
            startTime: next.startTime,
            endTime: next.endTime,
            label: next.subject || 'Break Interval',
          });
          merged.endTime = afterBreak.endTime;
          merged.slotIds.push(next.id, afterBreak.id);
          merged.rawSlots.push(next, afterBreak);
          merged.isMerged = true;
          merged.subSlotCount += 2;
          j += 2;
          continue;
        }
      }

      // If neither condition matches, this merged block ends here
      break;
    }

    result.push(merged);
    i = j;
  }

  return result;
}

/**
 * Returns a mapping of { Monday: 'YYYY-MM-DD', ... } for the current academic week in Asia/Colombo
 */
export function getCurrentWeekDates(baseDate: Date | string = new Date()): Record<DayOfWeek, string> {
  const dObj = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
  const colomboStr = dObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }); // YYYY-MM-DD
  const [y, m, d] = colomboStr.split('-').map(Number);
  const curDate = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = curDate.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(curDate);
  monday.setUTCDate(curDate.getUTCDate() + mondayOffset);

  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dates: Partial<Record<DayOfWeek, string>> = {};
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setUTCDate(monday.getUTCDate() + i);
    dates[days[i]] = dayDate.toISOString().split('T')[0];
  }
  return dates as Record<DayOfWeek, string>;
}

/**
 * Robust override matcher that links date-specific cancellations, postponements,
 * and holidays to timetable slots (handling multi-subject text, slot IDs, and day-wide overrides).
 */
export function findMatchingOverride(
  slot: { id?: string; slotIds?: string[]; subject?: string; course?: string; slotType?: string },
  overrides: TimetableOverride[],
  dateStr: string,
  courseScope: CourseScope
): TimetableOverride | null {
  if (!overrides || overrides.length === 0 || !dateStr) return null;

  // Filter overrides for this date and course
  const forDate = overrides.filter(
    (o) =>
      o.date === dateStr &&
      (o.course === 'ALL' || o.course === courseScope || courseScope === 'ALL')
  );

  if (forDate.length === 0) return null;

  const slotIds = slot.slotIds || (slot.id ? [slot.id] : []);

  // 1. Direct slotId match
  const bySlotId = forDate.find((o) => o.slotId && slotIds.includes(o.slotId));
  if (bySlotId) return bySlotId;

  // 2. Exact or partial subject match (e.g. "ENGLISH" matching "English and DM10", or "DM10" matching "English and DM10")
  const slotSubNorm = normalizeSubject(slot.subject);
  if (slotSubNorm && isAcademicLecture(slot)) {
    const bySubject = forDate.find((o) => {
      const ovrSubNorm = normalizeSubject(o.subject);
      if (!ovrSubNorm) return false;
      if (ovrSubNorm === slotSubNorm) return true;
      // Multi-module override (e.g. "English and DM10" cancels both English and DM10)
      if (ovrSubNorm.includes(slotSubNorm)) return true;
      if (slotSubNorm.includes(ovrSubNorm) && ovrSubNorm.length >= 3) return true;
      return false;
    });
    if (bySubject) return bySubject;
  }

  // 3. Whole-day override (holiday, cancel all, postpone all, or generic "Lectures Postponed")
  // Only applies to academic lecture slots (lunch and breaks maintain their structural nature)
  if (isAcademicLecture(slot)) {
    const wholeDayOverride = forDate.find((o) => {
      if (o.action === 'holiday') return true;
      if (!o.slotId) {
        const ovrSubNorm = normalizeSubject(o.subject);
        if (
          !ovrSubNorm ||
          ovrSubNorm.includes('postpone') ||
          ovrSubNorm.includes('cancel') ||
          ovrSubNorm.includes('holiday') ||
          ovrSubNorm.includes('all') ||
          ovrSubNorm === 'all lectures'
        ) {
          return true;
        }
      }
      return false;
    });
    if (wholeDayOverride) return wholeDayOverride;
  }

  return null;
}

