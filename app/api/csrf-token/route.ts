import { NextResponse } from 'next/server';
import { setCSRFToken } from '@/lib/csrf';

/**
 * Endpoint para obtener un token CSRF
 * El cliente debe llamar a este endpoint y guardar el token
 * para enviarlo en headers de requests POST/PUT/DELETE
 */
export async function GET() {
  const token = await setCSRFToken();
  
  return NextResponse.json({ 
    csrfToken: token 
  });
}
