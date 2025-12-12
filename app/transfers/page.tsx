'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';
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
  fromUser: {
    username: string;
  };
  toUser: {
    username: string;
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
    const tokenSymbol = transfer.token || '';
    return tokenSymbol ? `${formatted.toFixed(6)} ${tokenSymbol}` : formatted.toFixed(6);
  };

  const getDisplayName = (transfer: EnrichedTransfer, type: 'from' | 'to') => {
    const user = type === 'from' ? transfer.fromUser : transfer.toUser;
    return `@${user.username}`;
  };

  const getExplorerUrl = (hash: string) => {
    return `${SEPOLIA_EXPLORER_URL}/tx/${hash}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transferencias</CardTitle>
                <CardDescription>
                  Registro de todas las transferencias USDC entre usuarios registrados en la plataforma
                </CardDescription>
              </div>
              {chainId && transfers[0]?.chain && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {transfers[0].chain} ({chainId})
                </Badge>
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
              <div className="space-y-3">
                {transfers.map((transfer, index) => (
                  <div
                    key={`${transfer.hash}-${index}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getDisplayName(transfer, 'from')}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {getDisplayName(transfer, 'to')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formatValue(transfer)}
                        </Badge>
                        {transfer.chain && (
                          <Badge variant="secondary" className="text-xs">
                            {transfer.chain}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

