import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, getStudents, getLocalDatabase } from '@/lib/db';
import { verifyPassword, signSessionToken, isRepresentativeIndex } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Index number and password required' }, { status: 400 });
    }

    const cleanInput = username.trim().toUpperCase();
    const db = await getLocalDatabase();

    // Look up by username or studentNumber
    let user = (db.users || []).find(
      (u) =>
        u.username.toUpperCase() === cleanInput ||
        (u.studentNumber && u.studentNumber.toUpperCase() === cleanInput)
    );

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid index number or password' }, { status: 401 });
    }

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid index number or password' }, { status: 401 });
    }

    // Automatic built-in admin access for the 4 course representatives
    const isRep = Boolean(user.studentNumber && isRepresentativeIndex(user.studentNumber));
    const effectiveRole = isRep ? 'admin' : user.role;

    const token = await signSessionToken({
      userId: user.id,
      username: user.username,
      role: effectiveRole,
      studentId: user.studentId,
      studentNumber: user.studentNumber,
      course: user.course,
      fullName: user.fullName,
      isRepresentative: isRep,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: effectiveRole,
        studentId: user.studentId,
        studentNumber: user.studentNumber,
        course: user.course,
        fullName: user.fullName,
        isRepresentative: isRep,
      },
    });

    // 30-day persistent cookie
    response.cookies.set('tv_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 86400,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
