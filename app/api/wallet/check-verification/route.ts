import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { getAssetTransfers } from '@/lib/alchemy-api';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    // Obtener wallets del usuario
    let query = 'SELECT address, verification_address, status, last_verification_block_num FROM wallets WHERE user_id = $1';
    let params: any[] = [userId];

    if (address) {
      query += ' AND address = $2';
      params.push(address.toLowerCase());
    }

    const wallets = await executeQuery(query, params);

    // Verificar si el usuario está en onboarding (no tiene wallet verificada)
    const hasVerifiedWallet = wallets.some((w: any) => w.status === 'verified');
    
    // Rate limiting: 20 requests por minuto para onboarding, 10 para usuarios verificados
    if (!hasVerifiedWallet) {
      // Usuario en onboarding: 20 requests por minuto
      const rateLimitResult = await rateLimit(`check-verification-onboarding:${userId}`, 20, 60);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { 
            error: 'Demasiados intentos. Por favor espera un momento.',
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
            }
          }
        );
      }
    } else {
      const rateLimitResult = await rateLimit(`check-verification:${userId}`, 10, 60);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { 
            error: 'Demasiados intentos. Por favor espera un momento.',
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
            }
          }
        );
      }
    }

    if (wallets.length === 0) {
      return NextResponse.json(
        { error: 'Wallet no encontrada' },
        { status: 404 }
      );
    }

    // Si hay address específico, verificar solo esa. Si no, verificar todas las pendientes
    const walletsToCheck = address ? [wallets[0]] : wallets.filter((w: any) => w.status === 'pending');

    if (walletsToCheck.length === 0) {
      return NextResponse.json({ verified: true });
    }

    let anyVerified = false;

    for (const wallet of walletsToCheck) {
      if (wallet.status === 'verified') {
        anyVerified = true;
        continue;
      }

      // Obtener block_num desde el cual buscar (desde el registro de la wallet)
      const fromBlock = wallet.last_verification_block_num || '0x0';

      // Consultar transferencias ERC-20 (cualquier token) desde la dirección del usuario hacia verification_address
      // Solo desde el bloque del registro hacia adelante (más eficiente y seguro)
      const transfers = await getAssetTransfers({
        fromAddress: wallet.address,
        toAddress: wallet.verification_address,
        category: ['erc20'],
        fromBlock: fromBlock,
        toBlock: 'latest',
      });

      // Verificar si hay alguna transferencia
      if (transfers.transfers.length > 0) {
        const latestTransfer = transfers.transfers[0];
        
        // Validar que fromAddress coincida exactamente (por seguridad adicional)
        if (latestTransfer.from?.toLowerCase() !== wallet.address.toLowerCase()) {
          continue;
        }

        // Actualizar status a verified solo para esta wallet específica
        await executeQuery(
          'UPDATE wallets SET status = $1, updated_at = now() WHERE user_id = $2 AND address = $3',
          ['verified', userId, wallet.address]
        );
        anyVerified = true;
      }
    }

    return NextResponse.json({ verified: anyVerified });
  } catch (error: any) {
    console.error('Error verificando wallet:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', verified: false },
      { status: 500 }
    );
  }
}
