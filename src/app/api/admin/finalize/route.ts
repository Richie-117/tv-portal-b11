import { NextRequest, NextResponse } from 'next/server';
import { finalizeSessionAttendance } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, adminName } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const result = await finalizeSessionAttendance(sessionId, adminName || 'Administrator');
    return NextResponse.json({
      success: true,
      message: `Session finalized. ${result.affectedCount} unrecorded students marked Absent.`,
      affectedCount: result.affectedCount,
    });
  } catch (err: any) {
    console.error('Finalize session error:', err);
    return NextResponse.json({ error: err.message || 'Failed to finalize session' }, { status: 500 });
  }
}
