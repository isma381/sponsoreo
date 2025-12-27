import { NextRequest, NextResponse } from 'next/server';
import { getAssetTransfers, getTokenMetadata } from '@/lib/alchemy-api';
import { executeQuery } from '@/lib/db';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';
import { sendNewTransferNotification, sendTransferRequiresApprovalNotification } from '@/lib/resend';
import { getAuthCookie } from '@/lib/auth';

// Redes soportadas por Alchemy - ordenadas por prioridad (Mainnet primero - objetivo final)
const SUPPORTED_CHAINS = [
  { chainId: 1, name: 'Ethereum Mainnet' },    // 1. PRIMERO (objetivo final)
  { chainId: 11155111, name: 'Sepolia' },      // 2. Segundo (pruebas)
  { chainId: 10, name: 'Optimism' },           // 3. Tercero
  { chainId: 137, name: 'Polygon' },           // 4. Cuarto
  { chainId: 42161, name: 'Arbitrum' },        // 5. Quinto
  { chainId: 8453, name: 'Base' },            // 6. Sexto
];

// OPTIMIZACIÓN: Map estático de nombres de chains (no requiere API calls)
const CHAIN_NAMES_MAP = new Map<number, string>([
  [1, 'Ethereum Mainnet'],
  [11155111, 'Sepolia'],
  [10, 'Optimism'],
  [137, 'Polygon'],
  [42161, 'Arbitrum'],
  [8453, 'Base'],
]);

// Límite de concurrencia para llamadas a Alchemy
const MAX_CONCURRENT_ALCHEMY_CALLS = 15;

/**
 * Verifica existencia de transferencias en batch
 */
async function checkTransfersExistBatch(
  transferHashes: { hash: string; chainId: number }[]
): Promise<Set<string>> {
  const existingSet = new Set<string>();
  if (transferHashes.length === 0) return existingSet;

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
  return existingSet;
}

/**
 * Procesa una chain específica - búsqueda desde presente hacia atrás con parada temprana
 */
async function processChain(
  chain: { chainId: number; name: string },
  userWallets: string[],
  verifiedAddressesSet: Set<string>,
  userId: string | null,
  maxPages: number | null
): Promise<{ transfers: Map<string, any>; maxBlockNum: string }> {
  const fromBlock = '0x0';
  
  console.log(`[API] Sincronizando chain ${chain.chainId} desde bloque ${fromBlock}`);
  
  const allTransfers: any[] = [];
  const transferPromises: Promise<void>[] = [];

  for (const userWallet of userWallets) {
    const processSentTransfers = async () => {
      let pageKey: string | undefined = undefined;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && (maxPages === null || pageCount < maxPages)) {
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
              allTransfers.push({ ...transfer, chainId: chain.chainId });
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
    };

    const processReceivedTransfers = async () => {
      let pageKey: string | undefined = undefined;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && (maxPages === null || pageCount < maxPages)) {
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
              allTransfers.push({ ...transfer, chainId: chain.chainId });
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
    };

    transferPromises.push(processSentTransfers());
    transferPromises.push(processReceivedTransfers());
  }

  const batchSize = MAX_CONCURRENT_ALCHEMY_CALLS;
  for (let i = 0; i < transferPromises.length; i += batchSize) {
    const batch = transferPromises.slice(i, i + batchSize);
    await Promise.all(batch);
  }

  // Ordenar por fecha DESCENDENTE (más recientes primero)
  const sortedTransfers = allTransfers.sort((a, b) => {
    const dateA = new Date(a.metadata?.blockTimestamp || 0).getTime();
    const dateB = new Date(b.metadata?.blockTimestamp || 0).getTime();
    return dateB - dateA;
  });

  // Verificar existencia en batch
  const transferHashes = sortedTransfers.map(t => ({
    hash: t.hash.toLowerCase(),
    chainId: chain.chainId
  }));
  const existingSet = await checkTransfersExistBatch(transferHashes);

  // Procesar desde más recientes, DETENER al encontrar primera ya registrada
  const transfersMap = new Map<string, any>();
  for (const transfer of sortedTransfers) {
    const key = `${transfer.hash.toLowerCase()}-${chain.chainId}`;
    if (existingSet.has(key)) {
      console.log(`[processChain] Transferencia ya registrada encontrada (${key}), deteniendo búsqueda - parada temprana`);
      break;
    }
    transfersMap.set(key, transfer);
  }

  return { transfers: transfersMap, maxBlockNum: '0x0' };
}

/**
 * OPTIMIZACIÓN: Carga datos de wallets en batch (mucho más rápido que una por una)
 */
async function loadWalletsDataBatch(
  addresses: string[],
  walletsMap: Map<string, any>
): Promise<void> {
  if (addresses.length === 0) return;
  
  // Filtrar direcciones que ya están en el mapa
  const addressesToLoad = addresses.filter(addr => !walletsMap.has(addr));
  if (addressesToLoad.length === 0) return;
  
  // Crear placeholders para la query IN
  const placeholders = addressesToLoad.map((_, idx) => `$${idx + 1}`).join(', ');
  const walletData = await executeQuery(
    `SELECT 
      LOWER(w.address) as address,
      w.is_socios_wallet,
      u.id as user_id,
      u.privacy_mode,
      u.email,
      u.username
    FROM wallets w
    JOIN users u ON w.user_id = u.id
    WHERE w.status = 'verified' AND LOWER(w.address) IN (${placeholders})`,
    addressesToLoad
  );
  
  for (const w of walletData) {
    walletsMap.set(w.address, {
      user_id: w.user_id,
      is_socios_wallet: w.is_socios_wallet === true,
      privacy_mode: w.privacy_mode || 'auto',
      email: w.email,
      username: w.username,
    });
  }
  
  console.log(`[API] Wallets cargadas en batch: ${walletData.length} de ${addressesToLoad.length} solicitadas`);
}

/**
 * Procesa e inserta transferencias en BD
 */
async function processAndInsertTransfers(
  transfersMap: Map<string, any>,
  walletsMap: Map<string, any>,
  typeFilter: string | null,
  existingSet: Set<string>
): Promise<number> {
  const transfersToProcess: any[] = [];
  
  // OPTIMIZACIÓN: Recolectar todas las direcciones necesarias y cargar en batch
  const addressesToLoad = new Set<string>();
  for (const transfer of transfersMap.values()) {
    const fromAddress = transfer.from?.toLowerCase() || '';
    const toAddress = transfer.to?.toLowerCase() || '';
    if (fromAddress && !walletsMap.has(fromAddress)) addressesToLoad.add(fromAddress);
    if (toAddress && !walletsMap.has(toAddress)) addressesToLoad.add(toAddress);
  }
  
  // Cargar todas las contrapartes necesarias en un solo batch query (mucho más rápido)
  if (addressesToLoad.size > 0) {
    await loadWalletsDataBatch(Array.from(addressesToLoad), walletsMap);
  }
  
  // OPTIMIZACIÓN: Recolectar todos los tokens que necesitan metadata y cargarlos en paralelo
  const tokensToLoad = new Map<string, { contractAddress: string; chainId: number }>();
  for (const transfer of transfersMap.values()) {
    const hash = transfer.hash.toLowerCase();
    const fromAddress = transfer.from?.toLowerCase() || '';
    const toAddress = transfer.to?.toLowerCase() || '';
    const blockNum = transfer.blockNum || '0x0';
    const contractAddress = transfer.rawContract?.address?.toLowerCase() || '';
    const chainId = transfer.chainId || SEPOLIA_CHAIN_ID;
    
    const transferKey = `${hash}-${chainId}`;
    if (existingSet.has(transferKey)) continue;
    
    // Si no tiene asset y tiene contractAddress, necesita metadata
    if (!transfer.asset && contractAddress) {
      const tokenKey = `${contractAddress}-${chainId}`;
      if (!tokensToLoad.has(tokenKey)) {
        tokensToLoad.set(tokenKey, { contractAddress, chainId });
      }
    }
  }
  
  // Cargar todos los metadatos de tokens en paralelo
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
    console.log('[API] Metadatos de tokens cargados en paralelo:', tokenMetadataMap.size);
  }

  for (const transfer of transfersMap.values()) {
    const hash = transfer.hash.toLowerCase();
    const fromAddress = transfer.from?.toLowerCase() || '';
    const toAddress = transfer.to?.toLowerCase() || '';
    const blockNum = transfer.blockNum || '0x0';
    const rawValue = transfer.rawContract?.value || '0';
    const rawDecimal = transfer.rawContract?.decimal || '18';
    const contractAddress = transfer.rawContract?.address?.toLowerCase() || '';
    const blockTimestamp = transfer.metadata?.blockTimestamp || null;
    const chainId = transfer.chainId || SEPOLIA_CHAIN_ID;
    
    const transferKey = `${hash}-${chainId}`;
    if (existingSet.has(transferKey)) continue;

    // OPTIMIZACIÓN: Usar Map estático en lugar de llamar a API
    const chainName = CHAIN_NAMES_MAP.get(chainId) || `Chain ${chainId}`;
    
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

    const fromWalletData = walletsMap.get(fromAddress);
    const toWalletData = walletsMap.get(toAddress);

    if (!fromWalletData || !toWalletData) continue;

    let transferType = 'generic';
    let isPublic = true;
    let approvedBySender = true;
    let approvedByReceiver = true;
    let requiresApproval = false;

    if (toWalletData.is_socios_wallet) {
      transferType = 'socios';
      isPublic = false;
    } else {
      const fromPrivacy = fromWalletData.privacy_mode || 'auto';
      const toPrivacy = toWalletData.privacy_mode || 'auto';
      if (fromPrivacy === 'approval' || toPrivacy === 'approval') {
        isPublic = false;
        approvedBySender = fromPrivacy === 'auto';
        approvedByReceiver = toPrivacy === 'auto';
        requiresApproval = true;
      }
    }

    if (typeFilter && transferType !== typeFilter) continue;

    transfersToProcess.push({
      hash, fromAddress, toAddress, usdcValue, blockNum,
      rawValue, rawDecimal, tokenName, chainName, contractAddress,
      chainId, transferType, isPublic, approvedBySender, approvedByReceiver,
      blockTimestamp, fromWalletData, toWalletData, requiresApproval,
    });
  }

  if (transfersToProcess.length === 0) return 0;

  const insertChunkSize = 50;
  for (let i = 0; i < transfersToProcess.length; i += insertChunkSize) {
    const chunk = transfersToProcess.slice(i, i + insertChunkSize);
    const values = chunk.map((t, idx) => 
      `($${idx * 13 + 1}, $${idx * 13 + 2}, $${idx * 13 + 3}, $${idx * 13 + 4}, $${idx * 13 + 5}, $${idx * 13 + 6}, $${idx * 13 + 7}, $${idx * 13 + 8}, $${idx * 13 + 9}, $${idx * 13 + 10}, $${idx * 13 + 11}, $${idx * 13 + 12}, $${idx * 13 + 13}, $${idx * 13 + 14}, $${idx * 13 + 15}, NULL, COALESCE($${idx * 13 + 16}::timestamp, now()))`
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

    chunk.forEach(t => {
      if (!t.toWalletData.is_socios_wallet && t.fromWalletData && t.toWalletData) {
        const fromPrivacy = t.fromWalletData.privacy_mode || 'auto';
        const toPrivacy = t.toWalletData.privacy_mode || 'auto';
        Promise.all([
          t.fromWalletData.email && (t.requiresApproval && fromPrivacy === 'approval'
            ? sendTransferRequiresApprovalNotification(t.fromWalletData.email, t.hash, t.toWalletData.username || 'Usuario', t.usdcValue, t.tokenName)
            : sendNewTransferNotification(t.fromWalletData.email, t.hash, t.toWalletData.username || 'Usuario', t.usdcValue, t.tokenName)),
          t.toWalletData.email && (t.requiresApproval && toPrivacy === 'approval'
            ? sendTransferRequiresApprovalNotification(t.toWalletData.email, t.hash, t.fromWalletData.username || 'Usuario', t.usdcValue, t.tokenName)
            : sendNewTransferNotification(t.toWalletData.email, t.hash, t.fromWalletData.username || 'Usuario', t.usdcValue, t.tokenName))
        ]).catch(err => console.error('[transfers] Error enviando notificaciones:', err));
      }
    });
  }

  const insertedCount = transfersToProcess.length;
  console.log(`[API] processAndInsertTransfers: ${insertedCount} transferencias procesadas para insertar`);
  return insertedCount;
}

/**
 * Sincroniza transferencias con Alchemy - OPTIMIZADO
 * @param typeFilter - Filtro opcional por tipo de transferencia
 * @param userId - Si se proporciona, solo sincroniza wallets de este usuario
 * @param chainId - Si se proporciona, solo sincroniza esta chain específica
 * @returns número de transferencias procesadas y chains procesadas
 */
export async function syncTransfersInBackground(
  typeFilter: string | null, 
  userId: string | null = null,
  chainId: number | null = null
): Promise<{ 
  transfersProcessed: number; 
  chainsProcessed: number[];
  detectedTransfers: number;
  insertedTransfers: number;
  walletsChecked: number;
  verifiedAddressesCount: number;
}> {
  try {
    console.log('[API] Iniciando sincronización con Alchemy...', { typeFilter, userId, chainId });
    
    // 2.2.1 Pre-cargar datos necesarios antes del loop
    // Obtener wallets verificadas con is_socios_wallet
    let walletQuery = `SELECT address, is_socios_wallet FROM wallets WHERE status = 'verified'`;
    const walletParams: any[] = [];
    
    if (userId) {
      walletQuery += ` AND user_id = $1`;
      walletParams.push(userId);
    }
    
    const verifiedWallets = await executeQuery(walletQuery, walletParams);
    console.log('[API] Wallets verificadas encontradas:', verifiedWallets.length);

    if (verifiedWallets.length === 0) {
      console.error('[API] ❌ ERROR: No hay wallets verificadas, saltando sincronización');
      console.error('[API] Verifica que el usuario tenga wallets con status="verified" en la BD');
      return { 
        transfersProcessed: 0, 
        chainsProcessed: [],
        detectedTransfers: 0,
        insertedTransfers: 0,
        walletsChecked: 0,
        verifiedAddressesCount: 0
      };
    }

    // OPTIMIZACIÓN: Solo cargar Set de direcciones verificadas (más ligero y rápido)
    // Esto es mucho más eficiente que cargar un array completo para verificar membresía
    const verifiedAddressesResult = await executeQuery(
      `SELECT LOWER(address) as address FROM wallets WHERE status = 'verified'`,
      []
    );
    const verifiedAddressesSet = new Set<string>(
      verifiedAddressesResult.map((w: any) => w.address)
    );
    console.log('[API] Direcciones verificadas cargadas en Set:', verifiedAddressesSet.size);
    
    // OPTIMIZACIÓN: Carga selectiva de walletsMap
    // Si userId está presente, cargar solo wallets del usuario inicialmente
    // Las contrapartes se cargarán bajo demanda cuando se encuentren transferencias
    const walletsMap = new Map<string, { user_id: string; is_socios_wallet: boolean; privacy_mode: string; email: string; username: string }>();
    
    if (userId) {
      // Cargar solo wallets del usuario actual (más rápido)
      const userWalletsWithUsers = await executeQuery(
        `SELECT 
          w.address,
          w.is_socios_wallet,
          u.id as user_id,
          u.privacy_mode,
          u.email,
          u.username
        FROM wallets w
        JOIN users u ON w.user_id = u.id
        WHERE w.status = 'verified' AND w.user_id = $1`,
        [userId]
      );
      
      for (const w of userWalletsWithUsers) {
        walletsMap.set(w.address.toLowerCase(), {
          user_id: w.user_id,
          is_socios_wallet: w.is_socios_wallet === true,
          privacy_mode: w.privacy_mode || 'auto',
          email: w.email,
          username: w.username,
        });
      }
      console.log('[API] Wallets del usuario cargadas:', walletsMap.size);
    } else {
      // Si no hay userId, cargar todas (para sincronización global)
      const walletsWithUsers = await executeQuery(
        `SELECT 
          w.address,
          w.is_socios_wallet,
          u.id as user_id,
          u.privacy_mode,
          u.email,
          u.username
        FROM wallets w
        JOIN users u ON w.user_id = u.id
        WHERE w.status = 'verified'`,
        []
      );
      
      for (const w of walletsWithUsers) {
        walletsMap.set(w.address.toLowerCase(), {
          user_id: w.user_id,
          is_socios_wallet: w.is_socios_wallet === true,
          privacy_mode: w.privacy_mode || 'auto',
          email: w.email,
          username: w.username,
        });
      }
      console.log('[API] Todas las wallets cargadas:', walletsMap.size);
    }

    const userWallets = verifiedWallets.map((w: any) => w.address.toLowerCase());
    const allTransfersMap = new Map<string, any>();
    let totalInserted = 0;

    // Determinar qué chains procesar
    let chainsToProcess: typeof SUPPORTED_CHAINS;
    if (chainId) {
      const chain = SUPPORTED_CHAINS.find(c => c.chainId === chainId);
      chainsToProcess = chain ? [chain] : [];
    } else {
      chainsToProcess = SUPPORTED_CHAINS;
    }

    if (chainId) {
      const chain = chainsToProcess[0];
      if (chain) {
        const maxPages = 5;
        const result = await processChain(chain, userWallets, verifiedAddressesSet, userId, maxPages);
        result.transfers.forEach((v, k) => allTransfersMap.set(k, v));
        
        const insertedCount = await processAndInsertTransfers(result.transfers, walletsMap, typeFilter, new Set<string>());
        totalInserted += insertedCount;
      }
    } else {
      const chainPromises = chainsToProcess.map(async (chain) => {
        const maxPages = 5;
        const result = await processChain(chain, userWallets, verifiedAddressesSet, userId, maxPages);
        
        if (result.transfers.size > 0) {
          const insertedCount = await processAndInsertTransfers(result.transfers, walletsMap, typeFilter, new Set<string>());
          totalInserted += insertedCount;
          console.log(`[API] Chain ${chain.chainId}: ${result.transfers.size} detectadas, ${insertedCount} insertadas`);
        }
        
        return {
          chainId: chain.chainId,
          transfers: result.transfers,
        };
      });

      const firstResult = await Promise.race(chainPromises);
      firstResult.transfers.forEach((v, k) => allTransfersMap.set(k, v));
      
      Promise.all(chainPromises).then(allResults => {
        for (const result of allResults) {
          result.transfers.forEach((v, k) => {
            if (!allTransfersMap.has(k)) {
              allTransfersMap.set(k, v);
            }
          });
        }
      }).catch(err => console.error('[API] Error procesando chains restantes:', err));
    }

    const chainsProcessed = chainsToProcess.map(c => c.chainId);
    console.log('[API] Sincronización con Alchemy completada. Transferencias procesadas:', allTransfersMap.size);
    
    if (allTransfersMap.size === 0) {
      console.warn('[API] ⚠️ ADVERTENCIA: No se detectaron transferencias desde Alchemy');
      console.warn('[API] Posibles causas:');
      console.warn('[API] - No hay transferencias entre wallets verificadas en el rango consultado');
      console.warn('[API] - Error en las consultas a Alchemy (revisa logs anteriores)');
    }
    
    return { 
      transfersProcessed: allTransfersMap.size, 
      chainsProcessed,
      detectedTransfers: allTransfersMap.size,
      insertedTransfers: totalInserted,
      walletsChecked: userWallets.length,
      verifiedAddressesCount: verifiedAddressesSet.size
    };
  } catch (error) {
    console.error('[transfers] Error en sincronización background:', error);
    if (error instanceof Error) {
      console.error('[transfers] Error details:', error.message, error.stack);
    }
    throw error;
  }
}

/**
 * GET /api/transfers/sync
 * Endpoint dedicado solo para sincronización con Alchemy (background, no devuelve datos)
 * 
 * Parámetros:
 * - ?userOnly=true - Solo sincroniza wallets del usuario autenticado
 * - ?chainId=11155111 - Sincroniza solo una chain específica (útil para pruebas con Sepolia)
 * - Sin chainId: Sincroniza todas las redes (Sepolia, Mainnet, Optimism, Polygon, Arbitrum, Base, etc.)
 * - ?type=sponsoreo - Filtro opcional por tipo
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userOnly = searchParams.get('userOnly') === 'true';
    const chainIdParam = searchParams.get('chainId');
    const typeFilter = searchParams.get('type'); // 'sponsoreo' | null

    const userId = userOnly ? await getAuthCookie() : null;
    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : null;

    if (userOnly && !userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Ejecutar sincronización
    const result = await syncTransfersInBackground(typeFilter, userId, chainId);

    return NextResponse.json({
      success: true,
      transfersProcessed: result.transfersProcessed,
      chainsProcessed: result.chainsProcessed,
    });
  } catch (error: any) {
    console.error('[transfers/sync] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al sincronizar transferencias', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

