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
        
        // Detectar si es refresh (F5)
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const isRefresh = navEntry?.type === 'reload';
        
        // Si es refresh → sync=true (invalida cache y sincroniza con Alchemy)
        // Si es primera carga → sin sync (usa cache HTTP si existe, sino carga de BD)
        const syncParam = isRefresh ? '&sync=true' : '';
        const url = `/api/transfers/public?username=${username}${syncParam}`;
        
        // Fetch con cache control
        // Si es refresh: no-store (fuerza revalidación y sincronización)
        // Si es primera carga: default (respeta headers de cache de la API)
        const fetchOptions: RequestInit = isRefresh 
          ? { cache: 'no-store' }
          : {}; // Dejar que la API controle el cache con sus headers
        
        const response = await fetch(url, fetchOptions);
        if (response.ok) {
          const { transfers: data } = await response.json();
          setTransfers(data || []);
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

