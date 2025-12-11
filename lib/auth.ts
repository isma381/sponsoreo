import { cookies } from 'next/headers';

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function setAuthCookie(userId: string) {
  cookies().set('user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    sameSite: 'lax',
  });
}

export function getAuthCookie(): string | undefined {
  return cookies().get('user_id')?.value;
}

export function deleteAuthCookie() {
  cookies().delete('user_id');
}

