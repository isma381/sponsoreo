import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { uploadImage, MAX_FILE_SIZE_PROFILE } from '@/lib/blob';
import { sanitizeUsername } from '@/lib/sanitize';
import { validateCSRFToken } from '@/lib/csrf';

export async function POST(request: NextRequest) {
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
    const privacyMode = (formData.get('privacy_mode') as string) || 'auto';

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username requerido' },
        { status: 400 }
      );
    }

    // Sanitizar username
    const trimmedUsername = sanitizeUsername(username);

    // Validar formato de username
    if (!trimmedUsername || !/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return NextResponse.json(
        { error: 'Username inválido. Solo letras, números, guiones y guiones bajos.' },
        { status: 400 }
      );
    }

    // Validar privacy_mode
    if (privacyMode !== 'auto' && privacyMode !== 'approval') {
      return NextResponse.json(
        { error: 'Modo de privacidad inválido' },
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
      try {
        profileImageUrl = await uploadImage(imageFile, MAX_FILE_SIZE_PROFILE);
      } catch (error: any) {
        console.error('Error subiendo imagen:', error);
        return NextResponse.json(
          { error: error.message || 'Error al subir la imagen' },
          { status: 400 }
        );
      }
    }

    // Actualizar usuario
    if (profileImageUrl) {
      await executeQuery(
        'UPDATE users SET username = $1, profile_image_url = $2, privacy_mode = $3, updated_at = now() WHERE id = $4',
        [trimmedUsername, profileImageUrl, privacyMode, userId]
      );
    } else {
      await executeQuery(
        'UPDATE users SET username = $1, privacy_mode = $2, updated_at = now() WHERE id = $3',
        [trimmedUsername, privacyMode, userId]
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
