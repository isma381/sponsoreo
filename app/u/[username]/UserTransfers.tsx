'use client';

import { useState, useEffect, useCallback } from 'react';
import { TransferCard } from '@/components/TransferCard';
import { Loader2 } from 'lucide-react';

export default function UserTransfers({ username }: { username: string }) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserTransfers = useCallback(async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      // Disparar sincronización en background (no esperar)
      fetch('/api/transfers').catch(() => {});
      
      const cacheRes = await fetch(`/api/users/${username}/transfers`);
      if (cacheRes.ok) {
        const { transfers: data } = await cacheRes.json();
        setTransfers(data || []);
      }
    } catch {
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [username]);

  useEffect(() => {
    fetchUserTransfers(true);
  }, [fetchUserTransfers]);

  // Polling automático para detectar nuevas transferencias (cada 10 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUserTransfers(false); // false = no mostrar loading
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchUserTransfers]);

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

