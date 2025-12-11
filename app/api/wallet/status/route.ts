import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario tenga email verificado
    const users = await executeQuery(
      'SELECT email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!users[0].email_verified) {
      return NextResponse.json(
        { error: 'Email no verificado' },
        { status: 403 }
      );
    }

    // Obtener wallet del usuario si existe
    const wallets = await executeQuery(
      'SELECT address, verification_address, status FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (wallets.length === 0) {
      return NextResponse.json({ wallet: null });
    }

    return NextResponse.json({
      wallet: {
        address: wallets[0].address,
        verification_address: wallets[0].verification_address,
        status: wallets[0].status,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo estado de wallet:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
