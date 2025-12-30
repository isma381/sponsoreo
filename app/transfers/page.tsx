'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransferCard } from '@/components/TransferCard';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

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
  transfer_type?: string;
  message?: string | null;
  message_created_at?: string | null;
  message_updated_at?: string | null;
  fromUser: {
    username: string;
    profileImageUrl: string | null;
  };
  toUser: {
    username: string;
    profileImageUrl: string | null;
  };
}

type TransferTypeFilter = 'all' | 'sponsoreo';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<EnrichedTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TransferTypeFilter>('all');
  const [chainId, setChainId] = useState<number>(SEPOLIA_CHAIN_ID);

  const fetchTransfers = useCallback(async (showLoading: boolean = false, sync: boolean = false) => {
    try {
      const syncParam = sync ? '&sync=true' : '';
      const url = typeFilter === 'sponsoreo' 
        ? `/api/transfers/public?type=sponsoreo${syncParam}`
        : `/api/transfers/public${syncParam ? '?' + syncParam.substring(1) : ''}`;

      const fetchOptions: RequestInit = sync 
        ? { cache: 'no-store' }
        : {};

      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error('Error al cargar transferencias');
      }

      const data = await response.json();
      
      setTransfers(data.transfers || []);
      setChainId(data.chainId || SEPOLIA_CHAIN_ID);
      setHasLoadedOnce(true);
    } catch (err: any) {
      if (showLoading) {
        setError(err.message || 'Error desconocido');
      }
    }
  }, [typeFilter]);

  useEffect(() => {
    const loadData = async () => {
      // Detectar si es refresh (F5)
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isRefresh = navEntry?.type === 'reload';
      
      // Usar sessionStorage para trackear si ya se cargó en esta sesión
      const sessionKey = `transfers_loaded_${typeFilter}`;
      const wasLoadedInSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === 'true';
      const isFirstLoad = !wasLoadedInSession;
      
      // Solo hacer sync si es primera carga O refresh
      const shouldSync = isFirstLoad || isRefresh;
      
      // En navegación normal, NO hacer fetch, solo usar datos existentes
      if (!shouldSync && wasLoadedInSession && transfers.length > 0) {
        return; // No hacer nada, usar datos existentes
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Construir URL
        const syncParam = shouldSync ? '&sync=true' : '';
        const url = typeFilter === 'sponsoreo' 
          ? `/api/transfers/public?type=sponsoreo${syncParam}`
          : `/api/transfers/public${syncParam ? '?' + syncParam.substring(1) : ''}`;
        
        // En primera carga/refresh, hacer fetch normal
        const fetchOptions: RequestInit = shouldSync 
          ? { cache: 'no-store' }
          : { cache: 'force-cache' };
        
        // 1. Cargar datos (de BD o cache según corresponda)
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
          throw new Error('Error al cargar transferencias');
        }
        
        const data = await response.json();
        setTransfers(data.transfers || []);
        setChainId(data.chainId || SEPOLIA_CHAIN_ID);
        setHasLoadedOnce(true);
        setLoading(false);
        
        // 2. Solo sincronizar con Alchemy si es primera carga o refresh
        if (shouldSync) {
          await fetchTransfers(false, true);
          
          // Si es refresh, recargar datos SIN sync para que el navegador cachee la respuesta actualizada
          if (isRefresh) {
            const cacheUrl = typeFilter === 'sponsoreo' 
              ? `/api/transfers/public?type=sponsoreo`
              : `/api/transfers/public`;
            
            const cacheResponse = await fetch(cacheUrl, { cache: 'force-cache' });
            if (cacheResponse.ok) {
              const cacheData = await cacheResponse.json();
              setTransfers(cacheData.transfers || []);
              setChainId(cacheData.chainId || SEPOLIA_CHAIN_ID);
            }
          }
        }
        
        // Marcar como cargado en sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, 'true');
        }
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
        setLoading(false);
      }
    };
    
    loadData();
  }, [fetchTransfers, typeFilter]);

  const formatValue = (transfer: EnrichedTransfer) => {
    const decimals = parseInt(transfer.rawContract.decimal);
    const value = BigInt(transfer.rawContract.value);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(value) / Number(divisor);
    return formatted;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
      <main className="container mx-auto py-4 sm:py-8">
        <Card className="border-0 lg:border">
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
            {/* Tabs por tipo */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
                className="bg-primary text-primary-foreground"
              >
                Todas
              </Button>
              <Button
                variant={typeFilter === 'sponsoreo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('sponsoreo')}
              >
                Sponsoreo
              </Button>
            </div>

            {loading && !hasLoadedOnce ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando transferencias...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive">{error}</p>
              </div>
            ) : transfers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No se encontraron transferencias {typeFilter === 'sponsoreo' ? 'de tipo Sponsoreo' : 'entre usuarios registrados'}
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
                        created_at: (transfer as any).created_at || undefined,
                        transfer_type: (transfer as any).transfer_type,
                        message: (transfer as any).message,
                        message_created_at: (transfer as any).message_created_at,
                        message_updated_at: (transfer as any).message_updated_at,
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

