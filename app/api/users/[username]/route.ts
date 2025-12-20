import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username.toLowerCase();

    const users = await executeQuery(
      `SELECT id, username, profile_image_url, description, category, location, created_at
       FROM users 
       WHERE LOWER(username) = $1`,
      [username]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = users[0];

    return NextResponse.json({
      profile: {
        id: user.id,
        username: user.username,
        profile_image_url: user.profile_image_url,
        description: user.description,
        category: user.category,
        location: user.location,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo perfil público:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

