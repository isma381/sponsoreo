import { NextRequest, NextResponse } from 'next/server';
import { getAssetTransfers, getTokenMetadata, getChainNameFromChainId } from '@/lib/alchemy-api';
import { executeQuery } from '@/lib/db';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';
import { sendNewTransferNotification, sendTransferRequiresApprovalNotification } from '@/lib/resend';
import { getAuthCookie } from '@/lib/auth';

// Redes soportadas por Alchemy
const SUPPORTED_CHAINS = [
  { chainId: 1, name: 'Ethereum Mainnet' },
  { chainId: 11155111, name: 'Sepolia' },
  { chainId: 137, name: 'Polygon' },
  { chainId: 42161, name: 'Arbitrum' },
  { chainId: 10, name: 'Optimism' },
  { chainId: 8453, name: 'Base' },
];

/**
 * Obtiene el último bloque consultado para un usuario/chain
 */
async function getLastSyncedBlock(userId: string | null, chainId: number): Promise<string | null> {
  if (!userId) return null;
  
  try {
    const result = await executeQuery(
      `SELECT last_block_synced FROM user_sync_state_eth WHERE user_id = $1 AND chain_id = $2`,
      [userId, chainId]
    );

    if (result.length > 0 && result[0].last_block_synced) {
      return result[0].last_block_synced;
    }

    // Si no hay último bloque, obtener el más reciente de las transferencias del usuario
    const recentTransfer = await executeQuery(
      `SELECT block_num FROM transfers t
       JOIN wallets w ON LOWER(t.from_address) = LOWER(w.address) OR LOWER(t.to_address) = LOWER(w.address)
       WHERE w.user_id = $1 AND t.chain_id = $2
       ORDER BY t.created_at DESC LIMIT 1`,
      [userId, chainId]
    );

    if (recentTransfer.length > 0 && recentTransfer[0].block_num) {
      return recentTransfer[0].block_num;
    }

    return null;
  } catch (error) {
    console.error('[sync] Error obteniendo último bloque:', error);
    return null;
  }
}

/**
 * Actualiza el último bloque consultado para un usuario/chain
 */
async function updateLastSyncedBlock(userId: string | null, chainId: number, blockNum: string) {
  if (!userId || !blockNum) return;
  
  try {
    await executeQuery(
      `INSERT INTO user_sync_state_eth (user_id, chain_id, last_block_synced, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, chain_id) 
       DO UPDATE SET last_block_synced = $3, updated_at = now()`,
      [userId, chainId, blockNum]
    );
  } catch (error) {
    console.error('[sync] Error actualizando último bloque:', error);
  }
}

/**
 * Sincroniza transferencias con Alchemy en background
 * @param typeFilter - Filtro opcional por tipo de transferencia
 * @param userId - Si se proporciona, solo sincroniza wallets de este usuario
 */
async function syncTransfersInBackground(typeFilter: string | null, userId: string | null = null) {
  try {
    console.log('[API] Iniciando sincronización con Alchemy...', { typeFilter, userId });
    
    // Si userId está presente, solo obtener wallets de ese usuario
    let walletQuery = `SELECT address FROM wallets WHERE status = 'verified'`;
    const walletParams: any[] = [];
    
    if (userId) {
      walletQuery += ` AND user_id = $1`;
      walletParams.push(userId);
    }
    
    const verifiedWallets = await executeQuery(walletQuery, walletParams);

    console.log('[API] Wallets verificadas encontradas:', verifiedWallets.length);

    if (verifiedWallets.length === 0) {
      console.log('[API] No hay wallets verificadas, saltando sincronización');
      return;
    }

    // Obtener todas las wallets verificadas para comparar (necesario para filtrar transferencias entre usuarios)
    const allVerifiedWallets = await executeQuery(
      `SELECT address FROM wallets WHERE status = 'verified'`,
      []
    );
    const allUserWallets = allVerifiedWallets.map((w: any) => w.address.toLowerCase());

    const userWallets = verifiedWallets.map((w: any) => w.address.toLowerCase());
    const allTransfersMap = new Map<string, any>();

    // Priorizar Sepolia primero (chain más usada)
    const sortedChains = [...SUPPORTED_CHAINS].sort((a, b) => 
      a.chainId === 11155111 ? -1 : b.chainId === 11155111 ? 1 : 0
    );
    
    // Consultar Alchemy para sincronizar - todas las redes
    for (const chain of sortedChains) {
      const lastBlock = userId ? await getLastSyncedBlock(userId, chain.chainId) : null;
      const fromBlock = lastBlock || '0x0';
      
      console.log(`[API] Sincronizando chain ${chain.chainId} desde bloque ${fromBlock}`);
      
      let maxBlockNum = fromBlock; // Trackear el bloque más alto consultado
      const isFirstSync = fromBlock === '0x0';
      const maxPages = isFirstSync ? 1 : 5; // Primera vez: solo 1 página para ser rápido

      for (const userWallet of userWallets) {
        // Consultar transferencias ENVIADAS
        let pageKey: string | undefined = undefined;
        let hasMore = true;
        let pageCount = 0;

        while (hasMore && pageCount < maxPages) {
          try {
            const sentResult = await getAssetTransfers({
              fromAddress: userWallet,
              fromBlock: fromBlock,
              toBlock: 'latest',
              category: ['erc20'],
              pageKey,
              chainId: chain.chainId,
            });

            // Trackear bloque más alto de TODAS las transferencias consultadas
            for (const transfer of sentResult.transfers) {
              if (transfer.blockNum) {
                const currentBlock = parseInt(transfer.blockNum, 16);
                const maxBlock = parseInt(maxBlockNum, 16);
                if (currentBlock > maxBlock) {
                  maxBlockNum = transfer.blockNum;
                }
              }
            }

            for (const transfer of sentResult.transfers) {
              const toAddress = transfer.to?.toLowerCase();
              if (toAddress && allUserWallets.includes(toAddress)) {
                const transferKey = `${transfer.hash.toLowerCase()}-${chain.chainId}`;
                allTransfersMap.set(transferKey, { ...transfer, chainId: chain.chainId });
              }
            }

            if (sentResult.pageKey) {
              pageKey = sentResult.pageKey;
            } else {
              hasMore = false;
            }
            pageCount++;
          } catch (error) {
            console.error(`[transfers] Error consultando transferencias enviadas para ${userWallet} en chain ${chain.chainId}:`, error);
            hasMore = false;
          }
        }

        // Consultar transferencias RECIBIDAS
        pageKey = undefined;
        hasMore = true;
        pageCount = 0;

        while (hasMore && pageCount < maxPages) {
          try {
            const receivedResult = await getAssetTransfers({
              toAddress: userWallet,
              fromBlock: fromBlock,
              toBlock: 'latest',
              category: ['erc20'],
              pageKey,
              chainId: chain.chainId,
            });

            // Trackear bloque más alto de TODAS las transferencias consultadas
            for (const transfer of receivedResult.transfers) {
              if (transfer.blockNum) {
                const currentBlock = parseInt(transfer.blockNum, 16);
                const maxBlock = parseInt(maxBlockNum, 16);
                if (currentBlock > maxBlock) {
                  maxBlockNum = transfer.blockNum;
                }
              }
            }

            for (const transfer of receivedResult.transfers) {
              const fromAddress = transfer.from?.toLowerCase();
              if (fromAddress && allUserWallets.includes(fromAddress)) {
                const transferKey = `${transfer.hash.toLowerCase()}-${chain.chainId}`;
                allTransfersMap.set(transferKey, { ...transfer, chainId: chain.chainId });
              }
            }

            if (receivedResult.pageKey) {
              pageKey = receivedResult.pageKey;
            } else {
              hasMore = false;
            }
            pageCount++;
          } catch (error) {
            console.error(`[transfers] Error consultando transferencias recibidas para ${userWallet} en chain ${chain.chainId}:`, error);
            hasMore = false;
          }
        }
      }
      
      // Actualizar último bloque consultado (siempre, incluso si no hay transferencias nuevas)
      // Si no hay transferencias, usar el bloque actual como referencia
      if (userId) {
        if (maxBlockNum !== '0x0' && maxBlockNum !== fromBlock) {
          await updateLastSyncedBlock(userId, chain.chainId, maxBlockNum);
        } else if (maxBlockNum === fromBlock && fromBlock !== '0x0') {
          // Si no se encontraron transferencias nuevas pero ya había un bloque guardado, mantenerlo
          await updateLastSyncedBlock(userId, chain.chainId, fromBlock);
        }
      }
    }
    
    // Sincronizar con BD (actualizar/insertar)
    for (const transfer of allTransfersMap.values()) {
      const hash = transfer.hash.toLowerCase();
      const fromAddress = transfer.from?.toLowerCase() || '';
      const toAddress = transfer.to?.toLowerCase() || '';
      const blockNum = transfer.blockNum || '0x0';
      const rawValue = transfer.rawContract?.value || '0';
      const rawDecimal = transfer.rawContract?.decimal || '18';
      const contractAddress = transfer.rawContract?.address?.toLowerCase() || '';
      const blockTimestamp = transfer.metadata?.blockTimestamp || null;
      const chainId = transfer.chainId || SEPOLIA_CHAIN_ID;
      const chainName = await getChainNameFromChainId(chainId);
      
      // Obtener nombre del token desde Alchemy
      let tokenName = transfer.asset || '';
      if (!tokenName && contractAddress) {
        const tokenMetadata = await getTokenMetadata(contractAddress, chainId);
        tokenName = tokenMetadata?.symbol || tokenMetadata?.name || '';
      }
      
      // Calcular valor en USDC
      const decimals = parseInt(rawDecimal);
      const value = BigInt(rawValue);
      const divisor = BigInt(10 ** decimals);
      const usdcValue = Number(value) / Number(divisor);

      // Verificar si existe en BD (hash + chain_id para evitar duplicados entre redes)
      const existing = await executeQuery(
        'SELECT id FROM transfers WHERE hash = $1 AND chain_id = $2',
        [hash, chainId]
      );

      if (existing.length === 0) {
        // Verificar si la wallet receptora es de Socios
        const sociosWallet = await executeQuery(
          `SELECT is_socios_wallet FROM wallets WHERE LOWER(address) = LOWER($1) AND status = 'verified'`,
          [toAddress]
        );

        const isSociosWallet = sociosWallet.length > 0 && sociosWallet[0].is_socios_wallet === true;

        // Obtener privacy_mode y datos de ambos usuarios (necesario para notificaciones y privacidad)
        const usersPrivacy = await executeQuery(
          `SELECT 
            w_from.user_id as from_user_id,
            w_to.user_id as to_user_id,
            u_from.privacy_mode as from_privacy_mode,
            u_from.email as from_email,
            u_from.username as from_username,
            u_to.privacy_mode as to_privacy_mode,
            u_to.email as to_email,
            u_to.username as to_username
          FROM wallets w_from
          JOIN users u_from ON w_from.user_id = u_from.id
          JOIN wallets w_to ON LOWER(w_to.address) = LOWER($2)
          JOIN users u_to ON w_to.user_id = u_to.id
          WHERE LOWER(w_from.address) = LOWER($1)`,
          [fromAddress, toAddress]
        );

        // Determinar transfer_type y privacidad
        let transferType = 'generic';
        let isPublic = true;
        let approvedBySender = true;
        let approvedByReceiver = true;
        let requiresApproval = false;

        if (isSociosWallet) {
          // Transferencia de Socios: privada por defecto
          transferType = 'socios';
          isPublic = false;
          approvedBySender = true;
          approvedByReceiver = true;
          requiresApproval = false;
        } else if (usersPrivacy.length > 0) {
          // Transferencia genérica: usar lógica de privacidad existente
          const privacy = usersPrivacy[0];
          const fromPrivacy = privacy.from_privacy_mode || 'auto';
          const toPrivacy = privacy.to_privacy_mode || 'auto';

          // Si alguno requiere aprobación, la transferencia no es pública inicialmente
          if (fromPrivacy === 'approval' || toPrivacy === 'approval') {
            isPublic = false;
            approvedBySender = fromPrivacy === 'auto';
            approvedByReceiver = toPrivacy === 'auto';
            requiresApproval = true;
          }
        }

        // Insertar nueva transferencia con valores de privacidad y tipo
        await executeQuery(
          `INSERT INTO transfers (hash, from_address, to_address, value, block_num, raw_contract_value, raw_contract_decimal, token, chain, contract_address, chain_id, transfer_type, is_public, approved_by_sender, approved_by_receiver, message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NULL, COALESCE($16::timestamp, now()))
           ON CONFLICT (hash) DO NOTHING`,
          [hash, fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, tokenName, chainName, contractAddress, chainId, transferType, isPublic, approvedBySender, approvedByReceiver, blockTimestamp]
        );

        // Enviar notificaciones solo si no es transferencia de Socios y hay datos de usuarios
        if (!isSociosWallet && usersPrivacy.length > 0) {
          const privacy = usersPrivacy[0];
          const fromPrivacy = privacy.from_privacy_mode || 'auto';
          const toPrivacy = privacy.to_privacy_mode || 'auto';

          try {
            if (privacy.from_email) {
              if (requiresApproval && fromPrivacy === 'approval') {
                await sendTransferRequiresApprovalNotification(
                  privacy.from_email,
                  hash,
                  privacy.to_username || 'Usuario',
                  usdcValue,
                  tokenName
                );
              } else {
                await sendNewTransferNotification(
                  privacy.from_email,
                  hash,
                  privacy.to_username || 'Usuario',
                  usdcValue,
                  tokenName
                );
              }
            }
            if (privacy.to_email) {
              if (requiresApproval && toPrivacy === 'approval') {
                await sendTransferRequiresApprovalNotification(
                  privacy.to_email,
                  hash,
                  privacy.from_username || 'Usuario',
                  usdcValue,
                  tokenName
                );
              } else {
                await sendNewTransferNotification(
                  privacy.to_email,
                  hash,
                  privacy.from_username || 'Usuario',
                  usdcValue,
                  tokenName
                );
              }
            }
          } catch (emailError) {
            console.error('[transfers] Error enviando notificaciones:', emailError);
            // No fallar la inserción si el email falla
          }
        }
      } else {
        // Obtener transfer_type actual para preservar histórico
        const current = await executeQuery('SELECT transfer_type FROM transfers WHERE hash = $1', [hash]);
        const currentType = current[0]?.transfer_type;
        
        // Verificar si la wallet receptora es de Socios
        const sociosWallet = await executeQuery(
          `SELECT is_socios_wallet FROM wallets WHERE LOWER(address) = LOWER($1) AND status = 'verified'`,
          [toAddress]
        );
        const isSociosWallet = sociosWallet.length > 0 && sociosWallet[0].is_socios_wallet === true;
        
        // Solo actualizar a 'socios' si wallet es de Socios Y transferencia no tiene tipo establecido (preservar histórico)
        const shouldUpdateToSocios = isSociosWallet && (currentType === null || currentType === 'generic');
        
        if (shouldUpdateToSocios) {
          await executeQuery(
            `UPDATE transfers 
             SET from_address = $1, to_address = $2, value = $3, block_num = $4, 
                 raw_contract_value = $5, raw_contract_decimal = $6, 
                 token = $8, chain = $9, contract_address = $10, chain_id = $11, 
                 transfer_type = 'socios', is_public = false,
                 created_at = COALESCE($12::timestamp, created_at), updated_at = now()
             WHERE hash = $7`,
            [fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, hash, tokenName, chainName, contractAddress, chainId, blockTimestamp]
          );
        } else {
          await executeQuery(
            `UPDATE transfers 
             SET from_address = $1, to_address = $2, value = $3, block_num = $4, 
                 raw_contract_value = $5, raw_contract_decimal = $6, 
                 token = $8, chain = $9, contract_address = $10, chain_id = $11, 
                 created_at = COALESCE($12::timestamp, created_at), updated_at = now()
             WHERE hash = $7`,
            [fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, hash, tokenName, chainName, contractAddress, chainId, blockTimestamp]
          );
        }
      }
    }
    console.log('[API] Sincronización con Alchemy completada. Transferencias procesadas:', allTransfersMap.size);
  } catch (error) {
    console.error('[transfers] Error en sincronización background:', error);
    // No re-lanzar el error si es background, solo loguear
    if (error instanceof Error) {
      console.error('[transfers] Error details:', error.message, error.stack);
    }
    throw error; // Re-lanzar para que el catch externo lo capture cuando waitSync=true
  }
}

/**
 * GET /api/transfers
 * Obtiene todas las transferencias USDC entre usuarios registrados
 * Siempre devuelve datos de BD inmediatamente y sincroniza en background
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cacheOnly = searchParams.get('cache') === 'true';
    const userOnly = searchParams.get('userOnly') === 'true';
    const typeFilter = searchParams.get('type'); // 'sponsoreo' | null
    const userId = userOnly ? await getAuthCookie() : null;

    // Obtener transferencias de BD (respuesta rápida)
    let cachedQuery = `SELECT t.*, 
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
         AND u2.username IS NOT NULL`;

    // Agregar filtro por tipo si es 'sponsoreo'
    if (typeFilter === 'sponsoreo') {
      cachedQuery += ` AND t.transfer_type = 'sponsoreo'`;
    }

    cachedQuery += ` ORDER BY t.created_at DESC LIMIT 100`;

    const cachedTransfers = await executeQuery(cachedQuery, []);

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
        chainId: t.chain_id || SEPOLIA_CHAIN_ID,
        tokenLogo: null,
        created_at: t.created_at ? new Date(t.created_at).toISOString() : undefined,
        transfer_type: t.transfer_type || 'generic',
        message: t.message || null,
        message_created_at: t.message_created_at ? new Date(t.message_created_at).toISOString() : null,
        message_updated_at: t.message_updated_at ? new Date(t.message_updated_at).toISOString() : null,
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

    const formattedCached = formatTransfers(cachedTransfers);

    // Si es solo cache, devolver inmediatamente
    if (cacheOnly) {
      return NextResponse.json({
        transfers: formattedCached,
        total: formattedCached.length,
        chainId: cachedTransfers[0]?.chain_id || SEPOLIA_CHAIN_ID,
        fromCache: true,
      });
    }

    // Sincronizar con Alchemy y esperar que termine
    await syncTransfersInBackground(typeFilter, userId);

    // Obtener transferencias finales actualizadas de BD
    const finalTransfers = await executeQuery(cachedQuery, []);
    const formattedFinal = formatTransfers(finalTransfers);

    return NextResponse.json({
      transfers: formattedFinal,
      total: formattedFinal.length,
      chainId: finalTransfers[0]?.chain_id || SEPOLIA_CHAIN_ID,
      fromCache: false,
    });
  } catch (error: any) {
    console.error('[transfers] Error obteniendo transferencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener transferencias', details: error.message },
      { status: 500 }
    );
  }
}

