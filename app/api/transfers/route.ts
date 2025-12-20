import { NextRequest, NextResponse } from 'next/server';
import { getAssetTransfers, getTokenMetadata, getChainId, getChainNameFromChainId } from '@/lib/alchemy-api';
import { executeQuery } from '@/lib/db';
import { USDC_SEPOLIA_ADDRESS, SEPOLIA_CHAIN_ID } from '@/lib/constants';
import { sendNewTransferNotification, sendTransferRequiresApprovalNotification } from '@/lib/resend';

/**
 * GET /api/transfers
 * Obtiene todas las transferencias USDC entre usuarios registrados
 * Implementa sistema de cache con tabla transfers
 * 
 * Parámetro ?cache=true: Solo devuelve datos de BD (rápido)
 * Sin parámetro: Devuelve datos de BD y luego sincroniza con Alchemy
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cacheOnly = searchParams.get('cache') === 'true';

    // 1. Obtener transferencias de BD primero (respuesta rápida)
    const cachedTransfers = await executeQuery(
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

    const formatTransfers = (transfers: any[], chainId: number) => {
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
        chainId: t.chain_id || chainId,
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
    };

    const defaultChainId = SEPOLIA_CHAIN_ID;
    const formattedCached = formatTransfers(cachedTransfers, defaultChainId);

    // Si es solo cache, devolver inmediatamente
    if (cacheOnly) {
      return NextResponse.json({
        transfers: formattedCached,
        total: formattedCached.length,
        chainId: cachedTransfers[0]?.chain_id || defaultChainId,
        fromCache: true,
      });
    }

    // 2. Sincronizar con Alchemy (en segundo plano)
    const verifiedWallets = await executeQuery(
      `SELECT address FROM wallets WHERE status = 'verified'`,
      []
    );

    if (verifiedWallets.length === 0) {
      return NextResponse.json({
        transfers: formattedCached,
        total: formattedCached.length,
        chainId: defaultChainId,
        fromCache: true,
      });
    }

    const userWallets = verifiedWallets.map((w: any) => w.address.toLowerCase());
    const allTransfersMap = new Map<string, any>();

    // Consultar Alchemy para sincronizar
    for (const userWallet of userWallets) {
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
            contractAddress: USDC_SEPOLIA_ADDRESS,
            category: ['erc20'],
            pageKey,
          });

          for (const transfer of sentResult.transfers) {
            const toAddress = transfer.to?.toLowerCase();
            if (toAddress && userWallets.includes(toAddress)) {
              allTransfersMap.set(transfer.hash.toLowerCase(), transfer);
            }
          }

          if (sentResult.pageKey) {
            pageKey = sentResult.pageKey;
          } else {
            hasMore = false;
          }
          pageCount++;
        } catch (error) {
          console.error(`[transfers] Error consultando transferencias enviadas para ${userWallet}:`, error);
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
            contractAddress: USDC_SEPOLIA_ADDRESS,
            category: ['erc20'],
            pageKey,
          });

          for (const transfer of receivedResult.transfers) {
            const fromAddress = transfer.from?.toLowerCase();
            if (fromAddress && userWallets.includes(fromAddress)) {
              allTransfersMap.set(transfer.hash.toLowerCase(), transfer);
            }
          }

          if (receivedResult.pageKey) {
            pageKey = receivedResult.pageKey;
          } else {
            hasMore = false;
          }
          pageCount++;
        } catch (error) {
          console.error(`[transfers] Error consultando transferencias recibidas para ${userWallet}:`, error);
          hasMore = false;
        }
      }
    }

    // 3. Obtener chainId y nombre de la chain
    const chainId = await getChainId() || SEPOLIA_CHAIN_ID;
    const chainName = await getChainNameFromChainId(chainId);
    
    // 4. Sincronizar con BD (actualizar/insertar)
    for (const transfer of allTransfersMap.values()) {
      const hash = transfer.hash.toLowerCase();
      const fromAddress = transfer.from?.toLowerCase() || '';
      const toAddress = transfer.to?.toLowerCase() || '';
      const blockNum = transfer.blockNum || '0x0';
      const rawValue = transfer.rawContract?.value || '0';
      const rawDecimal = transfer.rawContract?.decimal || '18';
      const contractAddress = transfer.rawContract?.address?.toLowerCase() || USDC_SEPOLIA_ADDRESS.toLowerCase();
      const blockTimestamp = transfer.metadata?.blockTimestamp || null;
      
      // Obtener nombre del token desde Alchemy
      let tokenName = transfer.asset || '';
      if (!tokenName && contractAddress) {
        const tokenMetadata = await getTokenMetadata(contractAddress);
        tokenName = tokenMetadata?.symbol || tokenMetadata?.name || '';
      }
      
      // Calcular valor en USDC
      const decimals = parseInt(rawDecimal);
      const value = BigInt(rawValue);
      const divisor = BigInt(10 ** decimals);
      const usdcValue = Number(value) / Number(divisor);

      // Verificar si existe en BD
      const existing = await executeQuery(
        'SELECT id FROM transfers WHERE hash = $1',
        [hash]
      );

      if (existing.length === 0) {
        // Obtener privacy_mode y datos de ambos usuarios para determinar aprobación automática y notificaciones
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

        // Determinar valores de aprobación según privacy_mode
        let isPublic = true;
        let approvedBySender = true;
        let approvedByReceiver = true;
        let requiresApproval = false;

        if (usersPrivacy.length > 0) {
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

          // Insertar nueva transferencia con valores de privacidad
          await executeQuery(
            `INSERT INTO transfers (hash, from_address, to_address, value, block_num, raw_contract_value, raw_contract_decimal, token, chain, contract_address, chain_id, is_public, approved_by_sender, approved_by_receiver, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15::timestamp, now()))
             ON CONFLICT (hash) DO NOTHING`,
            [hash, fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, tokenName, chainName, contractAddress, chainId, isPublic, approvedBySender, approvedByReceiver, blockTimestamp]
          );

          // Enviar notificaciones
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
        } else {
          // Si no se encuentran usuarios, insertar sin notificaciones
          await executeQuery(
            `INSERT INTO transfers (hash, from_address, to_address, value, block_num, raw_contract_value, raw_contract_decimal, token, chain, contract_address, chain_id, is_public, approved_by_sender, approved_by_receiver, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15::timestamp, now()))
             ON CONFLICT (hash) DO NOTHING`,
            [hash, fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, tokenName, chainName, contractAddress, chainId, isPublic, approvedBySender, approvedByReceiver, blockTimestamp]
          );
        }
      } else {
        // Actualizar si hay diferencias
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

    // 5. Obtener transferencias finales actualizadas de BD
    const finalTransfers = await executeQuery(
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

    const formattedFinal = formatTransfers(finalTransfers, chainId);

    return NextResponse.json({
      transfers: formattedFinal,
      total: formattedFinal.length,
      chainId: chainId,
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

