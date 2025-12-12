import { NextRequest, NextResponse } from 'next/server';
import { getAssetTransfers, getTokenMetadata, getChainId, getChainNameFromChainId } from '@/lib/alchemy-api';
import { executeQuery } from '@/lib/db';
import { USDC_SEPOLIA_ADDRESS, SEPOLIA_CHAIN_ID } from '@/lib/constants';

/**
 * GET /api/transfers
 * Obtiene todas las transferencias USDC entre usuarios registrados
 * Implementa sistema de cache con tabla transfers
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Obtener todas las wallets verificadas
    const verifiedWallets = await executeQuery(
      `SELECT address FROM wallets WHERE status = 'verified'`,
      []
    );

    if (verifiedWallets.length === 0) {
      return NextResponse.json({ transfers: [] });
    }

    const userWallets = verifiedWallets.map((w: any) => w.address.toLowerCase());

    // 2. Consultar Alchemy para sincronizar con cache
    const allTransfersMap = new Map<string, any>();

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

    // 3. Obtener chainId y nombre de la chain desde Alchemy y chainlist.org
    const chainId = await getChainId() || SEPOLIA_CHAIN_ID;
    const chainName = await getChainNameFromChainId(chainId);
    
    // 4. Sincronizar con BD (cache)
    for (const transfer of allTransfersMap.values()) {
      const hash = transfer.hash.toLowerCase();
      const fromAddress = transfer.from?.toLowerCase() || '';
      const toAddress = transfer.to?.toLowerCase() || '';
      const blockNum = transfer.blockNum || '0x0';
      const rawValue = transfer.rawContract?.value || '0';
      const rawDecimal = transfer.rawContract?.decimal || '18';
      const contractAddress = transfer.rawContract?.address?.toLowerCase() || USDC_SEPOLIA_ADDRESS.toLowerCase();
      
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
        // Insertar nueva transferencia
        await executeQuery(
          `INSERT INTO transfers (hash, from_address, to_address, value, block_num, raw_contract_value, raw_contract_decimal, token, chain, contract_address, chain_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (hash) DO NOTHING`,
          [hash, fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, tokenName, chainName, contractAddress, chainId]
        );
      } else {
        // Actualizar si hay diferencias (incluyendo nuevos campos)
        await executeQuery(
          `UPDATE transfers 
           SET from_address = $1, to_address = $2, value = $3, block_num = $4, 
               raw_contract_value = $5, raw_contract_decimal = $6, 
               token = $8, chain = $9, contract_address = $10, chain_id = $11, updated_at = now()
           WHERE hash = $7`,
          [fromAddress, toAddress, usdcValue, blockNum, rawValue, rawDecimal, hash, tokenName, chainName, contractAddress, chainId]
        );
      }
    }

    // 5. Obtener transferencias finales de BD (solo usuarios con username)
    const finalTransfers = await executeQuery(
      `SELECT t.*, 
        u1.username as from_username,
        u2.username as to_username
       FROM transfers t
       LEFT JOIN wallets w1 ON LOWER(t.from_address) = LOWER(w1.address)
       LEFT JOIN users u1 ON w1.user_id = u1.id
       LEFT JOIN wallets w2 ON LOWER(t.to_address) = LOWER(w2.address)
       LEFT JOIN users u2 ON w2.user_id = u2.id
       WHERE w1.status = 'verified' 
         AND w2.status = 'verified'
         AND u1.username IS NOT NULL
         AND u2.username IS NOT NULL
       ORDER BY t.created_at DESC
       LIMIT 100`,
      []
    );

    // 6. Formatear respuesta
    const formattedTransfers = finalTransfers.map((t: any) => ({
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
      fromUser: {
        username: t.from_username,
      },
      toUser: {
        username: t.to_username,
      },
    }));

    return NextResponse.json({
      transfers: formattedTransfers,
      total: formattedTransfers.length,
      chainId: chainId,
    });
  } catch (error: any) {
    console.error('[transfers] Error obteniendo transferencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener transferencias', details: error.message },
      { status: 500 }
    );
  }
}

