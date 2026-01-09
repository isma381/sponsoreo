'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Wallet, Plus, Pause, Play, X, Copy, Check, Users } from 'lucide-react';
import Link from 'next/link';

interface WalletData {
  id: string;
  address: string;
  status: 'pending' | 'verified';
  is_paused: boolean;
  is_canceled: boolean;
  is_socios_wallet?: boolean;
  is_public_wallet?: boolean;
  created_at: string;
}

export default function WalletsSettingsPage() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sociosEnabled, setSociosEnabled] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [pendingWalletAddress, setPendingWalletAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [verificationAddress, setVerificationAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [pendingSociosWallet, setPendingSociosWallet] = useState<string | null>(null);
  const [pendingPublicWallet, setPendingPublicWallet] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const router = useRouter();

  // Verificar wallet verificada antes de cargar datos
  useEffect(() => {
    const checkWallet = async () => {
      const walletStatus = await fetch('/api/wallet/status', { cache: 'no-store' });
      if (!walletStatus.ok) {
        if (walletStatus.status === 401) {
          router.push('/login');
          return;
        }
        router.push('/onboarding');
        return;
      }
      
      const walletData = await walletStatus.json();
      if (!walletData.wallet || walletData.wallet.status !== 'verified') {
        router.push('/onboarding');
        return;
      }
      
      // Verificar username si es necesario
      const userRes = await fetch('/api/auth/me', { cache: 'no-store' });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (!userData.user?.username) {
          router.push('/onboarding/complete');
          return;
        }
      }
    };
    
    checkWallet();
  }, [router]);

  useEffect(() => {
    const loadInitialData = async () => {
      const walletsData = await fetchWallets();
      await fetchProfile();
      
      // Verificar wallets pendientes SOLO al cargar la página (recarga)
      // Esta es la única vez que se verifica con Alchemy
      if (walletsData && walletsData.length > 0) {
        const hasPending = walletsData.some((w: WalletData) => w.status === 'pending');
        if (hasPending) {
          await checkPendingWallets();
        }
      }
    };
    
    loadInitialData();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setSociosEnabled(data.profile.socios_enabled || false);
      }
    } catch (err) {
      console.error('Error cargando perfil:', err);
    }
  };


  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallet/manage');
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error('Error al cargar wallets');
      const data = await response.json();
      const walletsData = data.wallets || [];
      
      setWallets(walletsData);
      // Inicializar estados temporales con valores actuales
      const currentSocios = walletsData.find((w: WalletData) => w.is_socios_wallet);
      const currentPublic = walletsData.find((w: WalletData) => w.is_public_wallet);
      setPendingSociosWallet(currentSocios?.id || null);
      setPendingPublicWallet(currentPublic?.id || null);
      
      return walletsData;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const checkPendingWallets = async () => {
    try {
      const checkResponse = await fetch('/api/wallet/check-verification');
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.verified) {
          // Recargar wallets primero para obtener el estado actualizado
          await fetchWallets();
          // Luego mostrar el mensaje de éxito (después de que loading sea false)
          setVerificationSuccess(true);
          // Ocultar mensaje de éxito después de 5 segundos
          setTimeout(() => setVerificationSuccess(false), 5000);
        }
      }
    } catch (err) {
      console.error('Error verificando wallets:', err);
    }
  };

  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdding(true);

    try {
      if (!isValidAddress(walletAddress)) {
        throw new Error('Dirección de wallet inválida');
      }

      const response = await fetch('/api/wallet/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al agregar wallet');
      }

      const data = await response.json();
      setVerificationAddress(data.verification_address);
      setPendingWalletAddress(walletAddress);
      setWalletAddress('');
      setAdding(false);
      await fetchWallets();
    } catch (err: any) {
      setError(err.message);
      setAdding(false);
    }
  };

  const handleTogglePause = async (walletId: string, currentPaused: boolean) => {
    try {
      const response = await fetch('/api/wallet/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, isPaused: !currentPaused }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar wallet');
      }

      await fetchWallets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDisconnect = async (walletId: string) => {
    if (!confirm('¿Estás seguro de que quieres desconectar esta wallet?')) {
      return;
    }

    try {
      const response = await fetch(`/api/wallet/manage?walletId=${walletId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al desconectar wallet');
      }

      await fetchWallets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetSociosWallet = async (walletId: string | null) => {
    try {
      if (walletId) {
        const response = await fetch('/api/wallet/manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId, isSociosWallet: true }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al configurar wallet de Socios');
        }
      } else {
        // Desmarcar todas las wallets de Socios
        const sociosWallet = wallets.find(w => w.is_socios_wallet);
        if (sociosWallet) {
          const response = await fetch('/api/wallet/manage', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletId: sociosWallet.id, isSociosWallet: false }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al desmarcar wallet de Socios');
          }
        }
      }

      await fetchWallets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetPublicWallet = async (walletId: string | null) => {
    try {
      if (walletId) {
        const response = await fetch('/api/wallet/manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletId, isPublicWallet: true }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al configurar wallet pública');
        }
      } else {
        // Desmarcar wallet pública actual
        const currentPublicWallet = wallets.find(w => w.is_public_wallet);
        if (currentPublicWallet) {
          const response = await fetch('/api/wallet/manage', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletId: currentPublicWallet.id, isPublicWallet: false }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al desmarcar wallet pública');
          }
        }
      }

      await fetchWallets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConfirmSociosWallet = async () => {
    const currentSocios = wallets.find(w => w.is_socios_wallet);
    const currentId = currentSocios?.id || null;
    if (pendingSociosWallet === currentId) return;
    await handleSetSociosWallet(pendingSociosWallet);
    // Los estados se actualizarán automáticamente después de fetchWallets
  };

  const handleConfirmPublicWallet = async () => {
    const currentPublic = wallets.find(w => w.is_public_wallet);
    const currentId = currentPublic?.id || null;
    if (pendingPublicWallet === currentId) return;
    await handleSetPublicWallet(pendingPublicWallet);
    // Los estados se actualizarán automáticamente después de fetchWallets
  };

  const hasSociosWalletChange = () => {
    const currentSocios = wallets.find(w => w.is_socios_wallet);
    const currentId = currentSocios?.id || null;
    return pendingSociosWallet !== currentId;
  };

  const hasPublicWalletChange = () => {
    const currentPublic = wallets.find(w => w.is_public_wallet);
    const currentId = currentPublic?.id || null;
    return pendingPublicWallet !== currentId;
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
        <main className="container mx-auto px-0 lg:px-4 py-8">
          <Card className="border-0 lg:border">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Cargando...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
      <main className="container mx-auto px-0 lg:px-4 py-8">
        <Card className="border-0 lg:border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Gestionar Wallets
                </CardTitle>
                <CardDescription>Administra tus wallets conectadas</CardDescription>
              </div>
              <Link href="/dashboard/settings">
                <Button variant="outline" size="sm">
                  Volver
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {verificationSuccess && (
              <div className="rounded-md border border-green-500 bg-green-500/20 p-4">
                <p className="text-sm text-green-500 font-medium">
                  ✓ Wallet verificada exitosamente
                </p>
              </div>
            )}

            {/* Selector de wallet de Socios */}
            {sociosEnabled && (
            <div className="border border-border rounded-lg p-4 bg-muted">
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Wallet de Socios
              </label>
              <select
                value={pendingSociosWallet || 'none'}
                onChange={(e) => setPendingSociosWallet(e.target.value === 'none' ? null : e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm"
              >
                <option value="none">Ninguna</option>
                {wallets
                  .filter(w => w.status === 'verified')
                  .map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.address}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Las transferencias recibidas en esta wallet se marcarán automáticamente como tipo "Socios"
              </p>
              {hasSociosWalletChange() && (
                <Button
                  onClick={handleConfirmSociosWallet}
                  className="w-full mt-3"
                  size="sm"
                >
                  Confirmar
                </Button>
              )}
            </div>
            )}

            {/* Selector de wallet pública */}
            <div className="border border-border rounded-lg p-4 bg-muted">
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet para Perfil Público
              </label>
              <select
                value={pendingPublicWallet || 'none'}
                onChange={(e) => setPendingPublicWallet(e.target.value === 'none' ? null : e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm"
              >
                <option value="none">Ninguna</option>
                {wallets
                  .filter(w => w.status === 'verified' && !w.is_socios_wallet)
                  .map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.address}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Esta wallet se mostrará en tu perfil público para que otros usuarios puedan enviarte tokens
              </p>
              {hasPublicWalletChange() && (
                <Button
                  onClick={handleConfirmPublicWallet}
                  className="w-full mt-3"
                  size="sm"
                >
                  Confirmar
                </Button>
              )}
            </div>

            <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Wallet
            </Button>

            {wallets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tienes wallets conectadas
              </p>
            ) : (
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm break-all">{wallet.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              wallet.status === 'verified'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-yellow-500/20 text-yellow-500'
                            }`}
                          >
                            {wallet.status === 'verified' ? 'Verificada' : 'Pendiente'}
                          </span>
                          {wallet.is_paused && (
                            <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-500">
                              Pausada
                            </span>
                          )}
                          {wallet.is_socios_wallet && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Socios
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {wallet.status === 'verified' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePause(wallet.id, wallet.is_paused)}
                        >
                          {wallet.is_paused ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Reanudar
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Pausar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisconnect(wallet.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Desconectar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Sheet open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) {
          setVerificationAddress('');
        }
      }}>
        <SheetContent onClose={() => setShowAddModal(false)}>
          <SheetHeader>
            <SheetTitle>Agregar Wallet</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6 space-y-4">
            {verificationAddress ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tu wallet a verificar
                  </label>
                  <Input
                    type="text"
                    value={pendingWalletAddress}
                    readOnly
                    className="font-mono text-sm bg-muted"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dirección de verificación
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={verificationAddress}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(verificationAddress)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Monto mínimo a enviar
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value="0.0000001"
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard('0.0000001')}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    Envía wARS, USDC (o cualquier token ERC-20) a esta dirección para verificar tu wallet. Luego de enviar la transferencia, recarga la página y verás tu wallet verificada.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowAddModal(false);
                    setVerificationAddress('');
                    fetchWallets();
                  }}
                >
                  Cerrar
                </Button>
              </>
            ) : (
              <form onSubmit={handleAddWallet} className="space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium mb-2">
                    Dirección de wallet
                  </label>
                  <Input
                    id="address"
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddModal(false);
                      setWalletAddress('');
                      setError('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={adding || !isValidAddress(walletAddress)}
                  >
                    {adding ? 'Agregando...' : 'Agregar'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
