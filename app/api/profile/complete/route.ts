import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { uploadImage } from '@/lib/blob';

export async function POST(request: NextRequest) {
  try {
    const userId = getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario tenga wallet verificada
    const wallets = await executeQuery(
      'SELECT id FROM wallets WHERE user_id = $1 AND status = $2',
      [userId, 'verified']
    );

    if (wallets.length === 0) {
      return NextResponse.json(
        { error: 'Wallet no verificada' },
        { status: 403 }
      );
    }

    // Verificar que el usuario no tenga username ya asignado
    const users = await executeQuery(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (users[0].username) {
      return NextResponse.json(
        { error: 'El perfil ya está completo' },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const username = formData.get('username') as string;
    const imageFile = formData.get('image') as File | null;

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username requerido' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Validar formato de username
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return NextResponse.json(
        { error: 'Username inválido. Solo letras, números, guiones y guiones bajos.' },
        { status: 400 }
      );
    }

    // Verificar que el username no esté en uso
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [trimmedUsername, userId]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Este username ya está en uso' },
        { status: 409 }
      );
    }

    let profileImageUrl: string | null = null;

    // Subir imagen si se proporcionó
    if (imageFile && imageFile.size > 0) {
      // Validar tipo de archivo
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'El archivo debe ser una imagen' },
          { status: 400 }
        );
      }

      // Validar tamaño (15MB)
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

    // Actualizar usuario
    if (profileImageUrl) {
      await executeQuery(
        'UPDATE users SET username = $1, profile_image_url = $2, updated_at = now() WHERE id = $3',
        [trimmedUsername, profileImageUrl, userId]
      );
    } else {
      await executeQuery(
        'UPDATE users SET username = $1, updated_at = now() WHERE id = $2',
        [trimmedUsername, userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error completando perfil:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
