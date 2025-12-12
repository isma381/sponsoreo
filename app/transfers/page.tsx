'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { SEPOLIA_EXPLORER_URL } from '@/lib/constants';

interface EnrichedTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  rawContract: {
    value: string;
    decimal: string;
  };
  token: string;
  chain: string;
  contractAddress: string | null;
  chainId: number;
  tokenLogo?: string | null;
  fromUser: {
    username: string;
    profileImageUrl: string | null;
  };
  toUser: {
    username: string;
    profileImageUrl: string | null;
  };
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<EnrichedTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/transfers');

        if (!response.ok) {
          throw new Error('Error al obtener transferencias');
        }

        const data = await response.json();
        setTransfers(data.transfers || []);
        setChainId(data.chainId || null);
      } catch (err: any) {
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, []);

  const formatValue = (transfer: EnrichedTransfer) => {
    const decimals = parseInt(transfer.rawContract.decimal);
    const value = BigInt(transfer.rawContract.value);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(value) / Number(divisor);
    return formatted;
  };

  const getTokenIconUrl = (contractAddress: string | null, chainId: number | null): string | null => {
    if (!contractAddress) return null;

    // Trust Wallet Assets es la fuente más confiable y completa
    // Soporta múltiples chains
    const chainMap: Record<number, string> = {
      1: 'ethereum',
      11155111: 'ethereum', // Sepolia usa la misma estructura
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      8453: 'base',
      56: 'smartchain',
      43114: 'avalanchec',
    };

    const chainName = chainMap[chainId || 11155111] || 'ethereum';
    const address = contractAddress.toLowerCase();

    // Trust Wallet Assets - fuente principal
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${address}/logo.png`;
  };

  const getExplorerUrl = (hash: string) => {
    return `${SEPOLIA_EXPLORER_URL}/tx/${hash}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Transferencias</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Registro de todas las transferencias USDC entre usuarios registrados en la plataforma
                </CardDescription>
              </div>
              {chainId && transfers[0]?.chain && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 w-fit">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {transfers[0].chain}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {chainId}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando transferencias...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            ) : transfers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No se encontraron transferencias entre usuarios registrados
              </p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {transfers.map((transfer, index) => {
                  const value = formatValue(transfer);
                  const tokenSymbol = transfer.token || '';
                  const tokenIconUrl = getTokenIconUrl(transfer.contractAddress, transfer.chainId);
                  
                  return (
                    <div
                      key={`${transfer.hash}-${index}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 border rounded-xl hover:bg-muted/50 transition-all hover:shadow-md"
                    >
                      {/* Mobile: Valor y Token primero */}
                      <div className="flex sm:hidden items-center justify-between w-full">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                          {tokenIconUrl ? (
                            <img
                              src={tokenIconUrl}
                              alt={tokenSymbol}
                              width={20}
                              height={20}
                              className="rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <span className="text-lg font-bold text-foreground">
                            {value.toFixed(6)}
                          </span>
                          {tokenSymbol && (
                            <span className="text-sm font-semibold text-primary">
                              {tokenSymbol}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          asChild
                        >
                          <Link
                            href={getExplorerUrl(transfer.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>

                      {/* Desktop y Mobile: Usuarios */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {/* Usuario From */}
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
                          <span className="font-semibold text-foreground text-sm sm:text-base truncate">
                            {transfer.fromUser.username}
                          </span>
                        </div>

                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />

                        {/* Usuario To */}
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
                          <span className="font-semibold text-foreground text-sm sm:text-base truncate">
                            {transfer.toUser.username}
                          </span>
                        </div>

                        {/* Desktop: Valor y Token */}
                        <div className="hidden sm:flex items-center gap-2 ml-auto">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                            {tokenIconUrl ? (
                              <img
                                src={tokenIconUrl}
                                alt={tokenSymbol}
                                width={20}
                                height={20}
                                className="rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                            <span className="text-base font-bold text-foreground">
                              {value.toFixed(6)}
                            </span>
                            {tokenSymbol && (
                              <span className="text-sm font-semibold text-primary">
                                {tokenSymbol}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chain Badge */}
                        {transfer.chain && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/50 w-fit">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                            <span className="text-xs font-medium text-muted-foreground truncate">
                              {transfer.chain}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Desktop: Botón Explorer */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden sm:flex shrink-0"
                        asChild
                      >
                        <Link
                          href={getExplorerUrl(transfer.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

