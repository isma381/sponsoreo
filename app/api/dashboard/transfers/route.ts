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

    // Obtener transferencias donde el usuario participa
    const transfers = await executeQuery(
      `SELECT t.*, 
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
      WHERE (w_from.user_id = $1 OR w_to.user_id = $1)
      ORDER BY t.created_at DESC`,
      [userId]
    );

    // Separar en pendientes y públicas
    const pending = transfers.filter((t: any) => !t.is_public);
    const publicTransfers = transfers.filter((t: any) => t.is_public);

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
      created_at: t.created_at ? new Date(t.created_at).toISOString() : null,
      is_public: t.is_public,
      approved_by_sender: t.approved_by_sender,
      approved_by_receiver: t.approved_by_receiver,
      editing_permission_user_id: t.editing_permission_user_id,
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
    });
  } catch (error: any) {
    console.error('[dashboard/transfers] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener transferencias', details: error.message },
      { status: 500 }
    );
  }
}
