import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { getAssetTransfers } from '@/lib/alchemy-api';

const USDC_SEPOLIA_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener wallet del usuario
    const wallets = await executeQuery(
      'SELECT address, verification_address, status FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (wallets.length === 0) {
      return NextResponse.json(
        { error: 'Wallet no encontrada' },
        { status: 404 }
      );
    }

    const wallet = wallets[0];

    if (wallet.status === 'verified') {
      return NextResponse.json({ verified: true });
    }

    // Consultar transferencias USDC desde la dirección del usuario hacia verification_address
    const transfers = await getAssetTransfers({
      fromAddress: wallet.address,
      toAddress: wallet.verification_address,
      contractAddress: USDC_SEPOLIA_ADDRESS,
      category: ['erc20'],
      toBlock: 'latest',
    });

    // Verificar si hay alguna transferencia
    if (transfers.transfers.length > 0) {
      // Actualizar status a verified
      await executeQuery(
        'UPDATE wallets SET status = $1, updated_at = now() WHERE user_id = $2',
        ['verified', userId]
      );

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false });
  } catch (error: any) {
    console.error('Error verificando wallet:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', verified: false },
      { status: 500 }
    );
  }
}
