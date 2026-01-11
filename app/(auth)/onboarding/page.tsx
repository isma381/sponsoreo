'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, Check, RefreshCw } from 'lucide-react';

export default function OnboardingPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [pendingWalletAddress, setPendingWalletAddress] = useState('');
  const [verificationAddress, setVerificationAddress] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'verified'>('idle');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // Verificar estado inicial
  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    try {
      const response = await fetch('/api/wallet/status');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Error al verificar estado');
      }

      const data = await response.json();
      if (data.wallet) {
        setVerificationAddress(data.wallet.verification_address);
        setPendingWalletAddress(data.wallet.address);
        setStatus(data.wallet.status);
        if (data.wallet.status === 'verified') {
          router.push('/onboarding/complete');
        }
      }
    } catch (err: any) {
      console.error('Error verificando estado:', err);
    }
  };

  const handleManualVerification = async () => {
    setChecking(true);
    setError('');

    try {
      const response = await fetch('/api/wallet/check-verification');
      
      if (response.status === 429) {
        const data = await response.json();
        setError('Demasiados intentos. Por favor espera un momento.');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al verificar wallet');
      }

      const data = await response.json();
      if (data.verified) {
        setStatus('verified');
        router.push('/onboarding/complete');
      } else {
        setError('La wallet aún no ha sido verificada. Asegúrate de haber enviado la transferencia.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { getCSRFHeaders } = await import('@/lib/csrf-client');
      const csrfHeaders = await getCSRFHeaders();

      const response = await fetch('/api/wallet/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify({ address: walletAddress }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al registrar wallet');
      }

      const data = await response.json();
      setVerificationAddress(data.verification_address);
      setPendingWalletAddress(walletAddress);
      setStatus('pending');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <>
      {status === 'idle' ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-muted p-8">
            <h1 className="text-2xl font-bold">Verificar Wallet</h1>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="wallet" className="block text-sm font-medium">
                  Dirección de tu wallet
                </label>
                <input
                  id="wallet"
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  placeholder="0x..."
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading || !isValidAddress(walletAddress)}
                className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-muted-foreground disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Sheet open={true} onOpenChange={() => {}}>
          <SheetContent onClose={() => {}}>
            <SheetHeader>
              <SheetTitle>Verificar Wallet</SheetTitle>
            </SheetHeader>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tu wallet a verificar
                </label>
                <input
                  type="text"
                  value={pendingWalletAddress}
                  readOnly
                  className="w-full rounded-md border px-3 py-2 font-mono text-sm bg-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Dirección de verificación
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verificationAddress}
                    readOnly
                    className="flex-1 rounded-md border px-3 py-2 font-mono text-sm"
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
                  <input
                    type="text"
                    value="0.0000001"
                    readOnly
                    className="flex-1 rounded-md border px-3 py-2 font-mono text-sm"
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
                  Envía wARS, USDC (o cualquier token ERC-20) a la Dirección de Verificación para verificar tu wallet. Luego de enviar la transferencia, presioná el botón de abajo para verificar tu wallet!
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                <span>Pendiente de verificación</span>
              </div>
              <button
                onClick={handleManualVerification}
                disabled={checking}
                className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-muted-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checking ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Verificar wallet
                  </>
                )}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
