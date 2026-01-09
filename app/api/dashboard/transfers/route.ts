import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { getAssetTransfers, getTokenMetadata } from '@/lib/alchemy-api';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';

// Redes soportadas
const SUPPORTED_CHAINS = [
  { chainId: 1, name: 'Ethereum Mainnet' },
  { chainId: 11155111, name: 'Sepolia' },
  { chainId: 10, name: 'Optimism' },
  { chainId: 137, name: 'Polygon' },
  { chainId: 42161, name: 'Arbitrum' },
  { chainId: 8453, name: 'Base' },
];

const CHAIN_NAMES_MAP = new Map<number, string>([
  [1, 'Ethereum Mainnet'],
  [11155111, 'Sepolia'],
  [10, 'Optimism'],
  [137, 'Polygon'],
  [42161, 'Arbitrum'],
  [8453, 'Base'],
]);

/**
 * Obtiene los últimos block_num registrados para múltiples wallets y chains en batch
 * Retorna Map con key "wallet-chainId" y value block_num (o null si no hay transferencias)
 */
async function getLastBlocksBatch(
  walletAddresses: string[],
  chainIds: number[]
): Promise<Map<string, string | null>> {
  const resultMap = new Map<string, string | null>();
  
  if (walletAddresses.length === 0 || chainIds.length === 0) {
    return resultMap;
  }

  // Inicializar todos con null
  for (const wallet of walletAddresses) {
    for (const chainId of chainIds) {
      resultMap.set(`${wallet}-${chainId}`, null);
    }
  }

  // Query batch: obtener último bloque por wallet y chain (desde from_address o to_address)
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

  // Actualizar resultMap con los valores encontrados
  for (const row of results as any[]) {
    const key = `${row.address}-${row.chain_id}`;
    resultMap.set(key, row.block_num);
  }

  return resultMap;
}

/**
 * GET /api/dashboard/transfers
 * Endpoint simplificado - funciona como el ejemplo funcional
 * Consulta Alchemy directamente y procesa transferencias de forma simple
 * Optimizado: consulta solo desde el último bloque registrado (solo bloques nuevos)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthCookie();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario tenga wallet verificada
    const wallets = await executeQuery(
      'SELECT status FROM wallets WHERE user_id = $1',
      [userId]
    );
    
    const hasVerifiedWallet = wallets.some((w: any) => w.status === 'verified');
    if (!hasVerifiedWallet) {
      return NextResponse.json(
        { error: 'Wallet no verificada', requiresOnboarding: true },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const shouldSync = searchParams.get('sync') === 'true';

    // Query para obtener transferencias del usuario
    let query = `SELECT t.*, 
        u_from.username as from_username, 
        u_from.profile_image_url as from_image,
        u_to.username as to_username, 
        u_to.profile_image_url as to_image,
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id
      FROM transfers t
      JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
      JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
      JOIN users u_from ON w_from.user_id = u_from.id
      JOIN users u_to ON w_to.user_id = u_to.id
      WHERE (w_from.user_id = $1 OR w_to.user_id = $1)
        AND w_from.user_id != w_to.user_id`;

    const params: any[] = [userId];

    if (typeFilter && ['generic', 'socios', 'sponsoreo'].includes(typeFilter)) {
      query += ` AND t.transfer_type = $2`;
      params.push(typeFilter);
    }

    query += ` ORDER BY t.created_at DESC`;

    // 1. Cargar datos de BD primero (rápido)
    let transfers = await executeQuery(query, params);

    // 2. Si sync=true: Sincronizar con Alchemy directamente (como el ejemplo funcional)
    if (shouldSync) {
      try {
        console.log('[dashboard/transfers] Iniciando sincronización directa con Alchemy...');
        
        // Obtener wallets verificadas del usuario
        const userWallets = await executeQuery(
          `SELECT address FROM wallets WHERE status = 'verified' AND user_id = $1`,
          [userId]
        );

        if (userWallets.length === 0) {
          console.warn('[dashboard/transfers] No hay wallets verificadas para el usuario');
        } else {
          // Obtener todas las wallets verificadas (para verificar contrapartes)
          const allVerifiedWallets = await executeQuery(
            `SELECT LOWER(address) as address FROM wallets WHERE status = 'verified'`,
            []
          );
          const verifiedAddressesSet = new Set<string>(
            allVerifiedWallets.map((w: any) => w.address)
          );

          const userWalletAddresses = userWallets.map((w: any) => w.address.toLowerCase());
          const allTransfersMap = new Map<string, any>();

          // Pre-cargar últimos bloques registrados para todas las wallets y chains en batch
          const chainIds = SUPPORTED_CHAINS.map(c => c.chainId);
          const lastBlocksMap = await getLastBlocksBatch(userWalletAddresses, chainIds);

          // Procesar todas las chains en paralelo
          const chainPromises = SUPPORTED_CHAINS.map(async (chain) => {
            const chainTransfers = new Map<string, any>();

            // Procesar todas las wallets en paralelo dentro de esta chain
            const walletPromises = userWalletAddresses.map(async (userWallet: string) => {
              // Obtener último bloque registrado para esta wallet y chain
              const key = `${userWallet}-${chain.chainId}`;
              const lastBlock = lastBlocksMap.get(key);
              const fromBlock = lastBlock || '0x0'; // Si no hay último bloque, consultar desde el inicio
              
              if (lastBlock) {
                console.log(`[dashboard/transfers] Consultando desde bloque ${lastBlock} para wallet ${userWallet} en chain ${chain.chainId} (solo bloques nuevos)`);
              } else {
                console.log(`[dashboard/transfers] Primera vez para wallet ${userWallet} en chain ${chain.chainId}, consultando desde inicio`);
              }

              // Consultar transferencias ENVIADAS y RECIBIDAS en paralelo
              const [sentTransfers, receivedTransfers] = await Promise.all([
                (async () => {
                  const transfers = new Map<string, any>();
                  let pageKey: string | undefined = undefined;
                  let hasMore = true;

                  while (hasMore) {
                    try {
                      const sentResult = await getAssetTransfers({
                        fromAddress: userWallet,
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
                      console.error(`[dashboard/transfers] Error consultando transferencias enviadas para ${userWallet} en chain ${chain.chainId}:`, error);
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
                        toAddress: userWallet,
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
                      console.error(`[dashboard/transfers] Error consultando transferencias recibidas para ${userWallet} en chain ${chain.chainId}:`, error);
                      hasMore = false;
                    }
                  }
                  return transfers;
                })()
              ]);

              // Consolidar transferencias de esta wallet
              const walletTransfers = new Map<string, any>();
              sentTransfers.forEach((v, k) => walletTransfers.set(k, v));
              receivedTransfers.forEach((v, k) => walletTransfers.set(k, v));
              
              return walletTransfers;
            });

            // Esperar todas las wallets y consolidar
            const walletResults = await Promise.all(walletPromises);
            for (const walletTransfers of walletResults) {
              walletTransfers.forEach((v: any, k: string) => chainTransfers.set(k, v));
            }

            return { chainId: chain.chainId, transfers: chainTransfers };
          });

          const chainResults = await Promise.all(chainPromises);
          
          // Consolidar todas las transferencias
          for (const result of chainResults) {
            result.transfers.forEach((v, k) => allTransfersMap.set(k, v));
          }

          console.log(`[dashboard/transfers] Transferencias detectadas desde Alchemy: ${allTransfersMap.size}`);

          if (allTransfersMap.size === 0) {
            console.log('[dashboard/transfers] No hay transferencias nuevas para procesar');
          } else {
            // OPTIMIZACIÓN: Pre-cargar todos los datos necesarios en batch

            // 1. Recolectar todas las direcciones de wallets necesarias
            const addressesToLoad = new Set<string>();
            for (const transfer of allTransfersMap.values()) {
              const fromAddress = transfer.from?.toLowerCase() || '';
              const toAddress = transfer.to?.toLowerCase() || '';
              if (fromAddress) addressesToLoad.add(fromAddress);
              if (toAddress) addressesToLoad.add(toAddress);
            }

            // 2. Pre-cargar todas las wallets en batch
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
              console.log(`[dashboard/transfers] Wallets cargadas en batch: ${walletData.length}`);
            }

            // 3. Recolectar todos los tokens que necesitan metadata
            const tokensToLoad = new Map<string, { contractAddress: string; chainId: number }>();
            for (const transfer of allTransfersMap.values()) {
              const contractAddress = transfer.rawContract?.address?.toLowerCase() || '';
              const chainId = transfer.chainId || SEPOLIA_CHAIN_ID;
              if (!transfer.asset && contractAddress) {
                const tokenKey = `${contractAddress}-${chainId}`;
                if (!tokensToLoad.has(tokenKey)) {
                  tokensToLoad.set(tokenKey, { contractAddress, chainId });
                }
              }
            }

            // 4. Cargar todos los metadatos de tokens en paralelo
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
              console.log(`[dashboard/transfers] Metadatos de tokens cargados en paralelo: ${tokenMetadataMap.size}`);
            }

            // 5. Verificar existencia de todas las transferencias en batch
            const transferHashes = Array.from(allTransfersMap.values()).map(t => ({
              hash: t.hash.toLowerCase(),
              chainId: t.chainId || SEPOLIA_CHAIN_ID
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
              console.log(`[dashboard/transfers] Verificación de existencia en batch: ${existingSet.size} ya registradas de ${transferHashes.length}`);
            }

            // 6. Preparar transferencias para insertar/actualizar
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
              const chainId = transfer.chainId || SEPOLIA_CHAIN_ID;
              const chainName = CHAIN_NAMES_MAP.get(chainId) || `Chain ${chainId}`;
              const blockTimestamp = transfer.metadata?.blockTimestamp || null;

              // Obtener nombre del token desde cache
              let tokenName = transfer.asset || '';
              if (!tokenName && contractAddress) {
                const tokenKey = `${contractAddress}-${chainId}`;
                const cachedMetadata = tokenMetadataMap.get(tokenKey);
                tokenName = cachedMetadata?.symbol || cachedMetadata?.name || '';
              }

              // Calcular valor
              const decimals = parseInt(rawDecimal);
              const value = BigInt(rawValue);
              const divisor = BigInt(10 ** decimals);
              const usdcValue = Number(value) / Number(divisor);

              // Obtener datos de wallets desde cache
              const fromWallet = walletsMap.get(fromAddress);
              const toWallet = walletsMap.get(toAddress);

              if (!fromWallet || !toWallet) continue;
              
              // FILTRO: Excluir transferencias entre wallets del mismo usuario
              if (fromWallet.user_id === toWallet.user_id) continue;

              // Determinar tipo y privacidad
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

              if (typeFilter && transferType !== typeFilter) continue;

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

            // 7. Insertar nuevas transferencias en batch
            let insertedCount = 0;
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
                insertedCount += chunk.length;
              }
            }

            // 8. Actualizar transferencias existentes en batch
            let updatedCount = 0;
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
                updatedCount += chunk.length;
              }
            }

            console.log(`[dashboard/transfers] Sincronización completada: ${insertedCount} insertadas, ${updatedCount} actualizadas`);
          }

          // Recargar datos de BD después de sync (SIEMPRE, incluso si hubo errores)
          transfers = await executeQuery(query, params);
        }
      } catch (error: any) {
        console.error('[dashboard/transfers] ❌ ERROR en sincronización:', error);
        console.error('[dashboard/transfers] Mensaje:', error.message);
        console.error('[dashboard/transfers] Stack:', error.stack);
        // Recargar datos de BD incluso si hubo error en la sincronización
        transfers = await executeQuery(query, params);
      }
    }

    // Separar en pendientes y públicas
    const pending = transfers.filter((t: any) => !t.is_public);
    const publicTransfers = transfers.filter((t: any) => t.is_public);

    // Agrupar por tipo (incluir null/undefined en generic)
    const generic = transfers.filter((t: any) => !t.transfer_type || t.transfer_type === 'generic');
    const socios = transfers.filter((t: any) => t.transfer_type === 'socios');
    const sponsoreo = transfers.filter((t: any) => t.transfer_type === 'sponsoreo');

    // Formatear transferencias
    const formatTransfer = (t: any) => ({
      id: t.id,
      hash: t.hash,
      from: t.from_address,
      to: t.to_address,
      value: parseFloat(t.value),
      token: t.token || 'USDC',
      chain: t.chain || 'Sepolia',
      chainId: t.chain_id || 11155111,
      contractAddress: t.contract_address,
      created_at: t.created_at ? new Date(t.created_at).toISOString() : undefined,
      is_public: t.is_public,
      approved_by_sender: t.approved_by_sender,
      approved_by_receiver: t.approved_by_receiver,
      editing_permission_user_id: t.editing_permission_user_id,
      transfer_type: t.transfer_type || 'generic',
      message: t.message || null,
      message_created_at: t.message_created_at ? new Date(t.message_created_at).toISOString() : null,
      message_updated_at: t.message_updated_at ? new Date(t.message_updated_at).toISOString() : null,
      image_url: t.image_url,
      category: t.category,
      location: t.location,
      description: t.description,
      fromUser: {
        username: t.from_username,
        profileImageUrl: t.from_image,
        userId: t.from_user_id,
      },
      toUser: {
        username: t.to_username,
        profileImageUrl: t.to_image,
        userId: t.to_user_id,
      },
      isSender: t.from_user_id === userId,
      isReceiver: t.to_user_id === userId,
    });

    return NextResponse.json({
      pending: pending.map(formatTransfer),
      public: publicTransfers.map(formatTransfer),
      all: transfers.map(formatTransfer),
      byType: {
        generic: generic.map(formatTransfer),
        socios: socios.map(formatTransfer),
        sponsoreo: sponsoreo.map(formatTransfer),
      },
      syncInfo: shouldSync ? {
        transfersProcessed: transfers.length,
        detectedTransfers: transfers.length,
        insertedTransfers: transfers.length,
        walletsChecked: 0,
        verifiedAddressesCount: 0,
        chainsProcessed: SUPPORTED_CHAINS.map(c => c.chainId)
      } : null,
    });
  } catch (error: any) {
    console.error('[dashboard/transfers] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener transferencias', details: error.message },
      { status: 500 }
    );
  }
}
