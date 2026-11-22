import { NextRequest, NextResponse } from 'next/server';
import { getInvitations, createInvitation, getStudents, getLocalDatabase } from '@/lib/db';
import { generateInviteToken } from '@/lib/auth';
import { Invitation } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [invitations, allStudents, db] = await Promise.all([
      getInvitations(),
      getStudents(),
      getLocalDatabase(),
    ]);

    const activeUsers = db.users || [];
    const activatedStudentIds = new Set(
      activeUsers.filter((u) => u.studentId).map((u) => u.studentId)
    );

    const studentStatusList = allStudents.map((s) => {
      const isActivated = activatedStudentIds.has(s.id);
      const existingInvite = invitations.find(
        (inv) => inv.studentId === s.id && !inv.isRedeemed
      );
      return {
        ...s,
        isActivated,
        hasPendingInvite: Boolean(existingInvite),
        inviteToken: existingInvite?.tokenClear || null,
        expiresAt: existingInvite?.expiresAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      invitations,
      students: studentStatusList,
    });
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
      id: `inv-${Date.now()}`,
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
    return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 });
  }
}
