import { NextRequest, NextResponse } from 'next/server';
import {
  getCheckinSessionById,
  findStudentByCourseAndSuffix,
  getStudents,
  submitStudentCheckin,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, course, lastNumber, studentNumber } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    if (!course && !studentNumber) {
      return NextResponse.json({ error: 'Programme and student index are required.' }, { status: 400 });
    }

    const session = await getCheckinSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Lecture check-in session not found.' }, { status: 404 });
    }

    if (session.checkinStatus !== 'active') {
      return NextResponse.json(
        { error: 'The attendance check-in window for this lecture is closed.' },
        { status: 400 }
      );
    }

    // Resolve Student
    let targetStudent = null;
    if (course && lastNumber) {
      targetStudent = await findStudentByCourseAndSuffix(course, lastNumber);
    }

    if (!targetStudent && studentNumber) {
      const allStudents = await getStudents();
      const cleanInput = studentNumber.trim().toUpperCase();
      targetStudent = allStudents.find(
        (s) => s.studentNumber.toUpperCase() === cleanInput
      ) || null;
    }

    if (!targetStudent) {
      return NextResponse.json(
        {
          error: `Could not find an enrolled student matching ${course || ''} #${lastNumber || studentNumber}.`,
        },
        { status: 404 }
      );
    }

    // Anti-Proxy Device Lock Check
    const cookieName = `tv_checkin_${session.id}`;
    const deviceCookie = req.cookies.get(cookieName)?.value;
    if (deviceCookie && deviceCookie.toUpperCase() !== targetStudent.studentNumber.toUpperCase()) {
      return NextResponse.json(
        {
          success: false,
          proxyBlocked: true,
          error: `Device Limit Reached: This device has already checked in for this session (${deviceCookie}). One student per device per session is enforced.`,
        },
        { status: 403 }
      );
    }

    // Submit check-in
    const result = await submitStudentCheckin({
      sessionId: session.id,
      student: targetStudent,
      deviceFingerprint: req.headers.get('user-agent') || 'mobile-browser',
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          alreadyCheckedIn: result.alreadyCheckedIn,
          error: result.error,
          student: targetStudent,
        },
        { status: result.alreadyCheckedIn ? 409 : 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: `Checked in successfully! Marked Present for ${session.moduleTitle}.`,
      student: {
        id: targetStudent.id,
        fullName: targetStudent.fullName,
        studentNumber: targetStudent.studentNumber,
        course: targetStudent.course,
      },
      session: {
        id: session.id,
        moduleTitle: session.moduleTitle,
        moduleCode: session.moduleCode,
      },
      timestamp: new Date().toISOString(),
    });

    // Set signed session receipt cookie for 24h
    response.cookies.set(cookieName, targetStudent.studentNumber, {
      httpOnly: false,
      maxAge: 86400,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (err: any) {
    console.error('Checkin submit POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit check-in.' }, { status: 500 });
  }
}

