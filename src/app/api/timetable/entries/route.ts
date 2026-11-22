import { NextRequest, NextResponse } from 'next/server';
import { getTimetableEntries, saveTimetableEntry, deleteTimetableEntry } from '@/lib/db';
import { CourseScope } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const course = (searchParams.get('course') as CourseScope) || undefined;

    const entries = await getTimetableEntries(course);

    return NextResponse.json({ success: true, entries });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch timetable' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = await saveTimetableEntry(body);
    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save timetable slot' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await deleteTimetableEntry(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete timetable slot' }, { status: 500 });
  }
}

