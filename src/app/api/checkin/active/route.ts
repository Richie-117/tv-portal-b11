import { NextRequest, NextResponse } from 'next/server';
import {
  getCheckinSessions,
  getAttendanceCheckins,
  getAttendanceRecords,
  getStudents,
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    // Find active candidates (open until explicitly closed/finalized by an admin)
    const activeCandidates = allSessions.filter((s) => s.checkinStatus === 'active');
    const validActiveSessions = [];

    for (const sess of activeCandidates) {
      if (sess.sessionStatus === 'cancelled' || sess.sessionStatus === 'postponed') {
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

    // Check if this device already has a valid check-in receipt cookie for an active session
    let deviceReceipt: {
      sessionId: string;
      fullName: string;
      studentNumber: string;
      moduleTitle: string;
      timestamp: string;
      alreadyCheckedIn: boolean;
    } | null = null;

    for (const sess of validActiveSessions) {
      const cookieVal = req.cookies.get(`tv_checkin_${sess.id}`)?.value;
      if (cookieVal && checkedInNumbersSet.has(cookieVal.toUpperCase())) {
        const stu = minimalStudents.find(
          (s) => s.studentNumber.toUpperCase() === cookieVal.toUpperCase()
        );
        const rec = sessionRecords.find(
          (r) =>
            r.sessionId === sess.id &&
            r.studentNumber.toUpperCase() === cookieVal.toUpperCase()
        );
        if (stu) {
          deviceReceipt = {
            sessionId: sess.id,
            fullName: stu.fullName,
            studentNumber: stu.studentNumber,
            moduleTitle: sess.moduleTitle,
            timestamp: rec?.markedAt
              ? new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recorded',
            alreadyCheckedIn: true,
          };
          break;
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        hasActiveSession: true,
        activeSession: primarySession,
        activeSessions: validActiveSessions,
        students: minimalStudents,
        checkedInStudentNumbers: Array.from(checkedInNumbersSet),
        deviceReceipt,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    console.error('Checkin active GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve active session' }, { status: 500 });
  }
}

