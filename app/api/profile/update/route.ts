import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { uploadImage } from '@/lib/blob';

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const description = formData.get('description') as string | null;
    const privacyMode = formData.get('privacy_mode') as string | null;

    // Validar privacy_mode si se proporciona
    if (privacyMode && privacyMode !== 'auto' && privacyMode !== 'approval') {
      return NextResponse.json(
        { error: 'Modo de privacidad inválido' },
        { status: 400 }
      );
    }

    let profileImageUrl: string | null | undefined = undefined;

    // Subir imagen si se proporcionó
    if (imageFile && imageFile.size > 0) {
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'El archivo debe ser una imagen' },
          { status: 400 }
        );
      }

      if (imageFile.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'La imagen no debe superar los 15MB' },
          { status: 400 }
        );
      }

      try {
        profileImageUrl = await uploadImage(imageFile);
      } catch (error: any) {
        console.error('Error subiendo imagen:', error);
        return NextResponse.json(
          { error: 'Error al subir la imagen' },
          { status: 500 }
        );
      }
    }

    // Construir query dinámicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (profileImageUrl !== undefined) {
      updates.push(`profile_image_url = $${paramIndex++}`);
      values.push(profileImageUrl);
    }

    if (description !== null) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description.trim() || null);
    }

    if (privacyMode !== null) {
      updates.push(`privacy_mode = $${paramIndex++}`);
      values.push(privacyMode);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = now()`);
    values.push(userId);

    await executeQuery(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error actualizando perfil:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
