import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db';
import { verifyPassword, signSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await signSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      studentId: user.studentId,
      studentNumber: user.studentNumber,
      course: user.course,
      fullName: user.fullName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        studentId: user.studentId,
        studentNumber: user.studentNumber,
        course: user.course,
        fullName: user.fullName,
      },
    });

    response.cookies.set('tv_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 86400,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
