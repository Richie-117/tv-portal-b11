import { NextRequest, NextResponse } from 'next/server';
import { getCheckinSessionById, getAttendanceRecords } from '@/lib/db';
import { generateSessionAttendanceExcel } from '@/lib/excelExport';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await getCheckinSessionById(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const records = await getAttendanceRecords(sessionId);
    const excelBuffer = await generateSessionAttendanceExcel(session, records);

    const filename = `Attendance_${session.moduleCode}_${session.date}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Excel export error:', err);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}
