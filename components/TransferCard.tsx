'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ArrowRight, Edit, ArrowRightLeft, ArrowLeft, CheckCircle2 } from 'lucide-react';
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

  return (
    <Card className="p-4 hover:bg-muted/50 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Usuarios */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {transfer.fromUser.profileImageUrl ? (
              <Image
                src={transfer.fromUser.profileImageUrl}
                alt={transfer.fromUser.username}
                width={32}
                height={32}
                className="rounded-full object-cover border-2 border-border shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium border-2 border-border shrink-0">
                {transfer.fromUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-foreground text-sm truncate">
              {transfer.fromUser.username}
            </span>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            {transfer.toUser.profileImageUrl ? (
              <Image
                src={transfer.toUser.profileImageUrl}
                alt={transfer.toUser.username}
                width={32}
                height={32}
                className="rounded-full object-cover border-2 border-border shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium border-2 border-border shrink-0">
                {transfer.toUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-foreground text-sm truncate">
              {transfer.toUser.username}
            </span>
          </div>
        </div>

        {/* Valor y Token */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
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
            <span className="text-base font-bold text-foreground">
              {transfer.value.toFixed(6)}
            </span>
            <span className="text-sm font-semibold text-primary">
              {transfer.token}
            </span>
          </div>
        </div>

        {/* Badges de estado */}
        {showActions && (
          <div className="flex items-center gap-2">
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
          </div>
        )}

        {/* Acciones de aprobación */}
        {showActions && canApprove && onApprove && (
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
        {showActions && hasEditPermission && (
          <div className="flex items-center gap-1">
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
          </div>
        )}

        {/* Explorer */}
        <Button variant="ghost" size="icon" asChild>
          <Link href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
