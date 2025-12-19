import { NextResponse } from 'next/server';
import { getAuthCookie } from '@/lib/auth';

export async function GET() {
  const userId = await getAuthCookie();
  return userId ? NextResponse.json({}) : NextResponse.json({}, { status: 401 });
}
