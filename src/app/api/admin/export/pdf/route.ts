import { NextRequest, NextResponse } from 'next/server';
import { getExportableSessionRecords } from '@/lib/db';
import { generateSessionAttendancePDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const exported = await getExportableSessionRecords(sessionId);
    if (!exported) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const { session, records } = exported;
    const doc = generateSessionAttendancePDF(session, records);
    const arrayBuffer = doc.output('arraybuffer');

    const filename = `Attendance_${session.moduleCode}_${session.date}.pdf`;

    return new NextResponse(new Uint8Array(arrayBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('PDF export error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
