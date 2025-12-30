'use client';

import { useState, useEffect, useRef } from 'react';
import { TransferCard } from '@/components/TransferCard';
import { Loader2 } from 'lucide-react';

export default function UserTransfers({ username }: { username: string }) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Detectar si es refresh (F5)
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const isRefresh = navEntry?.type === 'reload';
        
        // Si ya se montó antes y NO es refresh → es navegación desde menú → usar cache
        const isNavigation = hasMountedRef.current && !isRefresh;
        
        if (isRefresh) {
          // REFRESH: Sincronizar y luego cachear
          // 1. Sincronizar con Alchemy
          const syncResponse = await fetch(`/api/transfers/public?username=${username}&sync=true`, { cache: 'no-store' });
          if (!syncResponse.ok) {
            throw new Error('Error al sincronizar');
          }
          
          // 2. Recargar SIN sync para cachear
          const cacheResponse = await fetch(`/api/transfers/public?username=${username}`, { cache: 'default' });
          if (!cacheResponse.ok) {
            throw new Error('Error al cargar');
          }
          
          const { transfers: data } = await cacheResponse.json();
          setTransfers(data || []);
        } else if (isNavigation) {
          // NAVEGACIÓN DESDE MENÚ: Usar cache HTTP
          const response = await fetch(`/api/transfers/public?username=${username}`, { cache: 'force-cache' });
          if (response.ok) {
            const { transfers: data } = await response.json();
            setTransfers(data || []);
          }
        } else {
          // PRIMERA CARGA: Cargar de BD (puede usar cache HTTP si existe)
          const response = await fetch(`/api/transfers/public?username=${username}`, { cache: 'default' });
          if (response.ok) {
            const { transfers: data } = await response.json();
            setTransfers(data || []);
          }
        }
      } catch (err) {
        console.error('Error cargando transferencias:', err);
      } finally {
        setLoading(false);
        hasMountedRef.current = true;
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

