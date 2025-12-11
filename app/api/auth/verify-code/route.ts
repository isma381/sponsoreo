import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email y código son requeridos' },
        { status: 400 }
      );
    }

    // Verificar código
    const codes = await executeQuery(
      'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email.toLowerCase(), code]
    );

    if (codes.length === 0) {
      return NextResponse.json(
        { error: 'Código inválido o expirado' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const users = await executeQuery(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Actualizar email_verified
    await executeQuery(
      'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    // Eliminar código usado
    await executeQuery(
      'DELETE FROM verification_codes WHERE email = $1',
      [email.toLowerCase()]
    );

    // Crear sesión
    setAuthCookie(userId);

    return NextResponse.json({ success: true, redirect: '/onboarding' });
  } catch (error) {
    console.error('Error en verify-code:', error);
    return NextResponse.json(
      { error: 'Error al verificar código' },
      { status: 500 }
    );
  }
}

