import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { uploadImage } from '@/lib/blob';
import { sanitizeTextWithLinks, validateLength } from '@/lib/sanitize';

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
    const descriptionRaw = formData.get('description') as string | null;
    const privacyMode = formData.get('privacy_mode') as string | null;
    const categoryRaw = formData.get('category') as string | null;
    const locationRaw = formData.get('location') as string | null;
    const sociosEnabled = formData.get('socios_enabled') as string | null;

    // Sanitizar inputs
    let description: string | null = null;
    let category: string | null = null;
    let location: string | null = null;

    try {
      if (descriptionRaw) {
        const trimmed = descriptionRaw.trim();
        description = trimmed ? validateLength(sanitizeTextWithLinks(trimmed), 2000) : null;
      }
      if (categoryRaw) {
        const trimmed = categoryRaw.trim();
        category = trimmed ? validateLength(sanitizeTextWithLinks(trimmed), 50) : null;
      }
      if (locationRaw) {
        const trimmed = locationRaw.trim();
        location = trimmed ? validateLength(sanitizeTextWithLinks(trimmed), 200) : null;
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'El texto excede la longitud máxima permitida' },
        { status: 400 }
      );
    }

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
      values.push(description);
    }

    if (privacyMode !== null) {
      updates.push(`privacy_mode = $${paramIndex++}`);
      values.push(privacyMode);
    }

    if (category !== null) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }

    if (location !== null) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }

    if (sociosEnabled !== null) {
      // Validar que sociosEnabled sea boolean
      let sociosEnabledBool: boolean;
      if (typeof sociosEnabled === 'boolean') {
        sociosEnabledBool = sociosEnabled;
      } else if (typeof sociosEnabled === 'string') {
        if (sociosEnabled !== 'true' && sociosEnabled !== 'false') {
          return NextResponse.json(
            { error: 'socios_enabled debe ser true o false' },
            { status: 400 }
          );
        }
        sociosEnabledBool = sociosEnabled === 'true';
      } else {
        return NextResponse.json(
          { error: 'socios_enabled debe ser boolean' },
          { status: 400 }
        );
      }
      updates.push(`socios_enabled = $${paramIndex++}`);
      values.push(sociosEnabledBool);
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
