import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/resend';
import { generateVerificationCode } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Verificar si el usuario existe
    const existingUsers = await executeQuery(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    let userId: string;

    if (existingUsers.length === 0) {
      // Crear nuevo usuario
      const newUsers = await executeQuery(
        'INSERT INTO users (email, email_verified) VALUES ($1, false) RETURNING id',
        [email.toLowerCase()]
      );
      userId = newUsers[0].id;
    } else {
      userId = existingUsers[0].id;
    }

    // Generar código de verificación
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Eliminar códigos anteriores del mismo email
    await executeQuery(
      'DELETE FROM verification_codes WHERE email = $1',
      [email.toLowerCase()]
    );

    // Guardar nuevo código
    await executeQuery(
      'INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), code, expiresAt]
    );

    // Enviar email
    await sendVerificationEmail(email.toLowerCase(), code);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en send-code:', error);
    return NextResponse.json(
      { error: 'Error al enviar código' },
      { status: 500 }
    );
  }
}

