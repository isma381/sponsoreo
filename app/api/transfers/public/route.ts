import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAssetTransfers, getTokenMetadata } from '@/lib/alchemy-api';

const SUPPORTED_CHAINS = [
  { chainId: 1, name: 'Ethereum Mainnet' },
  { chainId: 10, name: 'Optimism' },
  { chainId: 137, name: 'Polygon' },
  { chainId: 42161, name: 'Arbitrum' },
  { chainId: 8453, name: 'Base' },
];

const CHAIN_NAMES_MAP = new Map<number, string>([
  [1, 'Ethereum Mainnet'],
  [10, 'Optimism'],
  [137, 'Polygon'],
  [42161, 'Arbitrum'],
  [8453, 'Base'],
]);

async function getLastBlocksBatch(
  walletAddresses: string[],
  chainIds: number[]
): Promise<Map<string, string | null>> {
  const resultMap = new Map<string, string | null>();
  if (walletAddresses.length === 0 || chainIds.length === 0) return resultMap;

  for (const wallet of walletAddresses) {
    for (const chainId of chainIds) {
      resultMap.set(`${wallet}-${chainId}`, null);
    }
  }

  const walletPlaceholders = walletAddresses.map((_, idx) => `$${idx + 1}`).join(', ');
  const chainPlaceholders = chainIds.map((_, idx) => `$${walletAddresses.length + idx + 1}`).join(', ');
  
  const results = await executeQuery(
    `SELECT address, chain_id, MAX(block_num) as block_num
     FROM (
       SELECT LOWER(from_address) as address, chain_id, block_num
       FROM transfers 
       WHERE LOWER(from_address) IN (${walletPlaceholders}) 
         AND chain_id IN (${chainPlaceholders})
       UNION ALL
       SELECT LOWER(to_address) as address, chain_id, block_num
       FROM transfers 
       WHERE LOWER(to_address) IN (${walletPlaceholders}) 
         AND chain_id IN (${chainPlaceholders})
     ) AS combined
     GROUP BY address, chain_id`,
    [...walletAddresses.map(w => w.toLowerCase()), ...chainIds]
  );

  for (const row of results as any[]) {
    const key = `${row.address}-${row.chain_id}`;
    resultMap.set(key, row.block_num);
  }

  return resultMap;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const shouldSync = searchParams.get('sync') === 'true';
    const username = searchParams.get('username');

    // Construir query base para transferencias públicas
    let query = `SELECT t.*, 
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
      AND w1.user_id != w2.user_id
      AND t.chain_id IN (1, 10, 137, 42161, 8453)`;

    const params: any[] = [];

    // Filtrar por username si se proporciona
    if (username) {
      const userResult = await executeQuery(
        'SELECT id FROM users WHERE LOWER(username) = $1',
        [username.toLowerCase()]
      );
      if (userResult.length === 0) {
        return NextResponse.json({ transfers: [], total: 0 }, {
          headers: shouldSync 
            ? { 'Cache-Control': 'no-cache' }
            : { 'Cache-Control': 'public, s-maxage=36000, stale-while-revalidate=36000' }
        });
      }
      const userId = userResult[0].id;
      query += ` AND (w1.user_id = $1 OR w2.user_id = $1)`;
      params.push(userId);
    }

    if (typeFilter === 'sponsoreo') {
      query += ` AND t.transfer_type = $${params.length + 1}`;
      params.push('sponsoreo');
    }

    query += ` ORDER BY t.created_at DESC LIMIT 100`;

    // 1. Cargar datos de BD primero (respuesta rápida)
    let publicTransfers = await executeQuery(query, params);

    // 2. Si sync=true: Sincronizar con Alchemy
    if (shouldSync) {
      try {
        console.log('[transfers/public] Iniciando sincronización con Alchemy...');
        
        // Obtener TODAS las wallets verificadas (para páginas públicas)
        const allVerifiedWallets = await executeQuery(
          `SELECT LOWER(address) as address FROM wallets WHERE status = 'verified'`,
          []
        );
        const verifiedAddressesSet = new Set<string>(
          allVerifiedWallets.map((w: any) => w.address)
        );

        if (verifiedAddressesSet.size === 0) {
          console.warn('[transfers/public] No hay wallets verificadas');
        } else {
          const allWalletAddresses = Array.from(verifiedAddressesSet);
          const allTransfersMap = new Map<string, any>();

          const chainIds = SUPPORTED_CHAINS.map(c => c.chainId);
          const lastBlocksMap = await getLastBlocksBatch(allWalletAddresses, chainIds);

          // Procesar todas las chains en paralelo
          const chainPromises = SUPPORTED_CHAINS.map(async (chain) => {
            const chainTransfers = new Map<string, any>();

            const walletPromises = allWalletAddresses.map(async (wallet: string) => {
              const key = `${wallet}-${chain.chainId}`;
              const lastBlock = lastBlocksMap.get(key);
              const fromBlock = lastBlock || '0x0';

              const [sentTransfers, receivedTransfers] = await Promise.all([
                (async () => {
                  const transfers = new Map<string, any>();
                  let pageKey: string | undefined = undefined;
                  let hasMore = true;

                  while (hasMore) {
                    try {
                      const sentResult = await getAssetTransfers({
                        fromAddress: wallet,
                        fromBlock: fromBlock,
                        toBlock: 'latest',
                        category: ['erc20'],
                        pageKey,
                        chainId: chain.chainId,
                      });

                      for (const transfer of sentResult.transfers) {
                        const toAddress = transfer.to?.toLowerCase();
                        if (toAddress && verifiedAddressesSet.has(toAddress)) {
                          const key = `${transfer.hash.toLowerCase()}-${chain.chainId}`;
                          transfers.set(key, { ...transfer, chainId: chain.chainId });
                        }
                      }

                      if (sentResult.pageKey) {
                        pageKey = sentResult.pageKey;
                      } else {
                        hasMore = false;
                      }
                    } catch (error) {
                      console.error(`[transfers/public] Error consultando enviadas para ${wallet} en chain ${chain.chainId}:`, error);
                      hasMore = false;
                    }
                  }
                  return transfers;
                })(),
                (async () => {
                  const transfers = new Map<string, any>();
                  let pageKey: string | undefined = undefined;
                  let hasMore = true;

                  while (hasMore) {
                    try {
                      const receivedResult = await getAssetTransfers({
                        toAddress: wallet,
                        fromBlock: fromBlock,
                        toBlock: 'latest',
                        category: ['erc20'],
                        pageKey,
                        chainId: chain.chainId,
                      });

                      for (const transfer of receivedResult.transfers) {
                        const fromAddress = transfer.from?.toLowerCase();
                        if (fromAddress && verifiedAddressesSet.has(fromAddress)) {
                          const key = `${transfer.hash.toLowerCase()}-${chain.chainId}`;
                          transfers.set(key, { ...transfer, chainId: chain.chainId });
                        }
                      }

                      if (receivedResult.pageKey) {
                        pageKey = receivedResult.pageKey;
                      } else {
                        hasMore = false;
                      }
                    } catch (error) {
                      console.error(`[transfers/public] Error consultando recibidas para ${wallet} en chain ${chain.chainId}:`, error);
                      hasMore = false;
                    }
                  }
                  return transfers;
                })()
              ]);

              const walletTransfers = new Map<string, any>();
              sentTransfers.forEach((v, k) => walletTransfers.set(k, v));
              receivedTransfers.forEach((v, k) => walletTransfers.set(k, v));
              
              return walletTransfers;
            });

            const walletResults = await Promise.all(walletPromises);
            for (const walletTransfers of walletResults) {
              walletTransfers.forEach((v: any, k: string) => chainTransfers.set(k, v));
            }

            return { chainId: chain.chainId, transfers: chainTransfers };
          });

          const chainResults = await Promise.all(chainPromises);
          
          for (const result of chainResults) {
            result.transfers.forEach((v, k) => allTransfersMap.set(k, v));
          }

          console.log(`[transfers/public] Transferencias detectadas: ${allTransfersMap.size}`);

          if (allTransfersMap.size > 0) {
            // Pre-cargar wallets en batch
            const addressesToLoad = new Set<string>();
            for (const transfer of allTransfersMap.values()) {
              const fromAddress = transfer.from?.toLowerCase() || '';
              const toAddress = transfer.to?.toLowerCase() || '';
              if (fromAddress) addressesToLoad.add(fromAddress);
              if (toAddress) addressesToLoad.add(toAddress);
            }

            const walletsMap = new Map<string, { user_id: string; is_socios_wallet: boolean; privacy_mode: string }>();
            if (addressesToLoad.size > 0) {
              const placeholders = Array.from(addressesToLoad).map((_, idx) => `$${idx + 1}`).join(', ');
              const walletData = await executeQuery(
                `SELECT 
                  LOWER(w.address) as address,
                  w.is_socios_wallet,
                  u.id as user_id,
                  u.privacy_mode
                FROM wallets w
                JOIN users u ON w.user_id = u.id
                WHERE w.status = 'verified' AND LOWER(w.address) IN (${placeholders})`,
                Array.from(addressesToLoad)
              );
              
              for (const w of walletData) {
                walletsMap.set(w.address, {
                  user_id: w.user_id,
                  is_socios_wallet: w.is_socios_wallet === true,
                  privacy_mode: w.privacy_mode || 'auto',
                });
              }
            }

            // Cargar metadatos de tokens en paralelo
            const tokensToLoad = new Map<string, { contractAddress: string; chainId: number }>();
            for (const transfer of allTransfersMap.values()) {
              const contractAddress = transfer.rawContract?.address?.toLowerCase() || '';
              const chainId = transfer.chainId || 1;
              if (!transfer.asset && contractAddress) {
                const tokenKey = `${contractAddress}-${chainId}`;
                if (!tokensToLoad.has(tokenKey)) {
                  tokensToLoad.set(tokenKey, { contractAddress, chainId });
                }
              }
            }

            const tokenMetadataMap = new Map<string, { symbol?: string; name?: string }>();
            if (tokensToLoad.size > 0) {
              const tokenPromises = Array.from(tokensToLoad.entries()).map(async ([key, { contractAddress, chainId }]) => {
                const metadata = await getTokenMetadata(contractAddress, chainId);
                return [key, metadata] as [string, { symbol?: string; name?: string } | null];
              });
              const tokenResults = await Promise.all(tokenPromises);
              for (const [key, metadata] of tokenResults) {
                if (metadata) tokenMetadataMap.set(key, metadata);
              }
            }

            // Verificar existencia en batch
            const transferHashes = Array.from(allTransfersMap.values()).map(t => ({
              hash: t.hash.toLowerCase(),
              chainId: t.chainId || 1
            }));

            const existingSet = new Set<string>();
            if (transferHashes.length > 0) {
              const chunkSize = 100;
              for (let i = 0; i < transferHashes.length; i += chunkSize) {
                const chunk = transferHashes.slice(i, i + chunkSize);
                const placeholders = chunk.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(', ');
                const params = chunk.flatMap(t => [t.hash, t.chainId]);
                const existing = await executeQuery(
                  `SELECT hash, chain_id FROM transfers WHERE (hash, chain_id) IN (${placeholders})`,
                  params
                );
                existing.forEach((e: any) => {
                  existingSet.add(`${e.hash.toLowerCase()}-${e.chain_id}`);
                });
              }
            }

            // Preparar transferencias para insertar/actualizar (solo públicas)
            const transfersToInsert: any[] = [];
            const transfersToUpdate: any[] = [];

            for (const transfer of allTransfersMap.values()) {
              const hash = transfer.hash.toLowerCase();
              const fromAddress = transfer.from?.toLowerCase() || '';
              const toAddress = transfer.to?.toLowerCase() || '';
              const blockNum = transfer.blockNum || '0x0';
              const rawValue = transfer.rawContract?.value || '0';
              const rawDecimal = transfer.rawContract?.decimal || '18';
              const contractAddress = transfer.rawContract?.address?.toLowerCase() || '';
              const chainId = transfer.chainId || 1;
              const chainName = CHAIN_NAMES_MAP.get(chainId) || `Chain ${chainId}`;
              const blockTimestamp = transfer.metadata?.blockTimestamp || null;

              let tokenName = transfer.asset || '';
              if (!tokenName && contractAddress) {
                const tokenKey = `${contractAddress}-${chainId}`;
                const cachedMetadata = tokenMetadataMap.get(tokenKey);
                tokenName = cachedMetadata?.symbol || cachedMetadata?.name || '';
              }

              const decimals = parseInt(rawDecimal);
              const value = BigInt(rawValue);
              const divisor = BigInt(10 ** decimals);
              const usdcValue = Number(value) / Number(divisor);

              const fromWallet = walletsMap.get(fromAddress);
              const toWallet = walletsMap.get(toAddress);

              if (!fromWallet || !toWallet) continue;
              
              // FILTRO: Excluir transferencias entre wallets del mismo usuario
              if (fromWallet.user_id === toWallet.user_id) continue;

              let transferType = 'generic';
              let isPublic = false;
              let approvedBySender = false;
              let approvedByReceiver = false;

              if (toWallet.is_socios_wallet) {
                transferType = 'socios';
              } else {
                const fromPrivacy = fromWallet.privacy_mode || 'auto';
                const toPrivacy = toWallet.privacy_mode || 'auto';
                if (fromPrivacy === 'approval' || toPrivacy === 'approval') {
                  isPublic = false;
                  approvedBySender = fromPrivacy === 'auto';
                  approvedByReceiver = toPrivacy === 'auto';
                } else {
                  isPublic = true;
                  approvedBySender = true;
                  approvedByReceiver = true;
                }
              }

              // Solo procesar transferencias públicas para páginas públicas
              if (!isPublic) continue;

              if (typeFilter && typeFilter === 'sponsoreo' && transferType !== 'sponsoreo') continue;

              const key = `${hash}-${chainId}`;
              const transferData = {
                hash,
                fromAddress,
                toAddress,
                usdcValue,
                blockNum,
                rawValue,
                rawDecimal,
                tokenName,
                chainName,
                contractAddress,
                chainId,
                transferType,
                isPublic,
                approvedBySender,
                approvedByReceiver,
                blockTimestamp,
              };

              if (existingSet.has(key)) {
                transfersToUpdate.push(transferData);
              } else {
                transfersToInsert.push(transferData);
              }
            }

            // Insertar en batch
            if (transfersToInsert.length > 0) {
              const insertChunkSize = 50;
              for (let i = 0; i < transfersToInsert.length; i += insertChunkSize) {
                const chunk = transfersToInsert.slice(i, i + insertChunkSize);
                const values = chunk.map((t, idx) => 
                  `($${idx * 16 + 1}, $${idx * 16 + 2}, $${idx * 16 + 3}, $${idx * 16 + 4}, $${idx * 16 + 5}, $${idx * 16 + 6}, $${idx * 16 + 7}, $${idx * 16 + 8}, $${idx * 16 + 9}, $${idx * 16 + 10}, $${idx * 16 + 11}, $${idx * 16 + 12}, $${idx * 16 + 13}, $${idx * 16 + 14}, $${idx * 16 + 15}, NULL, COALESCE($${idx * 16 + 16}::timestamp, now()))`
                ).join(', ');
                
                const params = chunk.flatMap(t => [
                  t.hash, t.fromAddress, t.toAddress, t.usdcValue, t.blockNum,
                  t.rawValue, t.rawDecimal, t.tokenName, t.chainName, t.contractAddress,
                  t.chainId, t.transferType, t.isPublic, t.approvedBySender, t.approvedByReceiver, t.blockTimestamp
                ]);

                await executeQuery(
                  `INSERT INTO transfers (hash, from_address, to_address, value, block_num, raw_contract_value, raw_contract_decimal, token, chain, contract_address, chain_id, transfer_type, is_public, approved_by_sender, approved_by_receiver, message, created_at)
                   VALUES ${values}
                   ON CONFLICT (hash, chain_id) DO NOTHING`,
                  params
                );
              }
            }

            // Actualizar en batch
            if (transfersToUpdate.length > 0) {
              const updateChunkSize = 50;
              for (let i = 0; i < transfersToUpdate.length; i += updateChunkSize) {
                const chunk = transfersToUpdate.slice(i, i + updateChunkSize);
                const values = chunk.map((t, idx) => 
                  `($${idx * 11 + 1}, $${idx * 11 + 2}, $${idx * 11 + 3}, $${idx * 11 + 4}, $${idx * 11 + 5}, $${idx * 11 + 6}, $${idx * 11 + 7}, $${idx * 11 + 8}, $${idx * 11 + 9}, $${idx * 11 + 10}, $${idx * 11 + 11})`
                ).join(', ');
                
                const params = chunk.flatMap(t => [
                  t.hash, t.chainId, t.fromAddress, t.toAddress, t.usdcValue, 
                  t.blockNum, t.rawValue, t.rawDecimal, t.tokenName, t.chainName, t.contractAddress
                ]);

                await executeQuery(
                  `UPDATE transfers AS t
                   SET from_address = v.from_address, 
                       to_address = v.to_address, 
                       value = v.value, 
                       block_num = v.block_num,
                       raw_contract_value = v.raw_contract_value, 
                       raw_contract_decimal = v.raw_contract_decimal,
                       token = v.token, 
                       chain = v.chain, 
                       contract_address = v.contract_address, 
                       updated_at = now()
                   FROM (VALUES ${values}) AS v(hash, chain_id, from_address, to_address, value, block_num, raw_contract_value, raw_contract_decimal, token, chain, contract_address)
                   WHERE t.hash = v.hash AND t.chain_id = v.chain_id`,
                  params
                );
              }
            }

            console.log(`[transfers/public] Sincronización completada: ${transfersToInsert.length} insertadas, ${transfersToUpdate.length} actualizadas`);
          }

          // Recargar datos de BD después de sync
          publicTransfers = await executeQuery(query, params);
        }
      } catch (error: any) {
        console.error('[transfers/public] Error en sincronización:', error);
        publicTransfers = await executeQuery(query, params);
      }
    }

    // Formatear transferencias
    const formatTransfers = (transfers: any[]) => {
      return transfers.map((t: any) => ({
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
        chainId: t.chain_id || 1,
        tokenLogo: null,
        created_at: t.created_at ? new Date(t.created_at).toISOString() : undefined,
        transfer_type: t.transfer_type || 'generic',
        message: t.message || null,
        message_created_at: t.message_created_at ? new Date(t.message_created_at).toISOString() : null,
        message_updated_at: t.message_updated_at ? new Date(t.message_updated_at).toISOString() : null,
        image_url: t.image_url || null,
        category: t.category || null,
        location: t.location || null,
        description: t.description || null,
        fromUser: {
          username: t.from_username,
          profileImageUrl: t.from_profile_image,
        },
        toUser: {
          username: t.to_username,
          profileImageUrl: t.to_profile_image,
        },
      }));
    };

    const formattedTransfers = formatTransfers(publicTransfers);

    return NextResponse.json({
      transfers: formattedTransfers,
      total: formattedTransfers.length,
      chainId: publicTransfers[0]?.chain_id || 1,
    }, {
      headers: shouldSync 
        ? { 
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        : { 
            'Cache-Control': 'public, s-maxage=36000, stale-while-revalidate=36000',
            'CDN-Cache-Control': 'public, s-maxage=36000',
            'Vercel-CDN-Cache-Control': 'public, s-maxage=36000'
          }
    });
  } catch (error: any) {
    console.error('[transfers/public] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener transferencias públicas', details: error.message },
      { status: 500 }
    );
  }
}
