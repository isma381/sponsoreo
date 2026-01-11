import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';
import { logSecurity } from '@/lib/logger';

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
      logSecurity('auth_verify_failed', request, {
        email: email.toLowerCase(),
        success: false,
        error: 'Código inválido o expirado',
      });
      return NextResponse.json(
        { error: 'Código inválido o expirado' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const users = await executeQuery(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      logSecurity('auth_verify_user_not_found', request, {
        email: email.toLowerCase(),
        success: false,
        error: 'Usuario no encontrado',
      });
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userId = users[0].id;
    const isNewUser = !users[0].email_verified;

    // Actualizar email_verified si es nuevo usuario
    if (isNewUser) {
      await executeQuery(
        'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    }

    // Eliminar código usado
    await executeQuery(
      'DELETE FROM verification_codes WHERE email = $1',
      [email.toLowerCase()]
    );

    // Crear sesión
    await setAuthCookie(userId);

    // Log de autenticación exitosa
    logSecurity('auth_verify_success', request, {
      userId,
      email: email.toLowerCase(),
      success: true,
      metadata: { isNewUser },
    });

    // Si es un usuario existente (login), ir directo al dashboard
    if (!isNewUser) {
      return NextResponse.json({ success: true, redirect: '/dashboard' });
    }

    // Si es usuario nuevo, verificar si necesita onboarding
    const wallets = await executeQuery(
      'SELECT status FROM wallets WHERE user_id = $1',
      [userId]
    );

    const userData = await executeQuery(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );

    let redirect = '/transfers';
    if (wallets.length === 0 || wallets[0].status !== 'verified') {
      redirect = '/onboarding';
    } else if (!userData[0].username) {
      redirect = '/onboarding/complete';
    }

    return NextResponse.json({ success: true, redirect });
  } catch (error) {
    console.error('Error en verify-code:', error);
    return NextResponse.json(
      { error: 'Error al verificar código' },
      { status: 500 }
    );
  }
}

