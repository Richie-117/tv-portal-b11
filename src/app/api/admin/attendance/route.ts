import { NextRequest, NextResponse } from 'next/server';
import {
  getCheckinSessionById,
  getAttendanceRecords,
  getStudents,
  saveOrUpdateAttendanceRecordsBatch,
} from '@/lib/db';
import { AttendanceRecord, AttendanceStatus } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      const records = await getAttendanceRecords();
      return NextResponse.json({ success: true, records });
    }

    const session = await getCheckinSessionById(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const allStudents = await getStudents();
    const eligibleStudents = allStudents.filter(
      (s) => session.course === 'ALL' || s.course === session.course
    );

    const records = await getAttendanceRecords(sessionId);
    const recordsMap: Record<string, AttendanceRecord> = {};
    records.forEach((r) => {
      recordsMap[r.studentId] = r;
    });

    const roster = eligibleStudents.map((s) => {
      const rec = recordsMap[s.id];
      return {
        studentId: s.id,
        studentNumber: s.studentNumber,
        indexSuffix: s.indexSuffix,
        fullName: s.fullName,
        course: s.course,
        status: rec ? rec.status : 'pending',
        recordId: rec ? rec.id : null,
        excuseReason: rec ? rec.excuseReason : null,
        submissionSource: rec ? rec.submissionSource : null,
      };
    });

    return NextResponse.json({
      success: true,
      session,
      roster,
      summary: {
        totalEligible: eligibleStudents.length,
        present: records.filter((r) => r.status === 'present').length,
        absent: records.filter((r) => r.status === 'absent').length,
        excused: records.filter((r) => r.status === 'excused').length,
        pending: eligibleStudents.length - records.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, studentId, status, excuseReason, adminName, updates } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing required sessionId parameter' }, { status: 400 });
    }

    const items: Array<{ studentId: string; status: AttendanceStatus; excuseReason?: string }> = Array.isArray(updates)
      ? updates
      : studentId && status
      ? [{ studentId, status, excuseReason }]
      : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'Missing attendance update parameters' }, { status: 400 });
    }

    const [allStudents, existingRecords] = await Promise.all([
      getStudents(),
      getAttendanceRecords(sessionId),
    ]);

    const studentMap = new Map(allStudents.map((s) => [s.id, s]));
    const existingMap = new Map(existingRecords.map((r) => [r.studentId, r]));
    const nowIso = new Date().toISOString();
    const recordsToSave: AttendanceRecord[] = [];

    for (const item of items) {
      const targetStudent = studentMap.get(item.studentId);
      if (!targetStudent) {
        return NextResponse.json({ error: `Student not found: ${item.studentId}` }, { status: 404 });
      }
      const existing = existingMap.get(item.studentId);
      const trimmedReason = item.excuseReason ? String(item.excuseReason).trim() : undefined;

      recordsToSave.push({
        id: existing ? existing.id : `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sessionId,
        studentId: targetStudent.id,
        studentNumber: targetStudent.studentNumber,
        studentName: targetStudent.fullName,
        course: targetStudent.course,
        status: item.status,
        submissionSource: 'admin_manual',
        markedAt: nowIso,
        markedBy: adminName || 'Admin',
        excuseReason: trimmedReason || undefined,
      });
    }

    const saved = await saveOrUpdateAttendanceRecordsBatch(recordsToSave);
    return NextResponse.json({
      success: true,
      record: saved.length === 1 ? saved[0] : undefined,
      records: saved,
      updatedCount: saved.length,
    });
  } catch (err: any) {
    console.error('Admin attendance POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update record' }, { status: 500 });
  }
}

