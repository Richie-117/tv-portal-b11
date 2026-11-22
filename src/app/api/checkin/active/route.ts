import { NextRequest, NextResponse } from 'next/server';
import {
  getCheckinSessions,
  getAttendanceCheckins,
  getAttendanceRecords,
  getStudents,
  updateCheckinSessionStatus,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedCourse = searchParams.get('course');

    const allStudents = await getStudents();
    const minimalStudents = allStudents.map((s) => ({
      id: s.id,
      studentNumber: s.studentNumber,
      indexSuffix: s.indexSuffix,
      fullName: s.fullName,
      course: s.course,
    }));

    const allSessions = await getCheckinSessions();
    const now = Date.now();

    // Find active candidates
    const activeCandidates = allSessions.filter((s) => s.checkinStatus === 'active');
    const validActiveSessions = [];

    for (const sess of activeCandidates) {
      if (sess.sessionStatus === 'cancelled' || sess.sessionStatus === 'postponed') {
        continue;
      }
      if (sess.checkinExpiresAt && now > new Date(sess.checkinExpiresAt).getTime()) {
        await updateCheckinSessionStatus(sess.id, 'expired').catch(() => {});
        continue;
      }
      if (requestedCourse && sess.course !== 'ALL' && sess.course !== requestedCourse) {
        continue;
      }
      validActiveSessions.push(sess);
    }

    if (validActiveSessions.length === 0) {
      return NextResponse.json(
        {
          success: true,
          hasActiveSession: false,
          activeSession: null,
          activeSessions: [],
          students: minimalStudents,
          checkedInStudentNumbers: [],
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const primarySession = validActiveSessions[0];

    // Get checked in numbers
    const [allCheckinsArrays, records] = await Promise.all([
      Promise.all(validActiveSessions.map((s) => getAttendanceCheckins(s.id))),
      getAttendanceRecords(),
    ]);

    const activeSessionIds = new Set(validActiveSessions.map((s) => s.id));
    const sessionRecords = records.filter(
      (r) => activeSessionIds.has(r.sessionId) && r.status === 'present'
    );

    const checkedInNumbersSet = new Set<string>();
    allCheckinsArrays.flat().forEach((c) => {
      if (c.status === 'submitted' || c.status === 'confirmed') {
        if (c.studentNumber) checkedInNumbersSet.add(c.studentNumber.toUpperCase());
      }
    });
    sessionRecords.forEach((r) => {
      if (r.studentNumber) checkedInNumbersSet.add(r.studentNumber.toUpperCase());
    });

    return NextResponse.json(
      {
        success: true,
        hasActiveSession: true,
        activeSession: primarySession,
        activeSessions: validActiveSessions,
        students: minimalStudents,
        checkedInStudentNumbers: Array.from(checkedInNumbersSet),
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    console.error('Checkin active GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve active session' }, { status: 500 });
  }
}

