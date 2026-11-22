import { NextRequest, NextResponse } from 'next/server';
import { getLiveLectureStatus } from '@/lib/timetableService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const simTime = searchParams.get('time') || undefined;

    const data = await getLiveLectureStatus(simTime);

    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('Timetable live GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve live lecture status.' }, { status: 500 });
  }
}

