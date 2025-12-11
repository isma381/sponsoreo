import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';

const USDC_SEPOLIA_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const PLATAFORM_ADDRESS = process.env.NEXT_PLATAFORM_ADDRESS;

export async function POST(request: NextRequest) {
  try {
    const userId = getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    if (!PLATAFORM_ADDRESS) {
      return NextResponse.json(
        { error: 'NEXT_PLATAFORM_ADDRESS no configurado' },
        { status: 500 }
      );
    }

    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Dirección de wallet requerida' },
        { status: 400 }
      );
    }

    // Validar formato de dirección Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Dirección de wallet inválida' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

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

    // Verificar que la dirección no esté registrada
    const existingWallets = await executeQuery(
      'SELECT id FROM wallets WHERE address = $1',
      [normalizedAddress]
    );

    if (existingWallets.length > 0) {
      return NextResponse.json(
        { error: 'Esta dirección ya está registrada' },
        { status: 409 }
      );
    }

    // Verificar si el usuario ya tiene una wallet
    const userWallets = await executeQuery(
      'SELECT id FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (userWallets.length > 0) {
      return NextResponse.json(
        { error: 'Ya tienes una wallet registrada' },
        { status: 409 }
      );
    }

    // Guardar wallet con status pending
    await executeQuery(
      `INSERT INTO wallets (user_id, address, status, verification_address)
       VALUES ($1, $2, 'pending', $3)`,
      [userId, normalizedAddress, PLATAFORM_ADDRESS.toLowerCase()]
    );

    return NextResponse.json({
      verification_address: PLATAFORM_ADDRESS,
    });
  } catch (error: any) {
    console.error('Error registrando wallet:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
