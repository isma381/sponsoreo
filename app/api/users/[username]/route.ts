import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: usernameParam } = await params;
    const username = usernameParam.toLowerCase();

    const [users, publicWalletResult] = await Promise.all([
      executeQuery(
        `SELECT id, username, profile_image_url, description, category, location, created_at
         FROM users 
         WHERE LOWER(username) = $1`,
        [username]
      ),
      executeQuery(
        `SELECT w.address FROM wallets w
         INNER JOIN users u ON w.user_id = u.id
         WHERE LOWER(u.username) = $1 AND w.is_public_wallet = true AND w.status = $2
         LIMIT 1`,
        [username, 'verified']
      )
    ]);

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = users[0];
    const publicWallet = publicWalletResult.length > 0 ? publicWalletResult[0].address : null;

    return NextResponse.json({
      profile: {
        id: user.id,
        username: user.username,
        profile_image_url: user.profile_image_url,
        description: user.description,
        category: user.category,
        location: user.location,
        created_at: user.created_at,
        publicWallet,
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

