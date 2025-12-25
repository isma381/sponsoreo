import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { syncTransfersInBackground } from '@/app/api/transfers/sync/route';

/**
 * GET /api/dashboard/transfers
 * Endpoint optimizado para dashboard - BASE Y PATRÓN DE REFERENCIA
 * 
 * Funcionalidad:
 * - Mantiene lectura rápida de BD (actual) - técnica base del dashboard
 * - Agregar parámetro ?sync=true para disparar sync optimizado
 * - Cuando sync=true, ejecuta /api/transfers/sync?userOnly=true (versión optimizada)
 * - Dashboard espera la sync porque debe mostrar transferencias pendientes que requieren aprobación
 * 
 * Flujo (técnica base del dashboard):
 * 1. Cargar datos de BD primero (rápido)
 * 2. Si sync=true: Ejecutar /api/transfers/sync?userOnly=true y esperar respuesta
 * 3. Recargar datos de BD después de sync para mostrar nuevas transferencias
 * 4. Devolver datos actualizados
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener query params
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // 'generic' | 'socios' | 'sponsoreo' | null
    const shouldSync = searchParams.get('sync') === 'true';

    // Construir query con filtro opcional por transfer_type
    let query = `SELECT t.*, 
        u_from.username as from_username, 
        u_from.profile_image_url as from_image,
        u_to.username as to_username, 
        u_to.profile_image_url as to_image,
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id
      FROM transfers t
      JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
      JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
      JOIN users u_from ON w_from.user_id = u_from.id
      JOIN users u_to ON w_to.user_id = u_to.id
      WHERE (w_from.user_id = $1 OR w_to.user_id = $1)`;

    const params: any[] = [userId];

    // Agregar filtro por tipo si se especifica
    if (typeFilter && ['generic', 'socios', 'sponsoreo'].includes(typeFilter)) {
      query += ` AND t.transfer_type = $2`;
      params.push(typeFilter);
    }

    query += ` ORDER BY t.created_at DESC`;

    // 1. Cargar datos de BD primero (rápido)
    let transfers = await executeQuery(query, params);

    // 2. Si sync=true: Ejecutar sync directamente (sin fetch interno)
    if (shouldSync) {
      try {
        const syncResult = await syncTransfersInBackground(typeFilter, userId, null);
        console.log('[dashboard/transfers] Sincronización completada:', syncResult);

        // 3. Recargar datos de BD después de sync para mostrar nuevas transferencias
        transfers = await executeQuery(query, params);
      } catch (error: any) {
        console.error('[dashboard/transfers] Error ejecutando sync:', error);
        // Si falla la sincronización, continuar con datos de BD (no fallar)
      }
    }

    // Separar en pendientes y públicas
    const pending = transfers.filter((t: any) => !t.is_public);
    const publicTransfers = transfers.filter((t: any) => t.is_public);

    // Agrupar por tipo
    const generic = transfers.filter((t: any) => t.transfer_type === 'generic');
    const socios = transfers.filter((t: any) => t.transfer_type === 'socios');
    const sponsoreo = transfers.filter((t: any) => t.transfer_type === 'sponsoreo');

    // Formatear transferencias
    const formatTransfer = (t: any) => ({
      id: t.id,
      hash: t.hash,
      from: t.from_address,
      to: t.to_address,
      value: parseFloat(t.value),
      token: t.token || 'USDC',
      chain: t.chain || 'Sepolia',
      chainId: t.chain_id || 11155111,
      contractAddress: t.contract_address,
      created_at: t.created_at ? new Date(t.created_at).toISOString() : undefined,
      is_public: t.is_public,
      approved_by_sender: t.approved_by_sender,
      approved_by_receiver: t.approved_by_receiver,
      editing_permission_user_id: t.editing_permission_user_id,
      transfer_type: t.transfer_type || 'generic',
      message: t.message || null,
      message_created_at: t.message_created_at ? new Date(t.message_created_at).toISOString() : null,
      message_updated_at: t.message_updated_at ? new Date(t.message_updated_at).toISOString() : null,
      image_url: t.image_url,
      category: t.category,
      location: t.location,
      description: t.description,
      fromUser: {
        username: t.from_username,
        profileImageUrl: t.from_image,
        userId: t.from_user_id,
      },
      toUser: {
        username: t.to_username,
        profileImageUrl: t.to_image,
        userId: t.to_user_id,
      },
      isSender: t.from_user_id === userId,
      isReceiver: t.to_user_id === userId,
    });

    return NextResponse.json({
      pending: pending.map(formatTransfer),
      public: publicTransfers.map(formatTransfer),
      all: transfers.map(formatTransfer),
      byType: {
        generic: generic.map(formatTransfer),
        socios: socios.map(formatTransfer),
        sponsoreo: sponsoreo.map(formatTransfer),
      },
    });
  } catch (error: any) {
    console.error('[dashboard/transfers] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener transferencias', details: error.message },
      { status: 500 }
    );
  }
}
