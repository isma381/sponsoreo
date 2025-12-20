import { executeQuery } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TransferCard } from '@/components/TransferCard';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';

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

export default async function TransfersPage() {
  // Cargar transferencias desde BD directamente (más rápido)
  const transfers = await executeQuery(
    `SELECT t.*, 
      u1.username as from_username,
      u1.profile_image_url as from_profile_image,
      u2.username as to_username,
      u2.profile_image_url as to_profile_image
     FROM transfers t
     LEFT JOIN wallets w1 ON LOWER(t.from_address) = LOWER(w1.address)
     LEFT JOIN users u1 ON w1.user_id = u1.id
     LEFT JOIN wallets w2 ON LOWER(t.to_address) = LOWER(w2.address)
     LEFT JOIN users u2 ON w2.user_id = u2.id
     WHERE w1.status = 'verified' 
       AND w2.status = 'verified'
       AND u1.username IS NOT NULL
       AND u2.username IS NOT NULL
       AND t.is_public = true
     ORDER BY t.created_at DESC
     LIMIT 100`,
    []
  );

  const formatTransfers: EnrichedTransfer[] = transfers.map((t: any) => ({
    hash: t.hash,
    blockNum: t.block_num,
    from: t.from_address,
    to: t.to_address,
    value: parseFloat(t.value),
    rawContract: {
      value: t.raw_contract_value,
      decimal: t.raw_contract_decimal,
    },
    token: t.token || '',
    chain: t.chain || '',
    contractAddress: t.contract_address,
    chainId: t.chain_id || SEPOLIA_CHAIN_ID,
    tokenLogo: null,
    created_at: t.created_at ? new Date(t.created_at).toISOString() : undefined,
    fromUser: {
      username: t.from_username,
      profileImageUrl: t.from_profile_image,
    },
    toUser: {
      username: t.to_username,
      profileImageUrl: t.to_profile_image,
    },
  }));

  const chainId = transfers[0]?.chain_id || SEPOLIA_CHAIN_ID;

  const formatValue = (transfer: EnrichedTransfer) => {
    const decimals = parseInt(transfer.rawContract.decimal);
    const value = BigInt(transfer.rawContract.value);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(value) / Number(divisor);
    return formatted;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
      <main className="container mx-auto py-4 sm:py-8">
        <Card className="border-0 lg:border">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Transferencias</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Registro de todas las transferencias USDC entre usuarios registrados en la plataforma
                </CardDescription>
              </div>
              {chainId && formatTransfers[0]?.chain && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 w-fit">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {formatTransfers[0].chain}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {chainId}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {formatTransfers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No se encontraron transferencias entre usuarios registrados
              </p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {formatTransfers.map((transfer, index) => {
                  const value = formatValue(transfer);
                  return (
                    <TransferCard
                      key={`${transfer.hash}-${index}`}
                      transfer={{
                        id: transfer.hash,
                        hash: transfer.hash,
                        from: transfer.from,
                        to: transfer.to,
                        value,
                        token: transfer.token,
                        chain: transfer.chain,
                        chainId: transfer.chainId,
                        contractAddress: transfer.contractAddress,
                        created_at: (transfer as any).created_at || undefined,
                        fromUser: {
                          username: transfer.fromUser.username,
                          profileImageUrl: transfer.fromUser.profileImageUrl,
                          userId: transfer.from,
                        },
                        toUser: {
                          username: transfer.toUser.username,
                          profileImageUrl: transfer.toUser.profileImageUrl,
                          userId: transfer.to,
                        },
                      }}
                    />
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

