import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';
import { getAuthCookie } from '@/lib/auth';

/**
 * GET /api/transfers
 * Wrapper para mantener compatibilidad - redirige a endpoints específicos según parámetros
 * 
 * Opción A: Mantener como wrapper que redirige a endpoints específicos
 * - La lógica de sincronización ahora está en /api/transfers/sync
 * - Este endpoint mantiene compatibilidad con código existente
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cacheOnly = searchParams.get('cache') === 'true';
    const userOnly = searchParams.get('userOnly') === 'true';
    const typeFilter = searchParams.get('type'); // 'sponsoreo' | null
    const userId = userOnly ? await getAuthCookie() : null;

    // Obtener transferencias de BD (respuesta rápida)
    let cachedQuery = `SELECT t.*, 
        u1.username as from_username,
        u1.profile_image_url as from_profile_image,
        u2.username as to_username,
        u2.profile_image_url as to_profile_image
       FROM transfers t
       LEFT JOIN wallets w1 ON LOWER(t.from_address) = LOWER(w1.address)
       LEFT JOIN users u1 ON w1.user_id = u1.id
       LEFT JOIN wallets w2 ON LOWER(t.to_address) = LOWER(w2.address)
       LEFT JOIN users u2 ON w2.user_id = u2.id
       WHERE w1.status = 'verified' 
         AND w2.status = 'verified'
         AND u1.username IS NOT NULL
         AND u2.username IS NOT NULL`;

    // Agregar filtro por tipo si es 'sponsoreo'
    if (typeFilter === 'sponsoreo') {
      cachedQuery += ` AND t.transfer_type = 'sponsoreo'`;
    }

    cachedQuery += ` ORDER BY t.created_at DESC LIMIT 100`;

    const cachedTransfers = await executeQuery(cachedQuery, []);

    const formatTransfers = (transfers: any[]) => {
      return transfers.map((t: any) => ({
        hash: t.hash,
        blockNum: t.block_num,
        from: t.from_address,
        to: t.to_address,
        value: parseFloat(t.value),
        rawContract: {
          value: t.raw_contract_value,
          decimal: t.raw_contract_decimal,
        },
        token: t.token || '',
        chain: t.chain || '',
        contractAddress: t.contract_address,
        chainId: t.chain_id || SEPOLIA_CHAIN_ID,
        tokenLogo: null,
        created_at: t.created_at ? new Date(t.created_at).toISOString() : undefined,
        transfer_type: t.transfer_type || 'generic',
        message: t.message || null,
        message_created_at: t.message_created_at ? new Date(t.message_created_at).toISOString() : null,
        message_updated_at: t.message_updated_at ? new Date(t.message_updated_at).toISOString() : null,
        fromUser: {
          username: t.from_username,
          profileImageUrl: t.from_profile_image,
        },
        toUser: {
          username: t.to_username,
          profileImageUrl: t.to_profile_image,
        },
      }));
    };

    const formattedCached = formatTransfers(cachedTransfers);

    // Si es solo cache, devolver inmediatamente
    if (cacheOnly) {
      return NextResponse.json({
        transfers: formattedCached,
        total: formattedCached.length,
        chainId: cachedTransfers[0]?.chain_id || SEPOLIA_CHAIN_ID,
        fromCache: true,
      });
    }

    // Devolver datos de BD (este endpoint solo consulta BD, no sincroniza con Alchemy)
    return NextResponse.json({
      transfers: formattedCached,
      total: formattedCached.length,
      chainId: cachedTransfers[0]?.chain_id || SEPOLIA_CHAIN_ID,
      fromCache: true,
    });
  } catch (error: any) {
    console.error('[transfers] Error obteniendo transferencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener transferencias', details: error.message },
      { status: 500 }
    );
  }
}
