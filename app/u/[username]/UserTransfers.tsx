'use client';

import { useState, useEffect } from 'react';
import { TransferCard } from '@/components/TransferCard';
import { Loader2 } from 'lucide-react';

export default function UserTransfers({ username }: { username: string }) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Clave única para sessionStorage basada en username
        const cacheKey = `user_transfers_cache_${username}`;
        
        // Detectar si es refresh (F5)
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const isRefresh = navEntry?.type === 'reload';
        
        // Si NO es refresh, intentar cargar desde sessionStorage primero
        if (!isRefresh && typeof window !== 'undefined') {
          const cachedData = sessionStorage.getItem(cacheKey);
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              setTransfers(parsed.transfers || []);
              setLoading(false);
              return; // Usar datos del cache, no hacer fetch
            } catch (e) {
              // Si hay error parseando, continuar con fetch
            }
          }
        }
        
        // Si es refresh o no hay cache: sincronizar con Alchemy
        if (isRefresh) {
          // REFRESH: Sincronizar con Alchemy
          const syncResponse = await fetch(`/api/transfers/public?username=${username}&sync=true`, { cache: 'no-store' });
          if (!syncResponse.ok) {
            throw new Error('Error al sincronizar');
          }
          
          const syncData = await syncResponse.json();
          setTransfers(syncData.transfers || []);
          
          // Guardar en sessionStorage después de sincronizar
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              transfers: syncData.transfers || []
            }));
          }
        } else {
          // PRIMERA CARGA: Cargar de BD
          const response = await fetch(`/api/transfers/public?username=${username}`, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error('Error al cargar');
          }
          
          const data = await response.json();
          setTransfers(data.transfers || []);
          
          // Guardar en sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              transfers: data.transfers || []
            }));
          }
        }
      } catch (err) {
        console.error('Error cargando transferencias:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [username]);

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Cargando...</span></div>;
  if (transfers.length === 0) return <p className="text-muted-foreground text-center py-8">No hay transferencias públicas</p>;
  
  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {transfers.map((t: any) => (
          <TransferCard key={t.hash} transfer={{
            id: t.hash, hash: t.hash, from: t.from, to: t.to, value: t.value, token: t.token, chain: t.chain,
            chainId: t.chainId, contractAddress: t.contractAddress, created_at: t.created_at, transfer_type: t.transfer_type,
            message: t.message, message_created_at: t.message_created_at, message_updated_at: t.message_updated_at,
            fromUser: { username: t.fromUser.username, profileImageUrl: t.fromUser.profileImageUrl, userId: t.fromUser.userId },
            toUser: { username: t.toUser.username, profileImageUrl: t.toUser.profileImageUrl, userId: t.toUser.userId }
          }} />
        ))}
      </div>
    </>
  );
}

