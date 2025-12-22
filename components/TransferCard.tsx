'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ExternalLink, Edit, ArrowRightLeft, ArrowLeft, CheckCircle2, Info, X, Copy, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
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
    transfer_type?: string;
    message?: string | null;
    message_created_at?: string | null;
    message_updated_at?: string | null;
  };
  showActions?: boolean;
  currentUserId?: string;
  onEdit?: (transferId: string) => void;
  onTransferPermission?: (transferId: string) => void;
  onReturnPermission?: (transferId: string) => void;
  onApprove?: (transferId: string) => void;
  onChangeToSponsoreo?: (transferId: string) => void;
  onAddMessage?: (transferId: string) => void;
  onEditMessage?: (transferId: string) => void;
  onDeleteMessage?: (transferId: string) => void;
}

export function TransferCard({ 
  transfer, 
  showActions = false, 
  currentUserId,
  onEdit,
  onTransferPermission,
  onReturnPermission,
  onApprove,
  onChangeToSponsoreo,
  onAddMessage,
  onEditMessage,
  onDeleteMessage
}: TransferCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  
  // Verificar permisos de edici?n
  const hasEditPermission = currentUserId && (
    transfer.editing_permission_user_id === currentUserId ||
    (transfer.editing_permission_user_id === null && transfer.fromUser.userId === currentUserId)
  );
  
  const isSender = currentUserId === transfer.fromUser.userId;
  const isReceiver = currentUserId === transfer.toUser.userId;
  
  // L?gica de aprobaci?n
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

  // Formatear valor con decimales solo si aplica
  const formatValue = (value: number): string => {
    const fixed = value.toFixed(6);
    const num = parseFloat(fixed);
    return num.toString();
  };

  // Formatear fecha con hora DD/MM/YYYY HH:MM
  const formatDateTime = (date: string | Date | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const Separator = () => (
    <div className="h-px my-3" style={{ backgroundColor: 'hsl(var(--border))' }} />
  );

  const transferType = transfer.transfer_type || 'generic';
  const isSocios = transferType === 'socios';
  const isGeneric = transferType === 'generic';
  const isSponsoreo = transferType === 'sponsoreo';

  // Verificar si la transferencia es reciente (menos de 7 días)
  const isRecent = transfer.created_at ? (Date.now() - new Date(transfer.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000 : false;

  // Mostrar botón "Cambiar a Sponsoreo" solo si: es receptor, es genérica, y es reciente
  const canChangeToSponsoreo = showActions && isReceiver && isGeneric && isRecent && onChangeToSponsoreo;

  // Mostrar botón "Agregar mensaje" solo si: es ENVIADOR, es genérica, no tiene mensaje, y showActions
  const canAddMessage = showActions && isSender && isGeneric && !transfer.message && onAddMessage;

  const handleCopyUUID = async () => {
    try {
      await navigator.clipboard.writeText(transfer.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copiando UUID:', err);
    }
  };

  return (
    <>
      <Card className="p-4 md:p-6 rounded-lg bg-muted border-border relative">
        <div className="flex flex-col md:flex md:flex-row md:justify-between md:items-center gap-2 md:gap-4">
          {/* Usuarios */}
          <div className="flex flex-row md:flex-row md:items-center gap-3 md:gap-6 md:w-max">
            {/* Usuario emisor */}
            <div className="w-max flex items-center gap-3">
              {transfer.fromUser.profileImageUrl ? (
                <Image
                  src={transfer.fromUser.profileImageUrl}
                  alt={transfer.fromUser.username}
                  width={40}
                  height={40}
                  className="rounded-full object-cover shrink-0 w-10 h-10 md:w-12 md:h-12"
                />
              ) : (
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-medium shrink-0">
                  {transfer.fromUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <Link href={`/u/${transfer.fromUser.username}`} className="text-foreground font-medium hover:underline max-w-[80px] md:max-w-none truncate block text-sm md:text-base">
                  {transfer.fromUser.username}
                </Link>
                <div className="text-muted-foreground text-xs md:text-sm">de</div>
              </div>
            </div>
            
            {/* Usuario receptor */}
            <div className="w-max flex items-center gap-3">
              {transfer.toUser.profileImageUrl ? (
                <Image
                  src={transfer.toUser.profileImageUrl}
                  alt={transfer.toUser.username}
                  width={40}
                  height={40}
                  className="rounded-full object-cover shrink-0 w-10 h-10 md:w-12 md:h-12"
                />
              ) : (
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-medium shrink-0">
                  {transfer.toUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <Link href={`/u/${transfer.toUser.username}`} className="text-foreground font-medium hover:underline max-w-[80px] md:max-w-none truncate block text-sm md:text-base">
                  {transfer.toUser.username}
                </Link>
                <div className="text-muted-foreground text-xs md:text-sm">para</div>
              </div>
            </div>
          </div>

          {/* Monto y red - CENTRADO en desktop, normal en móvil */}
          <div className="flex flex-col gap-1 md:gap-2 md:w-max md:items-center">
            <div className="text-2xl md:text-2xl font-bold text-foreground md:text-center -mb-[10px] md:mb-0">
              {formatValue(transfer.value)} {transfer.token}
            </div>
            <div className="hidden md:block text-muted-foreground text-sm md:text-center">{transfer.chain}</div>
          </div>

          {/* Fecha y detalles - DERECHA en desktop, normal en móvil */}
          <div className="flex items-center md:justify-end gap-3 text-xs md:text-sm text-muted-foreground md:w-max">
            <span className="md:hidden text-muted-foreground">{transfer.chain}</span>
            <Link 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground hover:text-muted-foreground transition-colors flex items-center gap-1"
            >
              TX
              <ExternalLink className="h-3 w-3" />
            </Link>
            <span className="text-foreground">{formatDate(transfer.created_at)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowDetails(true)}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mensaje para genéricas */}
        {isGeneric && transfer.message && (() => {
          const MAX_LENGTH = 150;
          const isLong = transfer.message.length > MAX_LENGTH;
          const displayMessage = isLong && !isMessageExpanded 
            ? transfer.message.slice(0, MAX_LENGTH) + '...' 
            : transfer.message;
          
          return (
            <div className="mt-4 p-3 rounded-lg bg-muted border border-border">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{displayMessage}</p>
                  {isLong && (
                    <button
                      onClick={() => setIsMessageExpanded(!isMessageExpanded)}
                      className="mt-1 text-xs text-primary hover:underline"
                    >
                      {isMessageExpanded ? 'Mostrar menos' : 'Mostrar más'}
                    </button>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {transfer.message_updated_at && transfer.message_created_at && transfer.message_created_at !== transfer.message_updated_at ? (
                      <>
                        Editado: {formatDateTime(transfer.message_updated_at)} • Creado: {formatDateTime(transfer.message_created_at)}
                      </>
                    ) : transfer.message_created_at ? (
                      <>Creado: {formatDateTime(transfer.message_created_at)}</>
                    ) : null}
                  </div>
                </div>
              </div>
              {/* Botones de editar/borrar solo para el enviador */}
              {showActions && isSender && (
                <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                  {onEditMessage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditMessage(transfer.id)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  )}
                  {onDeleteMessage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteMessage(transfer.id)}
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Borrar
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* UUID para Socios (solo en dashboard) */}
        {showActions && isSocios && (
          <div className="mt-4 p-3 rounded-lg bg-muted border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">UUID:</span>
              <code className="text-xs text-foreground font-mono flex-1">{transfer.id}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUUID}
                className="h-6 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-muted-foreground mt-1">Copiado!</p>
            )}
          </div>
        )}

        {/* Acciones (solo en dashboard) */}
        {showActions && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex flex-wrap items-center gap-2">
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
              {canChangeToSponsoreo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChangeToSponsoreo(transfer.id)}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Cambiar a Sponsoreo
                </Button>
              )}
              {canAddMessage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddMessage(transfer.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Agregar mensaje
                </Button>
              )}
              {hasEditPermission && onEdit && isSponsoreo && (
                <Button variant="outline" size="sm" onClick={() => onEdit(transfer.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Sheet de detalles */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="max-h-[90vh]" onClose={() => setShowDetails(false)}>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Detalles de Transferencia</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowDetails(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          
          <div className="px-6 pb-6 space-y-4">
            {/* Usuario emisor */}
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
                <Link href={`/u/${transfer.fromUser.username}`} className="text-foreground font-medium hover:underline">
                  {transfer.fromUser.username}
                </Link>
                <div className="text-muted-foreground text-sm">de</div>
              </div>
            </div>

            <Separator />

            {/* Usuario receptor */}
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
                <Link href={`/u/${transfer.toUser.username}`} className="text-foreground font-medium hover:underline">
                  {transfer.toUser.username}
                </Link>
                <div className="text-muted-foreground text-sm">para</div>
              </div>
            </div>

            <Separator />

            {/* Token */}
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

            {/* Monto */}
            <div className="text-foreground">Monto: {transfer.value.toFixed(6)}</div>

            <Separator />

            {/* Red */}
            <div className="text-foreground">Red: {transfer.chain}</div>

            <Separator />

            {/* TX Link */}
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

            {/* Fecha con hora */}
            <div className="text-foreground">Fecha: {formatDateTime(transfer.created_at)}</div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
