'use client';

import { useState, useEffect, useRef } from 'react';
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

// Flag global para trackear si ya se cargó en esta sesión
const transfersLoadedRef = { current: false };

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<EnrichedTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TransferTypeFilter>('all');
  const [chainId, setChainId] = useState<number>(SEPOLIA_CHAIN_ID);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        
        // Clave única para sessionStorage basada en el filtro
        const cacheKey = `transfers_cache_${typeFilter}`;
        
        // Si ya se cargó antes en esta sesión → es navegación desde menú → usar cache
        if (transfersLoadedRef.current && typeof window !== 'undefined') {
          const cachedData = sessionStorage.getItem(cacheKey);
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              // Mostrar cache INMEDIATAMENTE (sin loading)
              setTransfers(parsed.transfers || []);
              setChainId(parsed.chainId || SEPOLIA_CHAIN_ID);
              setLoading(false);
              
              // Actualizar en background silenciosamente (sin mostrar loading)
              const url = typeFilter === 'sponsoreo' 
                ? `/api/transfers/public?type=sponsoreo`
                : `/api/transfers/public`;
              
              const response = await fetch(url, { cache: 'no-store' });
              if (response.ok) {
                const data = await response.json();
                // Solo actualizar si hay diferencias
                if (JSON.stringify(data.transfers) !== JSON.stringify(parsed.transfers) || 
                    data.chainId !== parsed.chainId) {
                  setTransfers(data.transfers || []);
                  setChainId(data.chainId || SEPOLIA_CHAIN_ID);
                  // Actualizar cache
                  sessionStorage.setItem(cacheKey, JSON.stringify({
                    transfers: data.transfers || [],
                    chainId: data.chainId || SEPOLIA_CHAIN_ID
                  }));
                }
              }
              return; // Ya mostramos cache y actualizamos en background
            } catch (e) {
              // Si hay error parseando, continuar con fetch
            }
          }
        }
        
        // Si no hay cache, mostrar loading
        setLoading(true);
        
        // Detectar refresh de forma más confiable
        const isRefresh = typeof window !== 'undefined' && (
          (window.performance.navigation && (window.performance.navigation as any).type === 1) ||
          (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload'
        );
        
        if (isRefresh) {
          // REFRESH: Sincronizar con Alchemy
          const syncUrl = typeFilter === 'sponsoreo' 
            ? `/api/transfers/public?type=sponsoreo&sync=true`
            : `/api/transfers/public?sync=true`;
          
          const syncResponse = await fetch(syncUrl, { cache: 'no-store' });
          if (!syncResponse.ok) {
            throw new Error('Error al sincronizar transferencias');
          }
          
          const syncData = await syncResponse.json();
          setTransfers(syncData.transfers || []);
          setChainId(syncData.chainId || SEPOLIA_CHAIN_ID);
          
          // Guardar en sessionStorage después de sincronizar
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              transfers: syncData.transfers || [],
              chainId: syncData.chainId || SEPOLIA_CHAIN_ID
            }));
          }
        } else {
          // PRIMERA CARGA: Cargar de BD
          const url = typeFilter === 'sponsoreo' 
            ? `/api/transfers/public?type=sponsoreo`
            : `/api/transfers/public`;
          
          const response = await fetch(url, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error('Error al cargar transferencias');
          }
          
          const data = await response.json();
          setTransfers(data.transfers || []);
          setChainId(data.chainId || SEPOLIA_CHAIN_ID);
          
          // Guardar en sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              transfers: data.transfers || [],
              chainId: data.chainId || SEPOLIA_CHAIN_ID
            }));
          }
        }
        
        // Marcar como cargado
        transfersLoadedRef.current = true;
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [typeFilter]); // Solo recargar cuando cambia el filtro

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
        <Card className="border-0">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Transferencias</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Registro de todas las transferencias entre usuarios registrados en la plataforma
                </CardDescription>
              </div>
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

            {loading ? (
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
                        image_url: (transfer as any).image_url || null,
                        category: (transfer as any).category || null,
                        location: (transfer as any).location || null,
                        description: (transfer as any).description || null,
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

