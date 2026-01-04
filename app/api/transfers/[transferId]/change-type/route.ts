import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { transferId } = await params;
    const body = await request.json();
    const { transfer_type } = body;

    // Validar que solo se puede cambiar a 'sponsoreo'
    if (transfer_type !== 'sponsoreo') {
      return NextResponse.json(
        { error: 'Solo se puede cambiar a tipo "sponsoreo"' },
        { status: 400 }
      );
    }

    // Obtener transferencia y verificar que el usuario sea el receptor
    const transfers = await executeQuery(
      `SELECT t.*, 
        w_to.user_id as to_user_id
      FROM transfers t
      JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
      WHERE t.id = $1`,
      [transferId]
    );

    if (transfers.length === 0) {
      return NextResponse.json(
        { error: 'Transferencia no encontrada' },
        { status: 404 }
      );
    }

    const transfer = transfers[0];

    // Verificar que el usuario sea el receptor
    if (transfer.to_user_id !== userId) {
      return NextResponse.json(
        { error: 'Solo el receptor puede cambiar el tipo de transferencia' },
        { status: 403 }
      );
    }

    // Actualizar transfer_type a 'sponsoreo'
    await executeQuery(
      `UPDATE transfers 
       SET transfer_type = $1, updated_at = now()
       WHERE id = $2`,
      ['sponsoreo', transferId]
    );

    // Obtener transferencia actualizada
    const updatedTransfers = await executeQuery(
      `SELECT t.*, 
        u_from.username as from_username, 
        u_from.profile_image_url as from_image,
        u_from.email as from_email,
        u_to.username as to_username, 
        u_to.profile_image_url as to_image,
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id
      FROM transfers t
      JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
      JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
      JOIN users u_from ON w_from.user_id = u_from.id
      JOIN users u_to ON w_to.user_id = u_to.id
      WHERE t.id = $1`,
      [transferId]
    );

    if (updatedTransfers.length === 0) {
      return NextResponse.json(
        { error: 'Error al obtener transferencia actualizada' },
        { status: 500 }
      );
    }

    const updated = updatedTransfers[0];

    // Enviar email de notificación al emisor
    if (updated.from_email) {
      try {
        const { sendTransferChangedToSponsoreoNotification } = await import('@/lib/resend');
        await sendTransferChangedToSponsoreoNotification(
          updated.from_email,
          updated.hash,
          updated.to_username,
          parseFloat(updated.value),
          updated.token || 'USDC'
        );
      } catch (emailError) {
        console.error('[transfers/change-type] Error enviando email:', emailError);
        // No fallar la operación si el email falla
      }
    }

    return NextResponse.json({
      id: updated.id,
      hash: updated.hash,
      from: updated.from_address,
      to: updated.to_address,
      value: parseFloat(updated.value),
      token: updated.token || 'USDC',
      chain: updated.chain || 'Sepolia',
      chainId: updated.chain_id || 11155111,
      contractAddress: updated.contract_address,
      created_at: updated.created_at ? new Date(updated.created_at).toISOString() : undefined,
      is_public: updated.is_public,
      approved_by_sender: updated.approved_by_sender,
      approved_by_receiver: updated.approved_by_receiver,
      editing_permission_user_id: updated.editing_permission_user_id,
      transfer_type: updated.transfer_type,
      message: updated.message || null,
      image_url: updated.image_url,
      category: updated.category,
      location: updated.location,
      description: updated.description,
      fromUser: {
        username: updated.from_username,
        profileImageUrl: updated.from_image,
        userId: updated.from_user_id,
      },
      toUser: {
        username: updated.to_username,
        profileImageUrl: updated.to_image,
        userId: updated.to_user_id,
      },
      isSender: updated.from_user_id === userId,
      isReceiver: updated.to_user_id === userId,
    });
  } catch (error: any) {
    console.error('[transfers/change-type] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

