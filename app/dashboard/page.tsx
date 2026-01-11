'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransferCard } from '@/components/TransferCard';
import EditTransferForm from '@/components/EditTransferForm';
import GenericMessageForm from '@/components/GenericMessageForm';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import * as nsfwjs from 'nsfwjs';

type FilterType = 'pending' | 'public' | 'all';
type TransferTypeFilter = 'all' | 'generic' | 'socios' | 'sponsoreo';

interface Transfer {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  token: string;
  chain: string;
  chainId: number;
  contractAddress: string | null;
  created_at?: string | Date;
  is_public: boolean;
  approved_by_sender: boolean;
  approved_by_receiver: boolean;
  editing_permission_user_id: string | null;
  transfer_type?: string;
  message?: string | null;
  message_created_at?: string | null;
  message_updated_at?: string | null;
  image_url: string | null;
  category: string | null;
  location: string | null;
  description: string | null;
  fromUser: {
    username: string;
    profileImageUrl: string | null;
    userId: string;
  };
  toUser: {
    username: string;
    profileImageUrl: string | null;
    userId: string;
  };
  isSender: boolean;
  isReceiver: boolean;
}

export default function DashboardPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<TransferTypeFilter>('all');
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [messageTransfer, setMessageTransfer] = useState<Transfer | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sociosEnabled, setSociosEnabled] = useState(false);
  const [nsfwModel, setNsfwModel] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const initialLoadDoneRef = useRef(false);

  const loadDashboardData = useCallback(async (withSync: boolean = false) => {
    console.log('[Dashboard] Iniciando carga de datos', { withSync });
    const url = withSync ? '/api/dashboard/transfers?sync=true' : '/api/dashboard/transfers';
    const dashboardResponse = await fetch(url, {
      cache: 'no-store', // Evitar cache del navegador para obtener datos frescos
    });
    
    if (dashboardResponse.status === 401) {
      router.push('/login');
      return null;
    }

    if (dashboardResponse.status === 403) {
      // Redirigir al paso correcto del onboarding
      const walletStatus = await fetch('/api/wallet/status', { cache: 'no-store' });
      if (walletStatus.ok) {
        const walletData = await walletStatus.json();
        if (!walletData.wallet || walletData.wallet.status !== 'verified') {
          router.push('/onboarding');
        } else {
          // Verificar si tiene username
          const userRes = await fetch('/api/auth/me', { cache: 'no-store' });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (!userData.user?.username) {
              router.push('/onboarding/complete');
            }
          }
        }
      } else {
        router.push('/onboarding');
      }
      return null;
    }

    if (!dashboardResponse.ok) {
      const errorText = await dashboardResponse.text();
      console.error('[Dashboard] ❌ ERROR en respuesta del servidor:', {
        status: dashboardResponse.status,
        statusText: dashboardResponse.statusText,
        error: errorText
      });
      throw new Error(`Error al obtener transferencias: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
    }

    const data = await dashboardResponse.json();
    console.log('[Dashboard] Datos recibidos:', {
      total: data.all?.length || 0,
      pending: data.pending?.length || 0,
      public: data.public?.length || 0,
      withSync
    });
    
    if (withSync && data.syncInfo) {
      console.log('[Dashboard] 📊 Info de sincronización:', {
        transferenciasDetectadas: data.syncInfo.detectedTransfers,
        transferenciasInsertadas: data.syncInfo.insertedTransfers,
        walletsVerificadas: data.syncInfo.walletsChecked,
        direccionesVerificadas: data.syncInfo.verifiedAddressesCount,
        chainsProcesadas: data.syncInfo.chainsProcessed
      });
      
      if (data.syncInfo.detectedTransfers === 0) {
        console.error('[Dashboard] ❌ PROBLEMA: No se detectaron transferencias desde Alchemy');
        console.error('[Dashboard] Verifica:');
        console.error('[Dashboard] 1. Que las wallets estén verificadas (status="verified")');
        console.error('[Dashboard] 2. Que haya transferencias entre wallets verificadas');
        console.error('[Dashboard] 3. Que last_block_synced no esté muy adelante');
      } else if (data.syncInfo.insertedTransfers === 0 && data.syncInfo.detectedTransfers > 0) {
        console.error('[Dashboard] ❌ PROBLEMA: Se detectaron transferencias pero NO se insertaron');
        console.error('[Dashboard] Posibles causas:');
        console.error('[Dashboard] 1. Las transferencias ya existen en BD');
        console.error('[Dashboard] 2. Error en la inserción (revisa logs del servidor)');
        console.error('[Dashboard] 3. Filtro por tipo está excluyendo las transferencias');
      }
    }
    
    if (withSync && data.all?.length === 0) {
      console.warn('[Dashboard] ⚠️ Sincronización completada pero NO hay transferencias. Posibles causas:');
      console.warn('[Dashboard] - No se detectaron transferencias desde Alchemy');
      console.warn('[Dashboard] - Las wallets no están verificadas');
      console.warn('[Dashboard] - Error en la sincronización');
    }
    
    // Guardar currentUserId del primer transfer si existe
    if (data.all && data.all.length > 0) {
      const firstTransfer = data.all[0];
      if (firstTransfer.isSender) {
        setCurrentUserId(firstTransfer.fromUser.userId);
      } else if (firstTransfer.isReceiver) {
        setCurrentUserId(firstTransfer.toUser.userId);
      }
    }
    
    // Guardar todas las transferencias sin filtrar
    setAllTransfers(data.all || []);
    
    return data;
  }, [router]);


  // Cargar datos iniciales cuando se monta el componente
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        console.log('[Dashboard] Carga inicial - montando componente');
        setLoading(true);
        setError(null);

        // 1. Primero cargar datos de BD (rápido) - mostrar inmediatamente
        await loadDashboardData(false);
        setLoading(false);
        
        // Cargar configuración de Socios
        const profileResponse = await fetch('/api/profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setSociosEnabled(profileData.profile.socios_enabled || false);
        }

        // 2. Luego sincronizar con Alchemy (solo wallets del usuario) - espera real
        setChecking(true);
        try {
          console.log('[Dashboard] Iniciando sincronización con Alchemy...');
          const syncStartTime = Date.now();
          // Usar el nuevo endpoint con sync=true
          const syncData = await loadDashboardData(true);
          const syncDuration = Date.now() - syncStartTime;
          console.log(`[Dashboard] Sincronización completada en ${syncDuration}ms`);
          
          if (!syncData) {
            console.error('[Dashboard] ❌ ERROR: No se recibieron datos después de la sincronización');
          } else if (syncData.all?.length === 0) {
            console.error('[Dashboard] ❌ ERROR: Sincronización completada pero NO se encontraron transferencias');
            console.error('[Dashboard] Verifica:');
            console.error('[Dashboard] 1. Que las wallets estén verificadas en la BD');
            console.error('[Dashboard] 2. Que haya transferencias entre wallets verificadas');
            console.error('[Dashboard] 3. Revisa los logs del servidor en Vercel');
          }
        } catch (err: any) {
          console.error('[Dashboard] ❌ ERROR en sincronización:', err);
          console.error('[Dashboard] Mensaje:', err.message);
          console.error('[Dashboard] Stack:', err.stack);
        } finally {
          setChecking(false);
        }
        
        initialLoadDoneRef.current = true;
        console.log('[Dashboard] Carga inicial completada');
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
        setLoading(false);
      }
    };

    fetchTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar modelo NSFW cuando haya transferencias de tipo "sponsoreo"
  useEffect(() => {
    const hasSponsoreoTransfers = allTransfers.some(t => t.transfer_type === 'sponsoreo');
    
    if (hasSponsoreoTransfers && !nsfwModel) {
      console.log('[Dashboard] Cargando modelo NSFW (hay transferencias de tipo Sponsoreo)');
      const loadModel = async () => {
        try {
          const model = await nsfwjs.load();
          setNsfwModel(model);
          console.log('[Dashboard] Modelo NSFW cargado correctamente');
        } catch (err) {
          console.error('[Dashboard] Error cargando modelo NSFW:', err);
        }
      };
      loadModel();
    }
  }, [allTransfers, nsfwModel]);

  // Filtrar transferencias localmente cuando cambian los filtros
  useEffect(() => {
    if (allTransfers.length === 0) return;
    
    // Aplicar filtro por tipo primero
    let typeFiltered: Transfer[] = [];
    if (typeFilter === 'all') {
      typeFiltered = allTransfers;
    } else {
      typeFiltered = allTransfers.filter((t: Transfer) => {
        if (typeFilter === 'generic') {
          return !t.transfer_type || t.transfer_type === 'generic';
        }
        return t.transfer_type === typeFilter;
      });
    }
    
    // Aplicar filtro de estado (pending/public/all)
    let filtered: Transfer[] = [];
    if (filter === 'pending') {
      filtered = typeFiltered.filter((t: Transfer) => !t.is_public);
    } else if (filter === 'public') {
      filtered = typeFiltered.filter((t: Transfer) => t.is_public);
    } else {
      filtered = typeFiltered;
    }

    console.log('[Dashboard] Transferencias filtradas localmente:', {
      total: filtered.length,
      filter,
      typeFilter,
      allTransfersCount: allTransfers.length
    });
    setTransfers(filtered);
  }, [filter, typeFilter, allTransfers]);

  // Recargar datos cuando se navega al dashboard (navegación interna)
  useEffect(() => {
    // Solo ejecutar si no es la carga inicial
    if (!initialLoadDoneRef.current) return;
    
    // Si el pathname es /dashboard, recargar datos
    if (pathname === '/dashboard') {
      console.log('[Dashboard] Navegación detectada, recargando datos');
      const fetchData = async () => {
        setLoading(true);
        await loadDashboardData(false);
        setLoading(false);
        setChecking(true);
        try {
          await loadDashboardData(true);
        } catch (err) {
          console.error('[Dashboard] Error sincronizando:', err);
        } finally {
          setChecking(false);
        }
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleEdit = (transferId: string) => {
    const transfer = transfers.find((t: Transfer) => t.id === transferId);
    if (transfer) {
      setEditingTransfer(transfer);
    }
  };

  const handleSaveEdit = async (data: {
    image?: File;
    category?: string;
    location?: string;
    description?: string;
    isPublic?: boolean;
  }) => {
    if (!editingTransfer) return;

    const formData = new FormData();
    if (data.image) formData.append('image', data.image);
    if (data.category) formData.append('category', data.category);
    if (data.location) formData.append('location', data.location);
    if (data.description) formData.append('description', data.description);
    if (data.isPublic !== undefined) {
      formData.append('is_public', data.isPublic.toString());
    }

    const { getCSRFHeaders } = await import('@/lib/csrf-client');
    const csrfHeaders = await getCSRFHeaders();
    
    const response = await fetch(`/api/transfers/${editingTransfer.id}/edit`, {
      method: 'PUT',
      headers: csrfHeaders,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar');
    }

    // Recargar transferencias para actualizar estado local
    const dashboardData = await loadDashboardData(false);
    
    // Actualizar editingTransfer con los datos nuevos si aún está abierto
    if (dashboardData?.all) {
      const updatedTransfer = dashboardData.all.find((t: Transfer) => t.id === editingTransfer.id);
      if (updatedTransfer) {
        setEditingTransfer(updatedTransfer);
      }
    }
  };

  const handleTransferPermission = async (transferId: string) => {
    if (!confirm('¿Transferir permisos de edición al receptor?')) return;

    const { getCSRFHeaders } = await import('@/lib/csrf-client');
    const csrfHeaders = await getCSRFHeaders();

    const response = await fetch(`/api/transfers/${transferId}/transfer-permission`, {
      method: 'POST',
      headers: csrfHeaders,
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al transferir permisos');
      return;
    }

    router.refresh();
  };

  const handleReturnPermission = async (transferId: string) => {
    if (!confirm('¿Devolver permisos de edición al emisor?')) return;

    const { getCSRFHeaders } = await import('@/lib/csrf-client');
    const csrfHeaders = await getCSRFHeaders();

    const response = await fetch(`/api/transfers/${transferId}/return-permission`, {
      method: 'POST',
      headers: csrfHeaders,
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al devolver permisos');
      return;
    }

    router.refresh();
  };

  const handleApprove = async (transferId: string) => {
    const { getCSRFHeaders } = await import('@/lib/csrf-client');
    const csrfHeaders = await getCSRFHeaders();

    const response = await fetch(`/api/transfers/${transferId}/approve`, {
      method: 'POST',
      headers: csrfHeaders,
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al aprobar transferencia');
      return;
    }

    // Recargar transferencias
    router.refresh();
  };

  const handleChangeToSponsoreo = async (transferId: string) => {
    if (!confirm('¿Cambiar esta transferencia a tipo Sponsoreo? Esto permitirá edición completa.')) return;

    const { getCSRFHeaders } = await import('@/lib/csrf-client');
    const csrfHeaders = await getCSRFHeaders();

    const response = await fetch(`/api/transfers/${transferId}/change-type`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...csrfHeaders,
      },
      body: JSON.stringify({ transfer_type: 'sponsoreo' }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al cambiar tipo de transferencia');
      return;
    }

    const updatedTransfer = await response.json();
    
    // Actualizar estado local inmediatamente
    const updatedTransfers = transfers.map((t: Transfer) => 
      t.id === updatedTransfer.id 
        ? { ...t, transfer_type: 'sponsoreo' }
        : t
    );
    setTransfers(updatedTransfers);
    
    // Actualizar también allTransfers
    setAllTransfers(allTransfers.map((t: Transfer) => 
      t.id === updatedTransfer.id 
        ? { ...t, transfer_type: 'sponsoreo' }
        : t
    ));
  };

  const handleAddMessage = (transferId: string) => {
    const transfer = transfers.find((t: Transfer) => t.id === transferId);
    if (transfer) {
      setMessageTransfer(transfer);
    }
  };

  const handleSaveMessage = async (message: string) => {
    if (!messageTransfer) return;

    const { getCSRFHeaders } = await import('@/lib/csrf-client');
    const csrfHeaders = await getCSRFHeaders();

    const response = await fetch(`/api/transfers/${messageTransfer.id}/message`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...csrfHeaders,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar mensaje');
    }

    const updatedTransfer = await response.json();
    
    // Actualizar estado local sin recargar
    const updatedTransfers = transfers.map(t => 
      t.id === updatedTransfer.id 
        ? { ...t, message: updatedTransfer.message, message_created_at: updatedTransfer.message_created_at, message_updated_at: updatedTransfer.message_updated_at }
        : t
    );
    setTransfers(updatedTransfers);
    
    // Actualizar también allTransfers
    setAllTransfers(allTransfers.map(t => 
      t.id === updatedTransfer.id 
        ? { ...t, message: updatedTransfer.message, message_created_at: updatedTransfer.message_created_at, message_updated_at: updatedTransfer.message_updated_at }
        : t
    ));
    
    setMessageTransfer(null);
  };

  const handleEditMessage = (transferId: string) => {
    const transfer = transfers.find((t: Transfer) => t.id === transferId);
    if (transfer) {
      setMessageTransfer(transfer);
    }
  };

  const handleDeleteMessage = async (transferId: string) => {
    if (!confirm('¿Estás seguro de que quieres borrar este mensaje?')) return;

    const { getCSRFHeaders } = await import('@/lib/csrf-client');
    const csrfHeaders = await getCSRFHeaders();

    const response = await fetch(`/api/transfers/${transferId}/message`, {
      method: 'DELETE',
      headers: csrfHeaders,
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al borrar mensaje');
      return;
    }

    // Actualizar estado local sin recargar
    const updatedTransfers = transfers.map(t => 
      t.id === transferId 
        ? { ...t, message: null, message_created_at: null, message_updated_at: null }
        : t
    );
    setTransfers(updatedTransfers);
    
    // Actualizar también allTransfers
    setAllTransfers(allTransfers.map(t => 
      t.id === transferId 
        ? { ...t, message: null, message_created_at: null, message_updated_at: null }
        : t
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
      <main className="container mx-auto py-4 sm:py-8">
        <Card className="border-0 lg:border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Dashboard</CardTitle>
                <CardDescription>
                  Gestiona tus transferencias privadas y públicas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tabs por tipo - Solo mostrar si hay más de un tipo */}
            {(() => {
              // Mostrar Socios si: usuario tiene sociosEnabled O envió/recibió tokens a wallet de Socios
              const hasSociosTransfers = allTransfers.some(t => t.transfer_type === 'socios');
              const hasSocios = (sociosEnabled && hasSociosTransfers) || allTransfers.some(t => t.transfer_type === 'socios' && t.isSender);
              const hasSponsoreo = allTransfers.some(t => t.transfer_type === 'sponsoreo');
              const hasGeneric = allTransfers.some(t => !t.transfer_type || t.transfer_type === 'generic');
              const typeCount = [hasSocios, hasSponsoreo, hasGeneric].filter(Boolean).length;
              
              if (typeCount <= 1) return null;
              
              return (
                <div className="flex gap-2 mb-4 flex-wrap">
                  <Button
                    variant={typeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTypeFilter('all')}
                  >
                    Todas
                  </Button>
                  {hasGeneric && (
                    <Button
                      variant={typeFilter === 'generic' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTypeFilter('generic')}
                    >
                      Genéricas
                    </Button>
                  )}
                  {hasSocios && (
                    <Button
                      variant={typeFilter === 'socios' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTypeFilter('socios')}
                    >
                      Socios
                    </Button>
                  )}
                  {hasSponsoreo && (
                    <Button
                      variant={typeFilter === 'sponsoreo' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTypeFilter('sponsoreo')}
                    >
                      Sponsoreo
                    </Button>
                  )}
                </div>
              );
            })()}

            {checking && (
              <div className="mb-4 p-3 bg-muted border border-border rounded-lg flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-primary">Chequeando nuevas transferencias...</span>
              </div>
            )}

            {/* Filtros de estado */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pendientes
              </Button>
              <Button
                variant={filter === 'public' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('public')}
              >
                Públicas
              </Button>
            </div>

            {/* Contenido */}
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
                No hay transferencias {filter === 'pending' ? 'pendientes' : filter === 'public' ? 'públicas' : ''}
              </p>
            ) : (
              <div className="space-y-3">
                {transfers.map((transfer) => (
                  <TransferCard
                    key={transfer.id}
                    transfer={transfer}
                    showActions={true}
                    currentUserId={currentUserId || undefined}
                    onEdit={handleEdit}
                    onTransferPermission={handleTransferPermission}
                    onReturnPermission={handleReturnPermission}
                    onApprove={handleApprove}
                    onChangeToSponsoreo={handleChangeToSponsoreo}
                    onAddMessage={handleAddMessage}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {editingTransfer && (
        <EditTransferForm
          isOpen={!!editingTransfer}
          onClose={() => setEditingTransfer(null)}
          transfer={editingTransfer}
          onSave={handleSaveEdit}
          nsfwModel={nsfwModel}
        />
      )}

      {messageTransfer && (
        <GenericMessageForm
          isOpen={!!messageTransfer}
          onClose={() => setMessageTransfer(null)}
          transferId={messageTransfer.id}
          currentMessage={messageTransfer.message}
          onSave={handleSaveMessage}
        />
      )}
    </div>
  );
}
