import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { getAssetTransfers, getTokenMetadata, getChainId, getChainNameFromChainId } from '@/lib/alchemy-api';
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
 * GET /api/dashboard/transfers
 * Endpoint simplificado - funciona como el ejemplo funcional
 * Consulta Alchemy directamente y procesa transferencias de forma simple
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
      WHERE (w_from.user_id = $1 OR w_to.user_id = $1)`;

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

          // Procesar todas las chains en paralelo
          const chainPromises = SUPPORTED_CHAINS.map(async (chain) => {
            const chainTransfers = new Map<string, any>();

            for (const userWallet of userWalletAddresses) {
              // Consultar transferencias ENVIADAS
              let pageKey: string | undefined = undefined;
              let hasMore = true;
              let pageCount = 0;

              while (hasMore && pageCount < 5) {
                try {
                  const sentResult = await getAssetTransfers({
                    fromAddress: userWallet,
                    fromBlock: '0x0',
                    toBlock: 'latest',
                    category: ['erc20'],
                    pageKey,
                    chainId: chain.chainId,
                  });

                  for (const transfer of sentResult.transfers) {
                    const toAddress = transfer.to?.toLowerCase();
                    if (toAddress && verifiedAddressesSet.has(toAddress)) {
                      const key = `${transfer.hash.toLowerCase()}-${chain.chainId}`;
                      chainTransfers.set(key, { ...transfer, chainId: chain.chainId });
                    }
                  }

                  if (sentResult.pageKey) {
                    pageKey = sentResult.pageKey;
                  } else {
                    hasMore = false;
                  }
                  pageCount++;
                } catch (error) {
                  console.error(`[dashboard/transfers] Error consultando transferencias enviadas para ${userWallet} en chain ${chain.chainId}:`, error);
                  hasMore = false;
                }
              }

              // Consultar transferencias RECIBIDAS
              pageKey = undefined;
              hasMore = true;
              pageCount = 0;

              while (hasMore && pageCount < 5) {
                try {
                  const receivedResult = await getAssetTransfers({
                    toAddress: userWallet,
                    fromBlock: '0x0',
                    toBlock: 'latest',
                    category: ['erc20'],
                    pageKey,
                    chainId: chain.chainId,
                  });

                  for (const transfer of receivedResult.transfers) {
                    const fromAddress = transfer.from?.toLowerCase();
                    if (fromAddress && verifiedAddressesSet.has(fromAddress)) {
                      const key = `${transfer.hash.toLowerCase()}-${chain.chainId}`;
                      chainTransfers.set(key, { ...transfer, chainId: chain.chainId });
                    }
                  }

                  if (receivedResult.pageKey) {
                    pageKey = receivedResult.pageKey;
                  } else {
                    hasMore = false;
                  }
                  pageCount++;
                } catch (error) {
                  console.error(`[dashboard/transfers] Error consultando transferencias recibidas para ${userWallet} en chain ${chain.chainId}:`, error);
                  hasMore = false;
                }
              }
            }

            return { chainId: chain.chainId, transfers: chainTransfers };
          });

          const chainResults = await Promise.all(chainPromises);
          
          // Consolidar todas las transferencias
          for (const result of chainResults) {
            result.transfers.forEach((v, k) => allTransfersMap.set(k, v));
          }

          console.log(`[dashboard/transfers] Transferencias detectadas desde Alchemy: ${allTransfersMap.size}`);

          // Procesar e insertar/actualizar en BD (como el ejemplo funcional)
          let insertedCount = 0;
          let updatedCount = 0;

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

            // Obtener nombre del token
            let tokenName = transfer.asset || '';
            if (!tokenName && contractAddress) {
              const tokenMetadata = await getTokenMetadata(contractAddress, chainId);
              tokenName = tokenMetadata?.symbol || tokenMetadata?.name || '';
            }

            // Calcular valor
            const decimals = parseInt(rawDecimal);
            const value = BigInt(rawValue);
            const divisor = BigInt(10 ** decimals);
            const usdcValue = Number(value) / Number(divisor);

            // Obtener datos de wallets
            const fromWalletData = await executeQuery(
              `SELECT w.user_id, w.is_socios_wallet, u.privacy_mode 
               FROM wallets w 
               JOIN users u ON w.user_id = u.id 
               WHERE LOWER(w.address) = $1 AND w.status = 'verified'`,
              [fromAddress]
            );

            const toWalletData = await executeQuery(
              `SELECT w.user_id, w.is_socios_wallet, u.privacy_mode 
               FROM wallets w 
               JOIN users u ON w.user_id = u.id 
               WHERE LOWER(w.address) = $1 AND w.status = 'verified'`,
              [toAddress]
            );

            if (fromWalletData.length === 0 || toWalletData.length === 0) continue;

            const fromWallet = fromWalletData[0];
            const toWallet = toWalletData[0];

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

            // Verificar si existe en BD
            const existing = await executeQuery(
              'SELECT id FROM transfers WHERE hash = $1 AND chain_id = $2',
              [hash, chainId]
            );

            if (existing.length === 0) {
              // Insertar nueva transferencia
              await executeQuery(
                `INSERT INTO transfers (hash, from_address, to_address, value, block_num, raw_contract_value, raw_contract_decimal, token, chain, contract_address, chain_id, transfer_type, is_public, approved_by_sender, approved_by_receiver, message, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NULL, COALESCE($16::timestamp, now()))
                 ON CONFLICT (hash, chain_id) DO NOTHING`,
                [hash, fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, tokenName, chainName, contractAddress, chainId, transferType, isPublic, approvedBySender, approvedByReceiver, blockTimestamp]
              );
              insertedCount++;
            } else {
              // Actualizar si hay diferencias (blockchain es fuente de verdad)
              await executeQuery(
                `UPDATE transfers 
                 SET from_address = $1, to_address = $2, value = $3, block_num = $4, 
                     raw_contract_value = $5, raw_contract_decimal = $6, 
                     token = $8, chain = $9, contract_address = $10, updated_at = now()
                 WHERE hash = $7 AND chain_id = $11`,
                [fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, hash, tokenName, chainName, contractAddress, chainId]
              );
              updatedCount++;
            }
          }

          console.log(`[dashboard/transfers] Sincronización completada: ${insertedCount} insertadas, ${updatedCount} actualizadas`);

          // Recargar datos de BD después de sync
          transfers = await executeQuery(query, params);
        }
      } catch (error: any) {
        console.error('[dashboard/transfers] ❌ ERROR en sincronización:', error);
        console.error('[dashboard/transfers] Mensaje:', error.message);
        console.error('[dashboard/transfers] Stack:', error.stack);
      }
    }

    // Separar en pendientes y públicas
    const pending = transfers.filter((t: any) => !t.is_public);
    const publicTransfers = transfers.filter((t: any) => t.is_public);

    // Agrupar por tipo
    const generic = transfers.filter((t: any) => t.transfer_type === 'generic');
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
