export type CourseType = 'TPOPT' | 'TPRPT';
export type CourseScope = 'TPOPT' | 'TPRPT' | 'ALL' | 'COMMON';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Student {
  id: string;
  fullName: string;
  studentNumber: string; // e.g. RT/TPOPT/26/02
  indexSuffix: string;   // e.g. "02"
  course: CourseType;
  isActive: boolean;
  isRepresentative?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicModule {
  id: string;
  code: string;
  title: string;
  courseScope: CourseScope;
  stage?: string; // "Foundation", "NVQ Level 5", etc.
  sortOrder?: number;
  isActive: boolean;
}

export interface TimetableSlot {
  id: string;
  course: CourseScope;
  dayOfWeek: DayOfWeek;
  startTime: string; // "08:30"
  endTime: string;   // "09:30"
  timeLabel?: string;
  subject: string;
  moduleCode?: string;
  studentGroup?: string;
  slotType: 'class' | 'break' | 'lunch' | 'empty';
  sortOrder: number;
}

export interface TimetableOverride {
  id: string;
  course: CourseScope;
  dayOfWeek?: DayOfWeek;
  date: string; // YYYY-MM-DD
  slotId?: string;
  action: 'cancel' | 'postpone' | 'reschedule' | 'holiday';
  subject: string;
  reason?: string;
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
  updatedBy?: string;
  createdAt: string;
}

export type CheckinSessionStatus = 'draft' | 'active' | 'closed' | 'expired' | 'finalized';
export type SessionOperationalStatus = 'scheduled' | 'active' | 'cancelled' | 'postponed' | 'completed';

export interface CheckinSession {
  id: string;
  course: CourseScope; // TPOPT, TPRPT, or ALL (COMMON)
  moduleId: string;
  moduleCode: string;
  moduleTitle: string;
  sessionType: 'lecture' | 'practical' | 'workshop' | 'other';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  checkinStatus: CheckinSessionStatus;
  sessionStatus: SessionOperationalStatus;
  checkinWindowMinutes: number; // 15, 30, 60, 120
  checkinOpenedAt?: string;
  checkinExpiresAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'pending';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  course: CourseType;
  status: AttendanceStatus;
  submissionSource: 'self_checkin' | 'admin_manual' | 'finalized';
  markedAt: string;
  markedBy?: string;
  excuseReason?: string;
}

export interface AttendanceCheckin {
  id: string;
  sessionId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  course: CourseType;
  status: 'submitted' | 'confirmed';
  timestamp: string;
  deviceFingerprint?: string;
}

export interface Invitation {
  id: string;
  studentId: string;
  studentNumber: string;
  course: CourseType;
  tokenHash: string;
  tokenClear?: string; // Visible only to admin on generation
  isRedeemed: boolean;
  redeemedBy?: string;
  redeemedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  role: 'student' | 'admin' | 'representative';
  studentId?: string;
  studentNumber?: string;
  course?: CourseType;
  fullName: string;
  email?: string;
  passwordHash?: string;
  isActive: boolean;
  isRepresentative?: boolean;
  createdAt: string;
}
