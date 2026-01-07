'use client';

import { useState, useEffect } from 'react';
import { TransferCard } from '@/components/TransferCard';
import { Loader2 } from 'lucide-react';

// Flag global para trackear si ya se cargó en esta sesión (por username)
const userTransfersLoadedRef: { [key: string]: boolean } = {};

export default function UserTransfers({ username }: { username: string }) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Clave única para sessionStorage basada en username
        const cacheKey = `user_transfers_cache_${username}`;
        
        // Si ya se cargó antes en esta sesión para este username → es navegación desde menú → usar cache
        if (userTransfersLoadedRef[username] && typeof window !== 'undefined') {
          const cachedData = sessionStorage.getItem(cacheKey);
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              // Mostrar cache INMEDIATAMENTE (sin loading)
              setTransfers(parsed.transfers || []);
              setLoading(false);
              
              // Actualizar en background silenciosamente (sin mostrar loading)
              const response = await fetch(`/api/transfers/public?username=${username}`, { cache: 'no-store' });
              if (response.ok) {
                const data = await response.json();
                // Solo actualizar si hay diferencias
                if (JSON.stringify(data.transfers) !== JSON.stringify(parsed.transfers)) {
                  setTransfers(data.transfers || []);
                  // Actualizar cache
                  sessionStorage.setItem(cacheKey, JSON.stringify({
                    transfers: data.transfers || []
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
        
        // Marcar como cargado para este username
        userTransfersLoadedRef[username] = true;
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
            image_url: t.image_url || null,
            category: t.category || null,
            location: t.location || null,
            description: t.description || null,
            fromUser: { username: t.fromUser.username, profileImageUrl: t.fromUser.profileImageUrl, userId: t.fromUser.userId },
            toUser: { username: t.toUser.username, profileImageUrl: t.toUser.profileImageUrl, userId: t.toUser.userId }
          }} />
        ))}
      </div>
    </>
  );
}

