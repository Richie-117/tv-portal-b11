import { NextRequest, NextResponse } from 'next/server';
import {
  findInvitationByHash,
  markInvitationRedeemed,
  getStudents,
  getUserByUsername,
  createUserAccount,
} from '@/lib/db';
import { hashInviteToken, hashPassword, signSessionToken } from '@/lib/auth';
import { UserAccount } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { inviteCode, username, password } = await req.json();

    if (!inviteCode || !username || !password) {
      return NextResponse.json({ error: 'Invite code, username, and password required' }, { status: 400 });
    }

    if (username.length < 3 || password.length < 6) {
      return NextResponse.json({ error: 'Username must be at least 3 chars, password at least 6 chars' }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    const tokenHash = hashInviteToken(inviteCode);
    const invite = await findInvitationByHash(tokenHash);

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or already redeemed invitation code' }, { status: 400 });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ error: 'This invitation code has expired' }, { status: 400 });
    }

    const allStudents = await getStudents();
    const student = allStudents.find((s) => s.id === invite.studentId);
    if (!student) {
      return NextResponse.json({ error: 'Linked student profile not found' }, { status: 404 });
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr-${Date.now()}`;

    const newAccount: UserAccount = {
      id: userId,
      username: username.trim().toLowerCase(),
      role: 'student',
      studentId: student.id,
      studentNumber: student.studentNumber,
      course: student.course,
      fullName: student.fullName,
      passwordHash,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await createUserAccount(newAccount);
    await markInvitationRedeemed(invite.id, userId);

    const sessionToken = await signSessionToken({
      userId: newAccount.id,
      username: newAccount.username,
      role: newAccount.role,
      studentId: student.id,
      studentNumber: student.studentNumber,
      course: student.course,
      fullName: student.fullName,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account activated successfully!',
      user: {
        id: newAccount.id,
        username: newAccount.username,
        role: newAccount.role,
        fullName: newAccount.fullName,
        studentNumber: student.studentNumber,
        course: student.course,
      },
    });

    response.cookies.set('tv_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 86400,
    });

    return response;
  } catch (err: any) {
    console.error('Invite redeem error:', err);
    return NextResponse.json({ error: err.message || 'Failed to redeem invitation' }, { status: 500 });
  }
}
