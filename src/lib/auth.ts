import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'ucr-tv-b11-super-secret-jwt-signing-key-2026-production';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export const REPRESENTATIVE_INDEXES = new Set([
  'RT/TPOPT/26/02', // P.A. Hesan Samudika (TPOPT)
  'RT/TPOPT/26/22', // P. Tharushika Nethmi (TPOPT)
  'RT/TPRPT/26/14', // M. Rafidh Rizwan (TPRPT)
  'RT/TPRPT/26/21', // Yenuki Ruhansa Atapattu (TPRPT)
]);

export function isRepresentativeIndex(indexNumber: string): boolean {
  if (!indexNumber) return false;
  return REPRESENTATIVE_INDEXES.has(indexNumber.trim().toUpperCase());
}

export interface SessionPayload {
  userId: string;
  username: string;
  role: 'student' | 'admin' | 'representative';
  studentId?: string;
  studentNumber?: string;
  course?: 'TPOPT' | 'TPRPT';
  fullName: string;
  isRepresentative?: boolean;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Long-lived persistent login (30 days)
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function generateInviteToken(): { clearToken: string; tokenHash: string } {
  // Generates formatted single-use invite code: B11-ABCD-1234
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  const clearToken = `B11-${random.slice(0, 4)}-${random.slice(4, 8)}`;
  const tokenHash = crypto.createHash('sha256').update(clearToken).digest('hex');
  return { clearToken, tokenHash };
}

export function hashInviteToken(token: string): string {
  const normalized = token.trim().toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
