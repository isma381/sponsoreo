import { NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

export async function GET() {
  const userId = await getAuthCookie();
  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const users = await executeQuery(
    'SELECT id, email, username, profile_image_url FROM users WHERE id = $1',
    [userId]
  );

  return NextResponse.json({
    user: users.length > 0 ? users[0] : null,
  });
}

