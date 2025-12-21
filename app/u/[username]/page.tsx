import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Tag, Edit, Calendar, Wallet, Info } from 'lucide-react';
import { TransferCard } from '@/components/TransferCard';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';
import { notFound } from 'next/navigation';
import { CopyButton } from '@/components/CopyButton';
import { PublicWalletInfo } from '@/components/PublicWalletInfo';

interface Profile {
  id: string;
  username: string;
  profile_image_url: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  created_at: string;
}

interface EnrichedTransfer {
  hash: string;
  blockNum: string;
  from: string;
  to: string;
  value: number;
  rawContract: {
    value: string;
    decimal: string;
  };
  token: string;
  chain: string;
  contractAddress: string | null;
  chainId: number;
  created_at: string | null;
  transfer_type?: string;
  message?: string | null;
  message_created_at?: string | null;
  message_updated_at?: string | null;
  fromUser: {
    username: string;
    profileImageUrl: string | null;
    userId: string;
  };
  toUser: {
    username: string;
    profileImageUrl: string | null;
    userId: string;
  };
}

export default async function UserProfilePage({ 
  params 
}: { 
  params: Promise<{ username: string }> 
}) {
  const { username } = await params;
  const usernameLower = username.toLowerCase();
  const currentUserId = await getAuthCookie();

  // Consultas en paralelo en el servidor
  const [users, currentUser, currentUserWallet, publicWalletResult] = await Promise.all([
    executeQuery(
      `SELECT id, username, profile_image_url, description, category, location, created_at
       FROM users 
       WHERE LOWER(username) = $1`,
      [usernameLower]
    ),
    currentUserId ? executeQuery(
      'SELECT username FROM users WHERE id = $1',
      [currentUserId]
    ) : Promise.resolve([]),
    currentUserId ? executeQuery(
      'SELECT id FROM wallets WHERE user_id = $1 AND status = $2 LIMIT 1',
      [currentUserId, 'verified']
    ) : Promise.resolve([]),
    executeQuery(
      `SELECT w.address FROM wallets w
       INNER JOIN users u ON w.user_id = u.id
       WHERE LOWER(u.username) = $1 AND w.is_public_wallet = true AND w.status = $2
       LIMIT 1`,
      [usernameLower, 'verified']
    )
  ]);

  if (users.length === 0) {
    notFound();
  }

  const profile = users[0];
  const isCurrentUser = currentUser.length > 0 && 
    currentUser[0].username?.toLowerCase() === usernameLower;
  const hasCurrentUserWallet = currentUserWallet.length > 0;
  const publicWallet = publicWalletResult.length > 0 ? publicWalletResult[0].address : null;

  // Obtener transferencias
  const userId = profile.id;
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

  const formatValue = (rawValue: string, decimal: string): number => {
    const decimals = parseInt(decimal);
    const value = BigInt(rawValue);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(value) / Number(divisor);
    return formatted;
  };

  const formatTransfers: EnrichedTransfer[] = transfers.map((t: any) => {
    const value = formatValue(t.raw_contract_value, t.raw_contract_decimal);
    return {
      hash: t.hash,
      blockNum: t.block_num,
      from: t.from_address,
      to: t.to_address,
      value,
      rawContract: {
        value: t.raw_contract_value,
        decimal: t.raw_contract_decimal,
      },
      token: t.token || 'USDC',
      chain: t.chain || 'Sepolia',
      contractAddress: t.contract_address,
      chainId: t.chain_id || SEPOLIA_CHAIN_ID,
      created_at: t.created_at ? new Date(t.created_at).toISOString() : null,
      transfer_type: t.transfer_type || 'generic',
      message: t.message || null,
      message_created_at: t.message_created_at ? new Date(t.message_created_at).toISOString() : null,
      message_updated_at: t.message_updated_at ? new Date(t.message_updated_at).toISOString() : null,
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
    };
  });

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const extractLinks = (text: string | null): string => {
    if (!text) return '';
    // Escapar HTML básico para seguridad
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return escaped.replace(urlRegex, (url) => {
      try {
        const urlObj = new URL(url);
        // Solo permitir http y https
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${url}</a>`;
        }
        return url;
      } catch {
        return url;
      }
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
      <main className="container mx-auto px-0 lg:px-4 py-8">
        <Card className="border-0 lg:border overflow-hidden">
          {/* Header con imagen de portada (placeholder) */}
          <div className="h-40 sm:h-48 bg-gradient-to-r from-primary/20 to-primary/10 border-b border-border" />

          <CardContent className="p-0">
            {/* Sección de perfil */}
            <div className="px-4 sm:px-6 pb-6">
              {/* Imagen de perfil posicionada sobre el header */}
              <div className="relative -mt-12 sm:-mt-20 mb-2">
                <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full border-4 border-background overflow-hidden bg-muted">
                  {profile.profile_image_url ? (
                    <Image
                      src={profile.profile_image_url}
                      alt={profile.username}
                      width={144}
                      height={144}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-4xl font-medium">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón Editar perfil (si es el usuario actual) */}
              {isCurrentUser && (
                <div className="mb-2">
                  <Link href="/dashboard/settings">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar perfil
                    </Button>
                  </Link>
                </div>
              )}

              {/* Información del usuario */}
              <div className="space-y-2">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{profile.username}</h1>
                </div>

                {/* Fecha de unión */}
                {profile.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Se unió en {formatJoinDate(profile.created_at)}</span>
                  </div>
                )}

                {/* Ubicación */}
                {profile.location && (
                  <div className="flex items-center gap-2 text-foreground text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.location}</span>
                  </div>
                )}

                {/* Categoría */}
                {profile.category && (
                  <div className="flex items-center gap-2 text-foreground text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.category}</span>
                  </div>
                )}

                {/* Descripción con links */}
                {profile.description && (
                  <div className="pt-1">
                    <p
                      className="text-foreground whitespace-pre-wrap break-words text-sm"
                      dangerouslySetInnerHTML={{ __html: extractLinks(profile.description) }}
                    />
                  </div>
                )}

                {/* Wallet pública */}
                {publicWallet && (
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-foreground break-all">{publicWallet}</code>
                    <CopyButton text={publicWallet} />
                    {hasCurrentUserWallet && <PublicWalletInfo />}
                  </div>
                )}
              </div>
            </div>

            {/* Separador */}
            <div className="h-px bg-border" />

            {/* Transferencias */}
            <div className="px-4 sm:px-6 py-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Transferencias</h2>
              {formatTransfers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay transferencias públicas
                </p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {formatTransfers.map((transfer) => (
                    <TransferCard
                      key={transfer.hash}
                      transfer={{
                        id: transfer.hash,
                        hash: transfer.hash,
                        from: transfer.from,
                        to: transfer.to,
                        value: transfer.value,
                        token: transfer.token,
                        chain: transfer.chain,
                        chainId: transfer.chainId,
                        contractAddress: transfer.contractAddress,
                        created_at: transfer.created_at || undefined,
                        transfer_type: transfer.transfer_type,
                        message: transfer.message,
                        message_created_at: transfer.message_created_at,
                        message_updated_at: transfer.message_updated_at,
                        fromUser: {
                          username: transfer.fromUser.username,
                          profileImageUrl: transfer.fromUser.profileImageUrl,
                          userId: transfer.fromUser.userId,
                        },
                        toUser: {
                          username: transfer.toUser.username,
                          profileImageUrl: transfer.toUser.profileImageUrl,
                          userId: transfer.toUser.userId,
                        },
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

