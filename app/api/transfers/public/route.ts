import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';

/**
 * GET /api/transfers/public
 * Endpoint para transferencias públicas (página pública)
 * 
 * Funcionalidad:
 * - Consulta BD primero: WHERE is_public = true (respuesta rápida)
 * - Sincroniza con Alchemy en background (necesario porque si ambos usuarios tienen 
 *   privacy_mode='auto', las transferencias se crean automáticamente como públicas)
 * - Respuesta instantánea con datos de BD, sync corre en background
 * - Usado por /app/transfers/page.tsx
 * 
 * Parámetros opcionales:
 * - ?type=sponsoreo - Filtrar por tipo
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // 'sponsoreo' | null

    // Construir query para transferencias públicas
    let query = `SELECT t.*, 
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
      AND u2.username IS NOT NULL
      AND t.is_public = true`;

    // Agregar filtro por tipo si se especifica
    if (typeFilter === 'sponsoreo') {
      query += ` AND t.transfer_type = 'sponsoreo'`;
    }

    query += ` ORDER BY t.created_at DESC LIMIT 100`;

    // Obtener transferencias públicas de BD (respuesta rápida)
    const publicTransfers = await executeQuery(query, []);

    // Formatear transferencias
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

    const formattedTransfers = formatTransfers(publicTransfers);

    // Devolver datos de BD (páginas públicas solo consultan BD, no sincronizan con Alchemy)
    return NextResponse.json({
      transfers: formattedTransfers,
      total: formattedTransfers.length,
      chainId: publicTransfers[0]?.chain_id || SEPOLIA_CHAIN_ID,
      fromCache: true,
    });
  } catch (error: any) {
    console.error('[transfers/public] Error obteniendo transferencias públicas:', error);
    return NextResponse.json(
      { error: 'Error al obtener transferencias públicas', details: error.message },
      { status: 500 }
    );
  }
}

