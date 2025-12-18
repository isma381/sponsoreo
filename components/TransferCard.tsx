'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Edit, ArrowRightLeft, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { SEPOLIA_EXPLORER_URL } from '@/lib/constants';

interface TransferCardProps {
  transfer: {
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
    fromUser: {
      username: string | null;
      profileImageUrl: string | null;
      userId: string;
    };
    toUser: {
      username: string | null;
      profileImageUrl: string | null;
      userId: string;
    };
    is_public?: boolean;
    approved_by_sender?: boolean;
    approved_by_receiver?: boolean;
    editing_permission_user_id?: string | null;
    image_url?: string | null;
    category?: string | null;
    location?: string | null;
  };
  showActions?: boolean;
  currentUserId?: string;
  onEdit?: (transferId: string) => void;
  onTransferPermission?: (transferId: string) => void;
  onReturnPermission?: (transferId: string) => void;
  onApprove?: (transferId: string) => void;
}

export function TransferCard({ 
  transfer, 
  showActions = false, 
  currentUserId,
  onEdit,
  onTransferPermission,
  onReturnPermission,
  onApprove
}: TransferCardProps) {
  // Verificar permisos de edición
  const hasEditPermission = currentUserId && (
    transfer.editing_permission_user_id === currentUserId ||
    (transfer.editing_permission_user_id === null && transfer.fromUser.userId === currentUserId)
  );
  
  const isSender = currentUserId === transfer.fromUser.userId;
  const isReceiver = currentUserId === transfer.toUser.userId;
  
  // Lógica de aprobación
  const needsApproval = !transfer.is_public;
  const canApprove = needsApproval && (
    (isSender && !transfer.approved_by_sender) ||
    (isReceiver && !transfer.approved_by_receiver)
  );
  const waitingForOther = needsApproval && (
    (isSender && transfer.approved_by_sender && !transfer.approved_by_receiver) ||
    (isReceiver && transfer.approved_by_receiver && !transfer.approved_by_sender)
  );
  
  const getTokenIconUrl = (contractAddress: string | null, chainId: number): string | null => {
    if (!contractAddress) return null;
    const chainMap: Record<number, string> = {
      1: 'ethereum',
      11155111: 'ethereum',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      8453: 'base',
      56: 'smartchain',
      43114: 'avalanchec',
    };
    const chainName = chainMap[chainId] || 'ethereum';
    const address = contractAddress.toLowerCase();
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${address}/logo.png`;
  };

  // No renderizar si falta username
  if (!transfer.fromUser.username || !transfer.toUser.username) {
    return null;
  }

  const tokenIconUrl = getTokenIconUrl(transfer.contractAddress, transfer.chainId);
  const explorerUrl = `${SEPOLIA_EXPLORER_URL}/tx/${transfer.hash}`;

  // Formatear fecha DD/MM/YYYY
  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const Separator = () => (
    <div className="h-px md:h-auto md:w-px my-3 md:my-0 md:mx-3" style={{ backgroundColor: 'hsl(var(--border))' }} />
  );

  return (
    <Card className="p-6 rounded-lg bg-muted border-border">
      <div className="flex flex-col md:flex-row md:items-center md:gap-4 overflow-x-auto">
        {/* Usuarios */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4 flex-1">
          <div className="flex items-center gap-3">
            {transfer.fromUser.profileImageUrl ? (
              <Image
                src={transfer.fromUser.profileImageUrl}
                alt={transfer.fromUser.username}
                width={40}
                height={40}
                className="rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                {transfer.fromUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-foreground font-medium">{transfer.fromUser.username}</div>
              <div className="text-muted-foreground text-sm">de</div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            {transfer.toUser.profileImageUrl ? (
              <Image
                src={transfer.toUser.profileImageUrl}
                alt={transfer.toUser.username}
                width={40}
                height={40}
                className="rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
                {transfer.toUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-foreground font-medium">{transfer.toUser.username}</div>
              <div className="text-muted-foreground text-sm">para</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Detalles */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            {tokenIconUrl && (
              <img
                src={tokenIconUrl}
                alt={transfer.token}
                width={20}
                height={20}
                className="rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="text-foreground">Token: {transfer.token}</span>
          </div>

          <Separator />

          <div className="text-foreground">Monto: {transfer.value.toFixed(6)}</div>

          <Separator />

          <div className="text-foreground">Red: {transfer.chain}</div>

          <Separator />

          <div className="flex items-center gap-2">
            <span className="text-foreground">TX:</span>
            <Link 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground hover:text-muted-foreground transition-colors flex items-center gap-1"
            >
              {transfer.hash.slice(0, 10)}...
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <Separator />

          <div className="text-foreground">Fecha: {formatDate(transfer.created_at)}</div>
        </div>
      </div>

      {/* Acciones (solo en dashboard) */}
      {showActions && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            {/* Badges de estado */}
            {!transfer.is_public && (
              <Badge variant="outline" className="text-xs">
                {canApprove ? 'Pendiente de tu aprobación' : waitingForOther ? 'Pendiente de aprobación del otro usuario' : 'Pendiente'}
              </Badge>
            )}
            {transfer.is_public && (
              <Badge variant="outline" className="text-xs bg-green-500/10">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Aprobada
              </Badge>
            )}
            {transfer.approved_by_sender && !transfer.is_public && (
              <Badge variant="outline" className="text-xs bg-green-500/10">
                Emisor aprobó
              </Badge>
            )}
            {transfer.approved_by_receiver && !transfer.is_public && (
              <Badge variant="outline" className="text-xs bg-green-500/10">
                Receptor aprobó
              </Badge>
            )}

            {/* Botón de aprobación */}
            {canApprove && onApprove && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onApprove(transfer.id)}
                className="bg-primary text-primary-foreground"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
            )}

            {/* Acciones de edición */}
            {hasEditPermission && (
              <>
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(transfer.id)}
                    title="Editar transferencia"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {isSender && hasEditPermission && onTransferPermission && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTransferPermission(transfer.id)}
                    title="Pasar permisos de edición"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                )}
                {isReceiver && hasEditPermission && onReturnPermission && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReturnPermission(transfer.id)}
                    title="Devolver permisos de edición"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
