'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [verificationAddress, setVerificationAddress] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'verified'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // Verificar estado inicial
  useEffect(() => {
    checkWalletStatus();
  }, []);

  // Polling cada 30 segundos si está en pending
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(() => {
      checkVerification();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [status]);

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
        setStatus(data.wallet.status);
        if (data.wallet.status === 'verified') {
          router.push('/onboarding/complete');
        }
      }
    } catch (err: any) {
      console.error('Error verificando estado:', err);
    }
  };

  const checkVerification = async () => {
    try {
      const response = await fetch('/api/wallet/check-verification');
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.verified) {
        setStatus('verified');
        router.push('/onboarding/complete');
      }
    } catch (err: any) {
      console.error('Error verificando:', err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/wallet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al registrar wallet');
      }

      const data = await response.json();
      setVerificationAddress(data.verification_address);
      setStatus('pending');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(verificationAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  if (status === 'pending' || status === 'verified') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-muted p-8">
          <h1 className="text-2xl font-bold">Verificar Wallet</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Dirección de verificación
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationAddress}
                  readOnly
                  className="flex-1 rounded-md border px-3 py-2"
                />
                <button
                  onClick={copyToClipboard}
                  className="rounded-md border px-4 py-2 hover:bg-gray-700"
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="rounded-md border border-gray-600 bg-gray-900 p-4">
              <p className="text-sm text-gray-400">
                Envía USDC a esta dirección para verificar tu wallet. El proceso puede tardar unos minutos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span className="text-sm text-gray-400">
                Pendiente de verificación
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
  );
}
