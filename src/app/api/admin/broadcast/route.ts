import { NextRequest, NextResponse } from 'next/server';
import {
  createCheckinSession,
  getCheckinSessions,
  updateCheckinSessionStatus,
  getCheckinSessionById,
  deleteCheckinSession,
  deleteAllCheckinSessions,
} from '@/lib/db';
import { CheckinSession } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const sessions = await getCheckinSessions();
    return NextResponse.json(
      { success: true, sessions },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { course, moduleId, moduleCode, moduleTitle, sessionType, date, startTime, endTime, notes } = body;

    if (!moduleId || !moduleTitle || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required session parameters' }, { status: 400 });
    }

    const now = new Date();

    // Duplicate Check: Prevent creating duplicate broadcast cards for same module, date, and cohort
    const allSessions = await getCheckinSessions();
    const isDuplicate = allSessions.some(
      (s) =>
        s.date === date &&
        s.course === (course || 'ALL') &&
        (s.moduleId === moduleId ||
          s.moduleCode === (moduleCode || 'LEC') ||
          s.moduleTitle.toLowerCase() === moduleTitle.toLowerCase()) &&
        s.startTime === startTime
    );

    if (isDuplicate) {
      return NextResponse.json(
        {
          error: `Duplicate Broadcast Prevented: A session record for "${moduleTitle}" (${course || 'ALL'}) on ${date} at ${startTime} already exists. Please edit or delete the existing card instead.`,
        },
        { status: 409 }
      );
    }

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
      checkinWindowMinutes: 0, // Manual control: stays open until closed by admin
      checkinOpenedAt: now.toISOString(),
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

    const targetStatus = status || 'closed';
    const nextSessionStatus = targetStatus === 'active' ? 'active' : undefined;
    await updateCheckinSessionStatus(sessionId, targetStatus, nextSessionStatus);
    const updatedSession = await getCheckinSessionById(sessionId);
    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: `Session updated to ${targetStatus}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || searchParams.get('id');

    if (sessionId === 'all') {
      await deleteAllCheckinSessions();
      return NextResponse.json({ success: true, message: 'All broadcast sessions cleared successfully' });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    await deleteCheckinSession(sessionId);
    return NextResponse.json({ success: true, message: 'Broadcast session deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete session' }, { status: 500 });
  }
}

