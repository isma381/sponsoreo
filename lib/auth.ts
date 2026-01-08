import { cookies } from 'next/headers';
import { signToken, verifyToken } from './jwt';

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function setAuthCookie(userId: string) {
  const token = signToken(userId);
  const cookieStore = await cookies();
  cookieStore.set('user_id', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 días
    sameSite: 'lax',
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get('user_id')?.value;
  if (!token) return undefined;
  
  const decoded = verifyToken(token);
  return decoded?.userId;
}

export async function deleteAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('user_id');
}

