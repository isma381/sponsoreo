import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { uploadImage } from '@/lib/blob';
import { sanitizeTextWithLinks, validateLength } from '@/lib/sanitize';
import { validateCSRFToken } from '@/lib/csrf';
import { logAction } from '@/lib/logger';

export async function PUT(
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

    // Obtener transferencia y verificar permisos
    const transfers = await executeQuery(
      `SELECT t.*, 
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id
      FROM transfers t
      JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
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

    // Verificar que la transferencia sea de tipo 'sponsoreo'
    if (transfer.transfer_type !== 'sponsoreo') {
      return NextResponse.json(
        { error: 'Solo las transferencias de tipo "sponsoreo" pueden ser editadas' },
        { status: 400 }
      );
    }

    // Verificar permisos: editing_permission_user_id = user_id O (editing_permission_user_id IS NULL Y usuario es emisor)
    const hasPermission =
      transfer.editing_permission_user_id === userId ||
      (transfer.editing_permission_user_id === null && transfer.from_user_id === userId);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar esta transferencia' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const categoryRaw = formData.get('category') as string | null;
    const locationRaw = formData.get('location') as string | null;
    const descriptionRaw = formData.get('description') as string | null;
    const imageFile = formData.get('image') as File | null;
    const isPublicParam = formData.get('is_public') as string | null;
    const isPublicValue = isPublicParam === 'true' ? true : isPublicParam === 'false' ? false : null;

    // Sanitizar inputs
    let category: string | null = null;
    let location: string | null = null;
    let description: string | null = null;

    try {
      if (categoryRaw) {
        const trimmed = categoryRaw.trim();
        category = trimmed ? validateLength(sanitizeTextWithLinks(trimmed), 50) : null;
      }
      if (locationRaw) {
        const trimmed = locationRaw.trim();
        location = trimmed ? validateLength(sanitizeTextWithLinks(trimmed), 200) : null;
      }
      if (descriptionRaw) {
        const trimmed = descriptionRaw.trim();
        description = trimmed ? validateLength(sanitizeTextWithLinks(trimmed), 2000) : null;
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'El texto excede la longitud máxima permitida' },
        { status: 400 }
      );
    }

    let imageUrl = transfer.image_url;

    // Subir nueva imagen si existe
    if (imageFile && imageFile.size > 0) {
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'El archivo debe ser una imagen' },
          { status: 400 }
        );
      }

      if (imageFile.size > 100 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'La imagen no debe superar los 100MB' },
          { status: 400 }
        );
      }

      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error: any) {
        console.error('Error subiendo imagen:', error);
        return NextResponse.json(
          { error: 'Error al subir la imagen' },
          { status: 500 }
        );
      }
    }

    // Actualizar transferencia
    if (isPublicValue !== null) {
      // Si se especifica is_public, actualizarlo también
      await executeQuery(
        `UPDATE transfers 
        SET image_url = $1, 
            category = $2, 
            location = $3, 
            description = $4,
            is_public = $5,
            updated_at = now()
        WHERE id = $6`,
        [
          imageUrl,
          category,
          location,
          description,
          isPublicValue,
          transferId,
        ]
      );
    } else {
      // Si no se especifica is_public, mantener el comportamiento actual
      await executeQuery(
        `UPDATE transfers 
        SET image_url = $1, 
            category = $2, 
            location = $3, 
            description = $4,
            updated_at = now()
        WHERE id = $5`,
        [
          imageUrl,
          category,
          location,
          description,
          transferId,
        ]
      );
    }

    logAction('transfer_edit', request, {
      userId,
      success: true,
      metadata: { transferId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[transfers/edit] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
