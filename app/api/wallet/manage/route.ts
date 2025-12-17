import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';

const USDC_SEPOLIA_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const PLATAFORM_ADDRESS = process.env.NEXT_PLATAFORM_ADDRESS;

// GET: Listar wallets del usuario
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const wallets = await executeQuery(
      `SELECT id, address, status, is_paused, is_canceled, created_at 
       FROM wallets 
       WHERE user_id = $1 AND (is_canceled IS NULL OR is_canceled = false)
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ wallets });
  } catch (error: any) {
    console.error('Error obteniendo wallets:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Agregar wallet (reutilizar lógica de register)
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
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

    if (users.length === 0 || !users[0].email_verified) {
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
    console.error('Error agregando wallet:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT: Pausar/reanudar wallet
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { walletId, isPaused } = await request.json();

    if (!walletId || typeof isPaused !== 'boolean') {
      return NextResponse.json(
        { error: 'walletId e isPaused requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la wallet pertenece al usuario
    const wallets = await executeQuery(
      'SELECT id FROM wallets WHERE id = $1 AND user_id = $2',
      [walletId, userId]
    );

    if (wallets.length === 0) {
      return NextResponse.json(
        { error: 'Wallet no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar estado de pausa
    await executeQuery(
      'UPDATE wallets SET is_paused = $1, updated_at = now() WHERE id = $2',
      [isPaused, walletId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error actualizando wallet:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Desconectar wallet (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get('walletId');

    if (!walletId) {
      return NextResponse.json(
        { error: 'walletId requerido' },
        { status: 400 }
      );
    }

    // Verificar que la wallet pertenece al usuario
    const wallets = await executeQuery(
      'SELECT id FROM wallets WHERE id = $1 AND user_id = $2',
      [walletId, userId]
    );

    if (wallets.length === 0) {
      return NextResponse.json(
        { error: 'Wallet no encontrada' },
        { status: 404 }
      );
    }

    // Soft delete: marcar como cancelada
    await executeQuery(
      'UPDATE wallets SET is_canceled = true, updated_at = now() WHERE id = $1',
      [walletId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error desconectando wallet:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
