'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { TransferCard } from '@/components/TransferCard';

interface EnrichedTransfer {
  blockNum: string;
  hash: string;
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
  tokenLogo?: string | null;
  fromUser: {
    username: string;
    profileImageUrl: string | null;
  };
  toUser: {
    username: string;
    profileImageUrl: string | null;
  };
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<EnrichedTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Primero cargar datos de BD (rápido)
        const cacheResponse = await fetch('/api/transfers?cache=true');
        if (cacheResponse.ok) {
          const cacheData = await cacheResponse.json();
          setTransfers(cacheData.transfers || []);
          setChainId(cacheData.chainId || null);
          setLoading(false);
        }

        // 2. Luego sincronizar con Alchemy
        setChecking(true);
        const syncResponse = await fetch('/api/transfers');

        if (!syncResponse.ok) {
          throw new Error('Error al sincronizar transferencias');
        }

        const syncData = await syncResponse.json();
        setTransfers(syncData.transfers || []);
        setChainId(syncData.chainId || null);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
        setChecking(false);
      }
    };

    fetchTransfers();
  }, []);

  const formatValue = (transfer: EnrichedTransfer) => {
    const decimals = parseInt(transfer.rawContract.decimal);
    const value = BigInt(transfer.rawContract.value);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(value) / Number(divisor);
    return formatted;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <main className="container mx-auto py-4 sm:py-8">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Transferencias</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Registro de todas las transferencias USDC entre usuarios registrados en la plataforma
                </CardDescription>
              </div>
              {chainId && transfers[0]?.chain && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 w-fit">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {transfers[0].chain}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {chainId}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {checking && (
              <div className="mb-4 p-3 bg-muted border border-border rounded-lg flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-primary">Chequeando nuevas transferencias...</span>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando transferencias...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            ) : transfers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No se encontraron transferencias entre usuarios registrados
              </p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {transfers.map((transfer, index) => {
                  const value = formatValue(transfer);
                  return (
                    <TransferCard
                      key={`${transfer.hash}-${index}`}
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
                        created_at: (transfer as any).created_at,
                        fromUser: {
                          username: transfer.fromUser.username,
                          profileImageUrl: transfer.fromUser.profileImageUrl,
                          userId: transfer.from,
                        },
                        toUser: {
                          username: transfer.toUser.username,
                          profileImageUrl: transfer.toUser.profileImageUrl,
                          userId: transfer.to,
                        },
                      }}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

