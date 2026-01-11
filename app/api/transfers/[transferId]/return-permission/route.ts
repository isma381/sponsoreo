import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { sendEditingPermissionReturned } from '@/lib/resend';

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

    // Validar transferId
    if (!transferId || typeof transferId !== 'string' || transferId.trim() === '') {
      return NextResponse.json(
        { error: 'transferId inválido' },
        { status: 400 }
      );
    }

    // Obtener transferencia y verificar permisos
    const transfers = await executeQuery(
      `SELECT t.*, 
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id,
        u_from.username as from_username,
        u_from.email as from_email,
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

    // Verificar que el usuario tenga permisos de edición (receptor)
    if (transfer.editing_permission_user_id !== userId) {
      return NextResponse.json(
        { error: 'No tienes permisos para devolver la edición' },
        { status: 403 }
      );
    }

    // Verificar que el usuario sea el receptor
    if (transfer.to_user_id !== userId) {
      return NextResponse.json(
        { error: 'Solo el receptor puede devolver permisos' },
        { status: 403 }
      );
    }

    // Actualizar editing_permission_user_id a NULL (devuelve al emisor)
    await executeQuery(
      `UPDATE transfers 
      SET editing_permission_user_id = NULL, updated_at = now()
      WHERE id = $1`,
      [transferId]
    );

    // Enviar email de notificación
    try {
      await sendEditingPermissionReturned(
        transfer.from_email,
        transfer.hash,
        transfer.to_username
      );
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
      // No fallar si el email falla
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[transfers/return-permission] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
