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

    const users = await executeQuery(
      'SELECT id, username, profile_image_url, description, privacy_mode, category, location FROM users WHERE id = $1',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile: {
        username: users[0].username,
        profile_image_url: users[0].profile_image_url,
        description: users[0].description,
        privacy_mode: users[0].privacy_mode || 'auto',
        category: users[0].category,
        location: users[0].location,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo perfil:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
