import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { sendTransferApprovalNotification } from '@/lib/resend';
import { validateCSRFToken } from '@/lib/csrf';
import { logAction } from '@/lib/logger';

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

    // Validar token CSRF
    const csrfToken = request.headers.get('X-CSRF-Token') || request.headers.get('csrf-token');
    const isValidCSRF = await validateCSRFToken(csrfToken);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'Token CSRF inválido o faltante' },
        { status: 403 }
      );
    }

    const { transferId } = await params;

    // Validar transferId
    if (!transferId || typeof transferId !== 'string' || transferId.trim() === '') {
      return NextResponse.json(
        { error: 'transferId inválido' },
        { status: 400 }
      );
    }

    // Obtener transferencia y verificar que el usuario participa
    const transfers = await executeQuery(
      `SELECT t.*, 
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id,
        u_from.email as from_email,
        u_from.username as from_username,
        u_to.email as to_email,
        u_to.username as to_username
      FROM transfers t
      JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
      JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
      JOIN users u_from ON w_from.user_id = u_from.id
      JOIN users u_to ON w_to.user_id = u_to.id
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

    // Verificar que el usuario es emisor o receptor
    const isSender = transfer.from_user_id === userId;
    const isReceiver = transfer.to_user_id === userId;

    if (!isSender && !isReceiver) {
      return NextResponse.json(
        { error: 'No tienes permisos para aprobar esta transferencia' },
        { status: 403 }
      );
    }

    // Verificar que la transferencia no esté pública ya
    if (transfer.is_public) {
      return NextResponse.json(
        { error: 'La transferencia ya está pública' },
        { status: 400 }
      );
    }

    // Actualizar aprobación según el rol del usuario
    let updatedApproval = {};
    if (isSender) {
      await executeQuery(
        `UPDATE transfers SET approved_by_sender = true WHERE id = $1`,
        [transferId]
      );
      updatedApproval = { approved_by_sender: true };
    } else if (isReceiver) {
      await executeQuery(
        `UPDATE transfers SET approved_by_receiver = true WHERE id = $1`,
        [transferId]
      );
      updatedApproval = { approved_by_receiver: true };
    }

    // Verificar si ambos aprobaron para hacer pública
    const updatedTransfer = await executeQuery(
      `SELECT approved_by_sender, approved_by_receiver FROM transfers WHERE id = $1`,
      [transferId]
    );

    if (updatedTransfer.length > 0) {
      const t = updatedTransfer[0];
      const madePublic = t.approved_by_sender && t.approved_by_receiver;
      
      if (madePublic) {
        await executeQuery(
          `UPDATE transfers SET is_public = true WHERE id = $1`,
          [transferId]
        );
      }
      
      // Log de aprobación (dentro del if para tener acceso a 't')
      logAction('transfer_approve', request, {
        userId,
        success: true,
        metadata: { 
          transferId,
          role: isSender ? 'sender' : 'receiver',
          madePublic,
        },
      });
    }

    // Enviar notificación al otro usuario
    try {
      const otherUserEmail = isSender ? transfer.to_email : transfer.from_email;
      const approverUsername = isSender ? transfer.from_username : transfer.to_username;
      
      if (otherUserEmail) {
        await sendTransferApprovalNotification(
          otherUserEmail,
          transfer.hash,
          approverUsername
        );
      }
    } catch (emailError) {
      console.error('[approve] Error enviando email:', emailError);
      // No fallar la operación si el email falla
    }

    // Obtener estado actualizado
    const finalTransfer = await executeQuery(
      `SELECT is_public, approved_by_sender, approved_by_receiver FROM transfers WHERE id = $1`,
      [transferId]
    );

    return NextResponse.json({
      success: true,
      transfer: finalTransfer[0],
    });
  } catch (error: any) {
    console.error('[transfers/approve] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
