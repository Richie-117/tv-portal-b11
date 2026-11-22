import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('tv_session_token')?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ user: null });
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        studentId: user.studentId,
        studentNumber: user.studentNumber,
        course: user.course,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ user: null });
  }
}

