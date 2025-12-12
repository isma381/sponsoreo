import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sendVerificationEmail, sendLoginCode } from '@/lib/resend';
import { generateVerificationCode } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, mode = 'login' } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Verificar si el usuario existe
    const existingUsers = await executeQuery(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [emailLower]
    );

    // Modo Login
    if (mode === 'login') {
      if (existingUsers.length === 0) {
        return NextResponse.json(
          { error: 'Este email no está registrado' },
          { status: 404 }
        );
      }

      const user = existingUsers[0];
      if (!user.email_verified) {
        return NextResponse.json(
          { error: 'Email no verificado. Por favor regístrate de nuevo' },
          { status: 403 }
        );
      }

      // Usuario existe y está verificado - enviar código de login
      const code = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      await executeQuery(
        'DELETE FROM verification_codes WHERE email = $1',
        [emailLower]
      );

      await executeQuery(
        'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)',
        [emailLower, code, expiresAt]
      );

      await sendLoginCode(emailLower, code);

      return NextResponse.json({ success: true, isLogin: true });
    }

    // Modo Registro
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Este email ya está registrado. ¿Quieres iniciar sesión?' },
        { status: 409 }
      );
    }

    // Crear nuevo usuario
    const newUsers = await executeQuery(
      'INSERT INTO users (email, email_verified) VALUES ($1, false) RETURNING id',
      [emailLower]
    );

    // Generar código de verificación
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await executeQuery(
      'DELETE FROM verification_codes WHERE email = $1',
      [emailLower]
    );

    await executeQuery(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)',
      [emailLower, code, expiresAt]
    );

    await sendVerificationEmail(emailLower, code);

    return NextResponse.json({ success: true, isLogin: false });
  } catch (error) {
    console.error('Error en send-code:', error);
    return NextResponse.json(
      { error: 'Error al enviar código' },
      { status: 500 }
    );
  }
}

