'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Calendar } from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { PublicWalletInfo } from '@/components/PublicWalletInfo';
import UserTransfers from './UserTransfers';
import { Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  profile_image_url: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  created_at: string;
  publicWallet: string | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [hasCurrentUserWallet, setHasCurrentUserWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!hasLoadedOnce) {
        setLoading(true);
      }
      
      try {
        const [profileRes, currentUserRes] = await Promise.all([
          fetch(`/api/users/${username}`, { cache: 'force-cache' }),
          fetch('/api/auth/me', { cache: 'force-cache' })
        ]);

        if (profileRes.status === 404) {
          router.push('/404');
          return;
        }

        if (!profileRes.ok) throw new Error('Error al cargar perfil');

        const profileData = await profileRes.json();
        setProfile(profileData.profile);

        if (currentUserRes.ok) {
          const currentUserData = await currentUserRes.json();
          if (currentUserData.user) {
            setCurrentUser(currentUserData.user);
            if (currentUserData.user.username?.toLowerCase() === username.toLowerCase()) {
              const walletRes = await fetch('/api/wallet/manage', { cache: 'force-cache' });
              if (walletRes.ok) {
                const walletData = await walletRes.json();
                setHasCurrentUserWallet(walletData.wallets?.some((w: any) => w.status === 'verified') || false);
              }
            }
          }
        }

        setHasLoadedOnce(true);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, router]);

  if (loading && !hasLoadedOnce) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
        <main className="container mx-auto px-0 lg:px-4 py-8">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const isCurrentUser = currentUser?.username?.toLowerCase() === username.toLowerCase();

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
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return escaped.replace(urlRegex, (url) => {
      try {
        const urlObj = new URL(url);
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
          <div className="h-40 sm:h-48 bg-gradient-to-r from-primary/20 to-primary/10 border-b border-border" />

          <CardContent className="p-0">
            <div className="px-4 sm:px-6 pb-6">
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

              <div className="space-y-2">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{profile.username}</h1>
                </div>

                {profile.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Se unió en {formatJoinDate(profile.created_at)}</span>
                  </div>
                )}

                {profile.location && (
                  <div className="text-sm">
                    <span className="text-xs font-medium text-muted-foreground">Ubicación: </span>
                    <span className="text-sm text-foreground">{profile.location}</span>
                  </div>
                )}

                {profile.category && (
                  <div className="text-sm">
                    <span className="text-xs font-medium text-muted-foreground">Categoría: </span>
                    <span className="text-sm text-foreground">{profile.category}</span>
                  </div>
                )}

                {profile.description && (
                  <div className="pt-1">
                    <p
                      className="text-foreground whitespace-pre-wrap break-words text-sm"
                      dangerouslySetInnerHTML={{ __html: extractLinks(profile.description) }}
                    />
                  </div>
                )}

                {profile.publicWallet && (
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-foreground break-all">{profile.publicWallet}</code>
                    <CopyButton text={profile.publicWallet} />
                    {hasCurrentUserWallet && <PublicWalletInfo />}
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="px-4 sm:px-6 py-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Transferencias</h2>
              <UserTransfers username={username} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
