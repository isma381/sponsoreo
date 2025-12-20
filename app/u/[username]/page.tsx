'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Tag, Edit, Calendar } from 'lucide-react';
import { TransferCard } from '@/components/TransferCard';

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

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transfers, setTransfers] = useState<EnrichedTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener perfil
        const profileResponse = await fetch(`/api/users/${username}`);
        if (!profileResponse.ok) {
          if (profileResponse.status === 404) {
            setError('Usuario no encontrado');
          } else {
            throw new Error('Error al cargar perfil');
          }
          return;
        }
        const profileData = await profileResponse.json();
        setProfile(profileData.profile);

        // Verificar si es el usuario actual
        const authResponse = await fetch('/api/auth/check');
        if (authResponse.ok) {
          const currentProfileResponse = await fetch('/api/profile');
          if (currentProfileResponse.ok) {
            const currentProfile = await currentProfileResponse.json();
            setIsCurrentUser(currentProfile.profile.username?.toLowerCase() === username.toLowerCase());
          }
        }

        // Obtener transferencias
        const transfersResponse = await fetch(`/api/users/${username}/transfers`);
        if (transfersResponse.ok) {
          const transfersData = await transfersResponse.json();
          setTransfers(transfersData.transfers || []);
        }
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchData();
    }
  }, [username]);

  const formatValue = (transfer: EnrichedTransfer) => {
    const decimals = parseInt(transfer.rawContract.decimal);
    const value = BigInt(transfer.rawContract.value);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(value) / Number(divisor);
    return formatted;
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
        <main className="container mx-auto py-8">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando perfil...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
        <main className="container mx-auto py-8">
          <Card className="border-0 lg:border">
            <CardContent className="py-8">
              <p className="text-center text-destructive">{error || 'Usuario no encontrado'}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
      <main className="container mx-auto px-0 lg:px-4 py-8">
        <Card className="border-0 lg:border overflow-hidden">
          {/* Header con imagen de portada (placeholder) */}
          <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/10 border-b border-border" />

          <CardContent className="p-0">
            {/* Sección de perfil */}
            <div className="px-4 sm:px-6 pb-6">
              {/* Imagen de perfil posicionada sobre el header */}
              <div className="relative -mt-20 mb-4">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-background overflow-hidden bg-muted">
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
                <div className="mb-4">
                  <Link href="/dashboard/settings">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar perfil
                    </Button>
                  </Link>
                </div>
              )}

              {/* Información del usuario */}
              <div className="space-y-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{profile.username}</h1>
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
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.location}</span>
                  </div>
                )}

                {/* Categoría */}
                {profile.category && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.category}</span>
                  </div>
                )}

                {/* Descripción con links */}
                {profile.description && (
                  <div className="pt-2">
                    <p
                      className="text-foreground whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: extractLinks(profile.description) }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Separador */}
            <div className="h-px bg-border" />

            {/* Transferencias */}
            <div className="px-4 sm:px-6 py-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Transferencias</h2>
              {transfers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay transferencias públicas
                </p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {transfers.map((transfer) => {
                    const value = formatValue(transfer);
                    return (
                      <TransferCard
                        key={transfer.hash}
                        transfer={{
                          id: transfer.hash,
                          hash: transfer.hash,
                          from: transfer.from,
                          to: transfer.to,
                          value,
                          token: transfer.token,
                          chain: transfer.chain,
                          chainId: transfer.chainId,
                          contractAddress: transfer.contractAddress,
                          created_at: transfer.created_at,
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
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

