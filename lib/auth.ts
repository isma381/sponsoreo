import { cookies } from 'next/headers';

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function setAuthCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set('user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    sameSite: 'lax',
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('user_id')?.value;
}

export async function deleteAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('user_id');
}

