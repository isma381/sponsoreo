'use client';

import { useState, useEffect, useCallback } from 'react';
import { TransferCard } from '@/components/TransferCard';
import { Loader2 } from 'lucide-react';

export default function UserTransfers({ username }: { username: string }) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchUserTransfers = useCallback(async (showLoading: boolean = false, sync: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const syncParam = sync ? '&sync=true' : '';
      const url = `/api/transfers/public?username=${username}${syncParam}`;
      
      const fetchOptions: RequestInit = sync 
        ? { cache: 'no-store' }
        : {};

      const response = await fetch(url, fetchOptions);
      if (response.ok) {
        const { transfers: data } = await response.json();
        setTransfers(data || []);
        setHasLoadedOnce(true);
      }
    } catch {
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [username]);

  useEffect(() => {
    const loadData = async () => {
      // Detectar si es refresh (F5)
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const isRefresh = navEntry?.type === 'reload';
      
      // Usar sessionStorage para trackear si ya se cargó en esta sesión
      const sessionKey = `user_transfers_loaded_${username}`;
      const wasLoadedInSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === 'true';
      const isFirstLoad = !wasLoadedInSession;
      
      // Solo hacer sync si es primera carga O refresh
      const shouldSync = isFirstLoad || isRefresh;
      
      try {
        setLoading(true);
        
        // Construir URL
        const syncParam = shouldSync ? '&sync=true' : '';
        const url = `/api/transfers/public?username=${username}${syncParam}`;
        
        // En navegación normal, usar force-cache para que el navegador use su cache
        // En primera carga/refresh, hacer fetch normal
        const fetchOptions: RequestInit = shouldSync 
          ? { cache: 'no-store' }
          : { cache: 'force-cache' };
        
        // 1. Cargar datos (de BD o cache según corresponda)
        const response = await fetch(url, fetchOptions);
        if (response.ok) {
          const { transfers: data } = await response.json();
          setTransfers(data || []);
          setHasLoadedOnce(true);
        }
        setLoading(false);
        
        // 2. Solo sincronizar con Alchemy si es primera carga o refresh
        if (shouldSync) {
          await fetchUserTransfers(false, true);
        }
        
        // Marcar como cargado en sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, 'true');
        }
      } catch {
        setLoading(false);
      }
    };
    
    loadData();
  }, [fetchUserTransfers, username]);

  if (loading && !hasLoadedOnce) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">Cargando...</span></div>;
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

