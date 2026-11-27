import { NextRequest, NextResponse } from 'next/server';
import {
  getInvitations,
  createInvitation,
  getStudents,
  getUsers,
  revokeUserAccount,
  revokeInvitation,
} from '@/lib/db';
import { generateInviteToken } from '@/lib/auth';
import { Invitation } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const [invitations, allStudents, activeUsers] = await Promise.all([
      getInvitations(),
      getStudents(),
      getUsers(),
    ]);

    const activatedStudentIds = new Set(
      activeUsers.filter((u) => u.isActive && u.studentId).map((u) => u.studentId)
    );
    const activatedStudentNumbers = new Set(
      activeUsers
        .filter((u) => u.isActive && Boolean(u.studentNumber))
        .map((u) => (u.studentNumber as string).toUpperCase())
    );

    const studentStatusList = allStudents.map((s) => {
      const isActivated =
        activatedStudentIds.has(s.id) ||
        activatedStudentNumbers.has(s.studentNumber.toUpperCase());
      const existingInvite = (invitations || []).find(
        (inv) => (inv.studentId === s.id || inv.studentNumber.toUpperCase() === s.studentNumber.toUpperCase()) && !inv.isRedeemed
      );
      return {
        ...s,
        isActivated,
        hasPendingInvite: Boolean(existingInvite),
        inviteId: existingInvite?.id || null,
        inviteToken: existingInvite?.tokenClear || null,
        expiresAt: existingInvite?.expiresAt || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        invitations,
        students: studentStatusList,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { studentId, expiresInDays } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    const allStudents = await getStudents();
    const student = allStudents.find((s) => s.id === studentId);
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const { clearToken, tokenHash } = generateInviteToken();
    const days = Number(expiresInDays) || 14;
    const expiresAt = new Date(Date.now() + days * 86400 * 1000).toISOString();

    const newInvite: Invitation = {
      id: `inv-${Date.now()}-${clearToken}`,
      studentId: student.id,
      studentNumber: student.studentNumber,
      course: student.course,
      tokenHash,
      tokenClear: clearToken,
      isRedeemed: false,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    const saved = await createInvitation(newInvite);

    return NextResponse.json({
      success: true,
      invite: saved,
      clearToken,
    });
  } catch (err: any) {
    console.error('Generate invite error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate invite' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'revoke_account' or 'revoke_invite'
    const targetId = searchParams.get('id');

    if (!targetId) {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    }

    if (action === 'revoke_account') {
      await revokeUserAccount(targetId);
      return NextResponse.json({ success: true, message: 'Account revoked successfully' });
    } else if (action === 'revoke_invite') {
      await revokeInvitation(targetId);
      return NextResponse.json({ success: true, message: 'Invitation code revoked successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Revocation failed' }, { status: 500 });
  }
}
