import { NextRequest, NextResponse } from 'next/server';
import {
  findInvitationByHash,
  markInvitationRedeemed,
  getStudents,
  getUserByUsername,
  createUserAccount,
} from '@/lib/db';
import { hashInviteToken, hashPassword, signSessionToken, isRepresentativeIndex } from '@/lib/auth';
import { UserAccount } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { inviteCode, studentNumber, password } = await req.json();

    if (!inviteCode || !studentNumber || !password) {
      return NextResponse.json({ error: 'Invite code, index number, and password required' }, { status: 400 });
    }

    const cleanIndex = studentNumber.trim().toUpperCase();
    const indexRegex = /^RT\/(TPOPT|TPRPT)\/26\/\d{2}$/;
    if (!indexRegex.test(cleanIndex)) {
      return NextResponse.json({
        error: 'Invalid student index format. Expected format: RT/TPOPT/26/XX or RT/TPRPT/26/XX',
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const tokenHash = hashInviteToken(inviteCode);
    const invite = await findInvitationByHash(tokenHash);

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or already redeemed invitation code' }, { status: 400 });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ error: 'This invitation code has expired' }, { status: 400 });
    }

    if (invite.studentNumber.toUpperCase() !== cleanIndex) {
      return NextResponse.json({
        error: `Invitation code mismatch: this code was issued for ${invite.studentNumber}, not ${cleanIndex}.`,
      }, { status: 403 });
    }

    const allStudents = await getStudents();
    const student = allStudents.find((s) => s.id === invite.studentId || s.studentNumber.toUpperCase() === cleanIndex);
    if (!student) {
      return NextResponse.json({ error: 'Linked student profile not found in roster' }, { status: 404 });
    }

    // Check if account already exists
    const existingUser = await getUserByUsername(cleanIndex);
    if (existingUser) {
      return NextResponse.json({ error: 'An account is already activated for this student index' }, { status: 409 });
    }

    const isRep = isRepresentativeIndex(cleanIndex) || Boolean(student.isRepresentative);
    const role = isRep ? 'admin' : 'student';

    const passwordHash = await hashPassword(password);
    const userId = `usr-${Date.now()}`;

    const newAccount: UserAccount = {
      id: userId,
      username: cleanIndex,
      role,
      studentId: student.id,
      studentNumber: student.studentNumber,
      course: student.course,
      fullName: student.fullName,
      passwordHash,
      isActive: true,
      isRepresentative: isRep,
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
      isRepresentative: isRep,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account activated successfully! Logging in...',
      user: {
        id: newAccount.id,
        username: newAccount.username,
        role: newAccount.role,
        fullName: newAccount.fullName,
        studentNumber: student.studentNumber,
        course: student.course,
        isRepresentative: isRep,
      },
    });

    // 30-day persistent cookie
    response.cookies.set('tv_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 86400,
    });

    return response;
  } catch (err: any) {
    console.error('Invite redeem error:', err);
    return NextResponse.json({ error: err.message || 'Failed to redeem invitation' }, { status: 500 });
  }
}
