import { NextRequest, NextResponse } from 'next/server';
import { getStudents, getCheckinSessions, getAttendanceRecords } from '@/lib/db';
import { calculateStudentAttendanceMetrics } from '@/lib/attendanceCalculations';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentIdentifier = searchParams.get('student'); // ID or index

    if (!studentIdentifier) {
      return NextResponse.json({ error: 'Student identifier required' }, { status: 400 });
    }

    const cleanInput = studentIdentifier.trim().toUpperCase();
    const [allStudents, allSessions, allRecords] = await Promise.all([
      getStudents(),
      getCheckinSessions(),
      getAttendanceRecords(),
    ]);

    const student = allStudents.find(
      (s) => s.id === studentIdentifier || s.studentNumber.toUpperCase() === cleanInput
    );

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const metrics = calculateStudentAttendanceMetrics(student, allSessions, allRecords);

    return NextResponse.json({
      success: true,
      student,
      metrics,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to calculate student attendance' }, { status: 500 });
  }
}

