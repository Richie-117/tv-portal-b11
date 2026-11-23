import fs from 'fs';
import path from 'path';
import {
  Student,
  AcademicModule,
  TimetableSlot,
  TimetableOverride,
  CheckinSession,
  AttendanceRecord,
  AttendanceCheckin,
  Invitation,
  UserAccount,
  CourseType,
  CourseScope,
} from '@/types';
import { isSupabaseConfigured, getSupabaseAdmin } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseState {
  courses: Array<{ id: string; name: string }>;
  students: Student[];
  modules: AcademicModule[];
  timetableEntries: TimetableSlot[];
  lectureOverrides: TimetableOverride[];
  checkinSessions: CheckinSession[];
  attendanceRecords: AttendanceRecord[];
  attendanceCheckins: AttendanceCheckin[];
  invitations: Invitation[];
  users: UserAccount[];
}

let memoryCache: DatabaseState | null = null;
let writeQueue: Promise<any> = Promise.resolve();

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const emptyState: DatabaseState = {
      courses: [
        { id: 'TPOPT', name: 'Television & Digital Media Post-Production Technology' },
        { id: 'TPRPT', name: 'Television & Digital Media Production Technology' },
        { id: 'COMMON', name: 'Common Foundation & Media Studies' }
      ],
      students: [],
      modules: [],
      timetableEntries: [],
      lectureOverrides: [],
      checkinSessions: [],
      attendanceRecords: [],
      attendanceCheckins: [],
      invitations: [],
      users: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyState, null, 2), 'utf8');
  }
}

export async function getLocalDatabase(): Promise<DatabaseState> {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    memoryCache = parsed;
    return parsed;
  } catch (err) {
    if (memoryCache) return memoryCache;
    throw err;
  }
}

export async function saveLocalDatabase(updater: (state: DatabaseState) => void | DatabaseState): Promise<DatabaseState> {
  ensureDataFile();
  const nextTask: Promise<DatabaseState> = writeQueue.then(async () => {
    const current = await getLocalDatabase();
    const result = updater(current);
    const updated: DatabaseState = result || current;
    memoryCache = updated;
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  });
  writeQueue = nextTask.catch(() => {});
  return nextTask;
}

// =============================================================================
// Students
// =============================================================================

export async function getStudents(): Promise<Student[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('students').select('*').order('student_number');
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          studentNumber: r.student_number,
          indexSuffix: r.index_suffix,
          fullName: r.full_name,
          course: r.course,
          isActive: r.is_active,
          isRepresentative: r.is_representative,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {}
  }
  const db = await getLocalDatabase();
  return db.students || [];
}

export async function findStudentByCourseAndSuffix(
  course: CourseType,
  suffix: string
): Promise<Student | null> {
  const cleanSuffix = String(suffix).replace(/\D/g, '').padStart(2, '0');
  const all = await getStudents();
  return (
    all.find(
      (s) =>
        s.course === course &&
        (s.indexSuffix === cleanSuffix || s.studentNumber.endsWith(`/${cleanSuffix}`))
    ) || null
  );
}

// =============================================================================
// Modules
// =============================================================================

export async function getModules(): Promise<AcademicModule[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('academic_modules').select('*').order('sort_order');
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          code: r.code,
          title: r.title,
          courseScope: r.course_scope,
          stage: r.stage,
          sortOrder: r.sort_order,
          isActive: r.is_active,
        }));
      }
    } catch {}
  }
  const db = await getLocalDatabase();
  return db.modules || [];
}

export async function saveAcademicModule(mod: AcademicModule): Promise<AcademicModule> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('academic_modules').upsert({
        id: mod.id,
        code: mod.code,
        title: mod.title,
        course_scope: mod.courseScope,
        stage: mod.stage || 'Foundation',
        sort_order: mod.sortOrder || 0,
        is_active: mod.isActive ?? true,
      });
    } catch {}
  }
  await saveLocalDatabase((db) => {
    const idx = (db.modules || []).findIndex((m) => m.id === mod.id);
    if (idx >= 0) db.modules[idx] = mod;
    else {
      if (!db.modules) db.modules = [];
      db.modules.push(mod);
    }
  });
  return mod;
}

export async function deleteAcademicModule(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('academic_modules').delete().eq('id', id);
    } catch {}
  }
  await saveLocalDatabase((db) => {
    db.modules = (db.modules || []).filter((m) => m.id !== id);
  });
  return true;
}

// =============================================================================
// Timetable & Overrides
// =============================================================================

export async function getTimetableEntries(course?: CourseScope): Promise<TimetableSlot[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      let query = supabase.from('timetable_entries').select('*').order('sort_order');
      if (course && course !== 'ALL') {
        query = query.in('course', [course, 'ALL']);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          course: r.course,
          dayOfWeek: r.day_of_week,
          startTime: r.start_time,
          endTime: r.end_time,
          subject: r.subject,
          moduleCode: r.module_code,
          studentGroup: r.student_group,
          slotType: r.slot_type,
          sortOrder: r.sort_order,
        }));
      }
    } catch {}
  }
  const db = await getLocalDatabase();
  let list = db.timetableEntries || [];
  if (course && course !== 'ALL') {
    list = list.filter((t) => t.course === course || t.course === 'ALL');
  }
  return list;
}

export async function saveTimetableEntry(entry: TimetableSlot): Promise<TimetableSlot> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('timetable_entries').upsert({
        id: entry.id,
        course: entry.course,
        day_of_week: entry.dayOfWeek,
        start_time: entry.startTime,
        end_time: entry.endTime,
        subject: entry.subject,
        module_code: entry.moduleCode,
        student_group: entry.studentGroup,
        slot_type: entry.slotType,
        sort_order: entry.sortOrder,
      });
    } catch {}
  }
  await saveLocalDatabase((db) => {
    const idx = db.timetableEntries.findIndex((t) => t.id === entry.id);
    if (idx >= 0) {
      db.timetableEntries[idx] = entry;
    } else {
      db.timetableEntries.push(entry);
    }
  });
  return entry;
}

export async function deleteTimetableEntry(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('timetable_entries').delete().eq('id', id);
    } catch {}
  }
  await saveLocalDatabase((db) => {
    db.timetableEntries = db.timetableEntries.filter((t) => t.id !== id);
  });
  return true;
}

export async function getLectureOverrides(date?: string): Promise<TimetableOverride[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      let query = supabase.from('lecture_overrides').select('*');
      if (date) query = query.eq('date', date);
      const { data, error } = await query;
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          course: r.course,
          date: r.date,
          slotId: r.slot_id,
          action: r.action,
          subject: r.subject,
          reason: r.reason,
          newDate: r.new_date,
          newStartTime: r.new_start_time,
          newEndTime: r.new_end_time,
          updatedBy: r.updated_by,
          createdAt: r.created_at,
        }));
      }
    } catch {}
  }
  const db = await getLocalDatabase();
  let list = db.lectureOverrides || [];
  if (date) list = list.filter((o) => o.date === date);
  return list;
}

export async function saveLectureOverride(override: TimetableOverride): Promise<TimetableOverride> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('lecture_overrides').upsert({
        id: override.id,
        course: override.course,
        date: override.date,
        slot_id: override.slotId,
        action: override.action,
        subject: override.subject,
        reason: override.reason,
        new_date: override.newDate,
        new_start_time: override.newStartTime,
        new_end_time: override.newEndTime,
        updated_by: override.updatedBy,
        created_at: override.createdAt,
      });
    } catch {}
  }
  await saveLocalDatabase((db) => {
    const idx = db.lectureOverrides.findIndex((o) => o.id === override.id);
    if (idx >= 0) db.lectureOverrides[idx] = override;
    else db.lectureOverrides.push(override);
  });
  return override;
}

export async function deleteLectureOverride(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('lecture_overrides').delete().eq('id', id);
    } catch {}
  }
  await saveLocalDatabase((db) => {
    db.lectureOverrides = (db.lectureOverrides || []).filter((o) => o.id !== id);
  });
  return true;
}

// =============================================================================
// Check-in Broadcast Sessions
// =============================================================================

export async function getCheckinSessions(): Promise<CheckinSession[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('checkin_sessions').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map((r: any) => ({
          id: r.id,
          course: r.course,
          moduleId: r.module_id,
          moduleCode: r.module_code,
          moduleTitle: r.module_title,
          sessionType: r.session_type,
          date: r.date,
          startTime: r.start_time,
          endTime: r.end_time,
          checkinStatus: r.checkin_status,
          sessionStatus: r.session_status,
          checkinWindowMinutes: r.checkin_window_minutes,
          checkinOpenedAt: r.checkin_opened_at,
          checkinExpiresAt: r.checkin_expires_at,
          notes: r.notes,
          createdBy: r.created_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        // Synchronize local database to prevent stale orphaned deleted sessions
        saveLocalDatabase((db) => {
          db.checkinSessions = mapped;
        }).catch(() => {});
        return mapped;
      }
    } catch {}
  }
  const db = await getLocalDatabase();
  const rawSessions: CheckinSession[] = db.checkinSessions || [];
  const seen = new Set<string>();
  const uniqueSessions: CheckinSession[] = [];
  for (const s of rawSessions) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      uniqueSessions.push(s);
    }
  }
  return uniqueSessions;
}

export async function getCheckinSessionById(id: string): Promise<CheckinSession | null> {
  const all = await getCheckinSessions();
  return all.find((s) => s.id === id) || null;
}

export async function createCheckinSession(session: CheckinSession): Promise<CheckinSession> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('checkin_sessions').insert({
        id: session.id,
        course: session.course,
        module_id: session.moduleId,
        module_code: session.moduleCode,
        module_title: session.moduleTitle,
        session_type: session.sessionType,
        date: session.date,
        start_time: session.startTime,
        end_time: session.endTime,
        checkin_status: session.checkinStatus,
        session_status: session.sessionStatus,
        checkin_window_minutes: session.checkinWindowMinutes,
        checkin_opened_at: session.checkinOpenedAt,
        checkin_expires_at: session.checkinExpiresAt,
        notes: session.notes,
        created_by: session.createdBy,
        created_at: session.createdAt,
      });
    } catch {}
  }
  await saveLocalDatabase((db) => {
    const existingIdx = (db.checkinSessions || []).findIndex(
      (s) =>
        s.id === session.id ||
        (s.date === session.date &&
          s.course === session.course &&
          s.moduleId === session.moduleId &&
          s.startTime === session.startTime)
    );
    if (existingIdx >= 0) {
      db.checkinSessions[existingIdx] = session;
    } else {
      db.checkinSessions.unshift(session);
    }
  });
  return session;
}

export async function updateCheckinSessionStatus(
  id: string,
  checkinStatus: CheckinSession['checkinStatus'],
  sessionStatus?: CheckinSession['sessionStatus']
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const updateData: any = { checkin_status: checkinStatus, updated_at: new Date().toISOString() };
      if (sessionStatus) updateData.session_status = sessionStatus;
      await supabase.from('checkin_sessions').update(updateData).eq('id', id);
    } catch {}
  }
  await saveLocalDatabase((db) => {
    const sess = db.checkinSessions.find((s) => s.id === id);
    if (sess) {
      sess.checkinStatus = checkinStatus;
      if (sessionStatus) sess.sessionStatus = sessionStatus;
      sess.updatedAt = new Date().toISOString();
    }
  });
  return true;
}

export async function deleteCheckinSession(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('attendance_checkins').delete().eq('session_id', id);
      await supabase.from('attendance_records').delete().eq('session_id', id);
      await supabase.from('checkin_sessions').delete().eq('id', id);
    } catch {}
  }
  await saveLocalDatabase((db) => {
    db.checkinSessions = (db.checkinSessions || []).filter((s) => s.id !== id);
    db.attendanceRecords = (db.attendanceRecords || []).filter((r) => r.sessionId !== id);
    db.attendanceCheckins = (db.attendanceCheckins || []).filter((c) => c.sessionId !== id);
  });
  return true;
}

export async function deleteAllCheckinSessions(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('attendance_checkins').delete().neq('id', 'placeholder');
      await supabase.from('attendance_records').delete().neq('id', 'placeholder');
      await supabase.from('checkin_sessions').delete().neq('id', 'placeholder');
    } catch {}
  }
  await saveLocalDatabase((db) => {
    db.checkinSessions = [];
    db.attendanceRecords = [];
    db.attendanceCheckins = [];
  });
  return true;
}

// =============================================================================
// Attendance Submissions & Records
// =============================================================================

export async function getAttendanceCheckins(sessionId: string): Promise<AttendanceCheckin[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('attendance_checkins').select('*').eq('session_id', sessionId);
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          sessionId: r.session_id,
          studentId: r.student_id,
          studentNumber: r.student_number,
          studentName: r.student_name,
          course: r.course,
          status: r.status,
          timestamp: r.timestamp,
          deviceFingerprint: r.device_fingerprint,
        }));
      }
    } catch {}
  }
  const db = await getLocalDatabase();
  return (db.attendanceCheckins || []).filter((c) => c.sessionId === sessionId);
}

export async function getAttendanceRecords(sessionId?: string): Promise<AttendanceRecord[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      let query = supabase.from('attendance_records').select('*');
      if (sessionId) query = query.eq('session_id', sessionId);
      const { data, error } = await query;
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          sessionId: r.session_id,
          studentId: r.student_id,
          studentNumber: r.student_number,
          studentName: r.student_name,
          course: r.course,
          status: r.status,
          submissionSource: r.submission_source,
          markedAt: r.marked_at,
          markedBy: r.marked_by,
          excuseReason: r.excuse_reason,
        }));
      }
    } catch {}
  }
  const db = await getLocalDatabase();
  if (sessionId) return (db.attendanceRecords || []).filter((r) => r.sessionId === sessionId);
  return db.attendanceRecords || [];
}

/**
 * Atomic Check-In Submission:
 * Enforces:
 * 1. Window expiration check
 * 2. Uniqueness check (session_id, student_id)
 * 3. Simultaneous write to checkins and records as 'present'
 */
export async function submitStudentCheckin(params: {
  sessionId: string;
  student: Student;
  deviceFingerprint?: string;
}): Promise<{ success: boolean; alreadyCheckedIn?: boolean; error?: string; record?: AttendanceRecord }> {
  const session = await getCheckinSessionById(params.sessionId);
  if (!session) return { success: false, error: 'Session not found' };

  if (session.checkinStatus !== 'active') {
    return { success: false, error: 'Check-in window is currently closed.' };
  }

  if (session.checkinExpiresAt && new Date() > new Date(session.checkinExpiresAt)) {
    // Window expired
    await updateCheckinSessionStatus(session.id, 'expired');
    return { success: false, error: 'Check-in window has expired.' };
  }

  // Course validation
  if (session.course !== 'ALL' && session.course !== params.student.course) {
    return {
      success: false,
      error: `This lecture session is restricted to ${session.course} cohort.`,
    };
  }

  // Check duplicate
  const existingRecords = await getAttendanceRecords(session.id);
  const alreadyPresent = existingRecords.some(
    (r) =>
      r.studentId === params.student.id ||
      r.studentNumber.toUpperCase() === params.student.studentNumber.toUpperCase()
  );

  if (alreadyPresent) {
    return {
      success: false,
      alreadyCheckedIn: true,
      error: `Already Recorded: ${params.student.fullName} (${params.student.studentNumber}) is already marked Present for this session.`,
    };
  }

  const recordId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const checkinId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowStr = new Date().toISOString();

  const record: AttendanceRecord = {
    id: recordId,
    sessionId: session.id,
    studentId: params.student.id,
    studentNumber: params.student.studentNumber,
    studentName: params.student.fullName,
    course: params.student.course,
    status: 'present',
    submissionSource: 'self_checkin',
    markedAt: nowStr,
  };

  const checkin: AttendanceCheckin = {
    id: checkinId,
    sessionId: session.id,
    studentId: params.student.id,
    studentNumber: params.student.studentNumber,
    studentName: params.student.fullName,
    course: params.student.course,
    status: 'confirmed',
    timestamp: nowStr,
    deviceFingerprint: params.deviceFingerprint,
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await Promise.all([
        supabase.from('attendance_records').insert({
          id: record.id,
          session_id: record.sessionId,
          student_id: record.studentId,
          student_number: record.studentNumber,
          student_name: record.studentName,
          course: record.course,
          status: record.status,
          submission_source: record.submissionSource,
          marked_at: record.markedAt,
        }),
        supabase.from('attendance_checkins').insert({
          id: checkin.id,
          session_id: checkin.sessionId,
          student_id: checkin.studentId,
          student_number: checkin.studentNumber,
          student_name: checkin.studentName,
          course: checkin.course,
          status: checkin.status,
          timestamp: checkin.timestamp,
          device_fingerprint: checkin.deviceFingerprint,
        }),
      ]);
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          success: false,
          alreadyCheckedIn: true,
          error: `Already Recorded: ${params.student.fullName} is already marked Present.`,
        };
      }
    }
  }

  await saveLocalDatabase((db) => {
    db.attendanceRecords.push(record);
    db.attendanceCheckins.push(checkin);
  });

  return { success: true, record };
}

export async function saveOrUpdateAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('attendance_records').upsert({
        id: record.id,
        session_id: record.sessionId,
        student_id: record.studentId,
        student_number: record.studentNumber,
        student_name: record.studentName,
        course: record.course,
        status: record.status,
        submission_source: record.submissionSource,
        marked_at: record.markedAt,
        marked_by: record.markedBy,
        excuse_reason: record.excuseReason,
      });
    } catch {}
  }
  await saveLocalDatabase((db) => {
    const idx = db.attendanceRecords.findIndex(
      (r) => r.sessionId === record.sessionId && r.studentId === record.studentId
    );
    if (idx >= 0) db.attendanceRecords[idx] = record;
    else db.attendanceRecords.push(record);
  });
  return record;
}

/**
 * Finalize Attendance Rule:
 * Converts all eligible unmarked/pending students for this session into 'absent'.
 * Does not alter existing 'present' or 'excused' records.
 */
export async function finalizeSessionAttendance(
  sessionId: string,
  adminName: string = 'Administrator'
): Promise<{ affectedCount: number }> {
  const session = await getCheckinSessionById(sessionId);
  if (!session) throw new Error('Session not found');

  const allStudents = await getStudents();
  const eligibleStudents = allStudents.filter(
    (s) => session.course === 'ALL' || s.course === session.course
  );

  const existingRecords = await getAttendanceRecords(sessionId);
  const recordedStudentIds = new Set(existingRecords.map((r) => r.studentId));

  const missingStudents = eligibleStudents.filter((s) => !recordedStudentIds.has(s.id));
  const nowStr = new Date().toISOString();

  const newAbsentRecords: AttendanceRecord[] = missingStudents.map((s) => ({
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId,
    studentId: s.id,
    studentNumber: s.studentNumber,
    studentName: s.fullName,
    course: s.course,
    status: 'absent',
    submissionSource: 'finalized',
    markedAt: nowStr,
    markedBy: adminName,
  }));

  const supabase = getSupabaseAdmin();
  if (supabase && newAbsentRecords.length > 0) {
    try {
      await supabase.from('attendance_records').insert(
        newAbsentRecords.map((r) => ({
          id: r.id,
          session_id: r.sessionId,
          student_id: r.studentId,
          student_number: r.studentNumber,
          student_name: r.studentName,
          course: r.course,
          status: r.status,
          submission_source: r.submissionSource,
          marked_at: r.markedAt,
          marked_by: r.markedBy,
        }))
      );
    } catch {}
  }

  await updateCheckinSessionStatus(sessionId, 'finalized', 'completed');

  await saveLocalDatabase((db) => {
    newAbsentRecords.forEach((r) => db.attendanceRecords.push(r));
  });

  return { affectedCount: newAbsentRecords.length };
}

// =============================================================================
// Invitations & Users
// =============================================================================

export async function getInvitations(): Promise<Invitation[]> {
  const db = await getLocalDatabase();
  return db.invitations || [];
}

export async function createInvitation(invitation: Invitation): Promise<Invitation> {
  await saveLocalDatabase((db) => {
    db.invitations.unshift(invitation);
  });
  return invitation;
}

export async function findInvitationByHash(tokenHash: string): Promise<Invitation | null> {
  const db = await getLocalDatabase();
  return db.invitations.find((inv) => inv.tokenHash === tokenHash && !inv.isRedeemed) || null;
}

export async function markInvitationRedeemed(id: string, redeemedBy: string): Promise<boolean> {
  await saveLocalDatabase((db) => {
    const inv = db.invitations.find((i) => i.id === id);
    if (inv) {
      inv.isRedeemed = true;
      inv.redeemedBy = redeemedBy;
      inv.redeemedAt = new Date().toISOString();
    }
  });
  return true;
}

export async function getUserByUsername(username: string): Promise<UserAccount | null> {
  const db = await getLocalDatabase();
  return (
    db.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.isActive
    ) || null
  );
}

export async function getUserById(id: string): Promise<UserAccount | null> {
  const db = await getLocalDatabase();
  return db.users.find((u) => u.id === id && u.isActive) || null;
}

export async function createUserAccount(account: UserAccount): Promise<UserAccount> {
  await saveLocalDatabase((db) => {
    db.users.push(account);
  });
  return account;
}

export async function revokeUserAccount(studentIdOrStudentNumber: string): Promise<boolean> {
  const clean = studentIdOrStudentNumber.trim().toUpperCase();
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from('users').delete().or(`student_id.eq.${clean},student_number.eq.${clean}`);
      await supabase.from('invitations').update({ is_redeemed: false, redeemed_by: null, redeemed_at: null }).or(`student_id.eq.${clean},student_number.eq.${clean}`);
    } catch {}
  }
  await saveLocalDatabase((db) => {
    db.users = (db.users || []).filter(
      (u) =>
        u.studentId !== studentIdOrStudentNumber &&
        (u.studentNumber || '').toUpperCase() !== clean &&
        u.id !== studentIdOrStudentNumber
    );
    // Reset invite so student can be re-invited if needed
    (db.invitations || []).forEach((inv) => {
      if (inv.studentId === studentIdOrStudentNumber || inv.studentNumber.toUpperCase() === clean) {
        inv.isRedeemed = false;
        inv.redeemedBy = undefined;
        inv.redeemedAt = undefined;
      }
    });
  });
  return true;
}

export async function revokeInvitation(invitationIdOrStudentId: string): Promise<boolean> {
  const clean = invitationIdOrStudentId.trim();
  const cleanUpper = clean.toUpperCase();
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from('invitations')
        .delete()
        .or(`id.eq.${clean},student_id.eq.${clean},student_number.eq.${cleanUpper}`);
    } catch {}
  }
  await saveLocalDatabase((db) => {
    db.invitations = (db.invitations || []).filter(
      (inv) =>
        inv.id !== clean &&
        inv.studentId !== clean &&
        (inv.studentNumber || '').toUpperCase() !== cleanUpper &&
        (inv.tokenClear || '').toUpperCase() !== cleanUpper
    );
  });
  return true;
}
