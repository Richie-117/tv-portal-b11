import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  res.cookies.set('tv_session_token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  return res;
}

