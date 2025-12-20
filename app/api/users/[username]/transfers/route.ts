import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: usernameParam } = await params;
    const username = usernameParam.toLowerCase();

    // Obtener el user_id del username
    const users = await executeQuery(
      'SELECT id FROM users WHERE LOWER(username) = $1',
      [username]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Obtener transferencias públicas donde el usuario participa
    const transfers = await executeQuery(
      `SELECT t.*, 
        u_from.username as from_username,
        u_from.profile_image_url as from_profile_image,
        u_to.username as to_username,
        u_to.profile_image_url as to_profile_image
       FROM transfers t
       LEFT JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
       LEFT JOIN users u_from ON w_from.user_id = u_from.id
       LEFT JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
       LEFT JOIN users u_to ON w_to.user_id = u_to.id
       WHERE (w_from.user_id = $1 OR w_to.user_id = $1)
         AND t.is_public = true
         AND u_from.username IS NOT NULL
         AND u_to.username IS NOT NULL
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [userId]
    );

    const formatTransfers = transfers.map((t: any) => ({
      hash: t.hash,
      blockNum: t.block_num,
      from: t.from_address,
      to: t.to_address,
      value: parseFloat(t.value),
      rawContract: {
        value: t.raw_contract_value,
        decimal: t.raw_contract_decimal,
      },
      token: t.token || 'USDC',
      chain: t.chain || 'Sepolia',
      contractAddress: t.contract_address,
      chainId: t.chain_id || SEPOLIA_CHAIN_ID,
      created_at: t.created_at ? new Date(t.created_at).toISOString() : undefined,
      fromUser: {
        username: t.from_username,
        profileImageUrl: t.from_profile_image,
        userId: t.from_address,
      },
      toUser: {
        username: t.to_username,
        profileImageUrl: t.to_profile_image,
        userId: t.to_address,
      },
    }));

    return NextResponse.json({
      transfers: formatTransfers,
      total: formatTransfers.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo transferencias del usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

