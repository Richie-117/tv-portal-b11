import { NextRequest, NextResponse } from 'next/server';
import {
  createCheckinSession,
  getCheckinSessions,
  updateCheckinSessionStatus,
  getCheckinSessionById,
} from '@/lib/db';
import { CheckinSession } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessions = await getCheckinSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { course, moduleId, moduleCode, moduleTitle, sessionType, date, startTime, endTime, durationMinutes, notes } = body;

    if (!moduleId || !moduleTitle || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required session parameters' }, { status: 400 });
    }

    const windowMin = Number(durationMinutes) || 30;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMin * 60 * 1000);

    const sessionId = `sess-${Date.now()}`;
    const newSession: CheckinSession = {
      id: sessionId,
      course: course || 'ALL',
      moduleId,
      moduleCode: moduleCode || 'LEC',
      moduleTitle,
      sessionType: sessionType || 'lecture',
      date,
      startTime,
      endTime,
      checkinStatus: 'active',
      sessionStatus: 'active',
      checkinWindowMinutes: windowMin,
      checkinOpenedAt: now.toISOString(),
      checkinExpiresAt: expiresAt.toISOString(),
      notes: notes || '',
      createdBy: 'Administrator',
      createdAt: now.toISOString(),
    };

    const saved = await createCheckinSession(newSession);
    return NextResponse.json({ success: true, session: saved });
  } catch (err: any) {
    console.error('Broadcast creation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create broadcast' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, status } = body;
    if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

    const session = await getCheckinSessionById(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    await updateCheckinSessionStatus(sessionId, status || 'closed');
    return NextResponse.json({ success: true, message: `Session updated to ${status || 'closed'}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update session' }, { status: 500 });
  }
}
