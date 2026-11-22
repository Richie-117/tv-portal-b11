import { NextRequest, NextResponse } from 'next/server';
import {
  getCheckinSessionById,
  getAttendanceRecords,
  getStudents,
  saveOrUpdateAttendanceRecord,
} from '@/lib/db';
import { AttendanceRecord } from '@/types';

export const dynamic = 'force-dynamic';

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
    const { sessionId, studentId, status, excuseReason, adminName } = body;

    if (!sessionId || !studentId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const allStudents = await getStudents();
    const targetStudent = allStudents.find((s) => s.id === studentId);
    if (!targetStudent) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const existingRecords = await getAttendanceRecords(sessionId);
    const existing = existingRecords.find((r) => r.studentId === studentId);

    const record: AttendanceRecord = {
      id: existing ? existing.id : `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      studentId: targetStudent.id,
      studentNumber: targetStudent.studentNumber,
      studentName: targetStudent.fullName,
      course: targetStudent.course,
      status,
      submissionSource: 'admin_manual',
      markedAt: new Date().toISOString(),
      markedBy: adminName || 'Admin',
      excuseReason: excuseReason || undefined,
    };

    const saved = await saveOrUpdateAttendanceRecord(record);
    return NextResponse.json({ success: true, record: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update record' }, { status: 500 });
  }
}
