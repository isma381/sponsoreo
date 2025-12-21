import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { uploadImage } from '@/lib/blob';

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

    const { transferId } = await params;

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
    const category = formData.get('category') as string | null;
    const location = formData.get('location') as string | null;
    const description = formData.get('description') as string | null;
    const imageFile = formData.get('image') as File | null;

    let imageUrl = transfer.image_url;

    // Subir nueva imagen si existe
    if (imageFile && imageFile.size > 0) {
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'El archivo debe ser una imagen' },
          { status: 400 }
        );
      }

      if (imageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'La imagen no debe superar los 5MB' },
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
        category?.trim() || null,
        location?.trim() || null,
        description?.trim() || null,
        transferId,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[transfers/edit] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
