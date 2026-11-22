import { NextRequest, NextResponse } from 'next/server';
import { saveLectureOverride, getLectureOverrides, deleteLectureOverride } from '@/lib/db';
import { TimetableOverride } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const overrides = await getLectureOverrides(date);
    return NextResponse.json({ success: true, overrides });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch overrides' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const override: TimetableOverride = {
      id: body.id || `ovr-${Date.now()}`,
      course: body.course || 'ALL',
      date: body.date,
      slotId: body.slotId,
      action: body.action, // 'cancel' | 'postpone' | 'reschedule'
      subject: body.subject,
      reason: body.reason || '',
      newDate: body.newDate,
      newStartTime: body.newStartTime,
      newEndTime: body.newEndTime,
      updatedBy: body.updatedBy || 'Admin',
      createdAt: new Date().toISOString(),
    };

    const saved = await saveLectureOverride(override);
    return NextResponse.json({ success: true, override: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save override' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Override ID is required' }, { status: 400 });
    }
    await deleteLectureOverride(id);
    return NextResponse.json({ success: true, message: 'Override removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete override' }, { status: 500 });
  }
}


