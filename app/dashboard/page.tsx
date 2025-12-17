'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransferCard } from '@/components/TransferCard';
import EditTransferForm from '@/components/EditTransferForm';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type FilterType = 'pending' | 'public' | 'all';

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
  is_public: boolean;
  approved_by_sender: boolean;
  approved_by_receiver: boolean;
  editing_permission_user_id: string | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/dashboard/transfers');
        
        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Error al obtener transferencias');
        }

        const data = await response.json();
        
        // Guardar currentUserId del primer transfer si existe
        if (data.all && data.all.length > 0) {
          const firstTransfer = data.all[0];
          if (firstTransfer.isSender) {
            setCurrentUserId(firstTransfer.fromUser.userId);
          } else if (firstTransfer.isReceiver) {
            setCurrentUserId(firstTransfer.toUser.userId);
          }
        }
        
        // Aplicar filtro
        let filtered: Transfer[] = [];
        if (filter === 'pending') {
          filtered = data.pending || [];
        } else if (filter === 'public') {
          filtered = data.public || [];
        } else {
          filtered = data.all || [];
        }

        setTransfers(filtered);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, [filter, router]);

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
  }) => {
    if (!editingTransfer) return;

    const formData = new FormData();
    if (data.image) formData.append('image', data.image);
    if (data.category) formData.append('category', data.category);
    if (data.location) formData.append('location', data.location);
    if (data.description) formData.append('description', data.description);

    const response = await fetch(`/api/transfers/${editingTransfer.id}/edit`, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar');
    }

    // Recargar transferencias
    window.location.reload();
  };

  const handleTransferPermission = async (transferId: string) => {
    if (!confirm('¿Transferir permisos de edición al receptor?')) return;

    const response = await fetch(`/api/transfers/${transferId}/transfer-permission`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al transferir permisos');
      return;
    }

    window.location.reload();
  };

  const handleReturnPermission = async (transferId: string) => {
    if (!confirm('¿Devolver permisos de edición al emisor?')) return;

    const response = await fetch(`/api/transfers/${transferId}/return-permission`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al devolver permisos');
      return;
    }

    window.location.reload();
  };

  const handleApprove = async (transferId: string) => {
    const response = await fetch(`/api/transfers/${transferId}/approve`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Error al aprobar transferencia');
      return;
    }

    // Recargar transferencias
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Dashboard</CardTitle>
            <CardDescription>
              Gestiona tus transferencias privadas y públicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
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
        />
      )}
    </div>
  );
}
