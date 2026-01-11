/**
 * Utilidades para llamar a la Enhanced API de Alchemy
 * Documentación: https://www.alchemy.com/docs/reference/transfers-api-quickstart
 */

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

/**
 * Obtiene la URL base de Alchemy según el chainId
 */
function getAlchemyBaseUrl(chainId?: number): string {
  const chainMap: Record<number, string> = {
    1: 'https://eth-mainnet.g.alchemy.com/v2',
    137: 'https://polygon-mainnet.g.alchemy.com/v2',
    42161: 'https://arb-mainnet.g.alchemy.com/v2',
    10: 'https://opt-mainnet.g.alchemy.com/v2',
    8453: 'https://base-mainnet.g.alchemy.com/v2',
  };
  return chainMap[chainId || 1] || 'https://eth-mainnet.g.alchemy.com/v2';
}

/**
 * Cache para almacenar el mapeo de chainId a nombre de red desde chainlist.org
 */
let chainListCache: Map<number, string> | null = null;
let chainListCacheTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Obtiene el mapeo de chainId a nombre de red desde chainlist.org
 */
async function getChainListMapping(): Promise<Map<number, string>> {
  // Verificar cache
  const now = Date.now();
  if (chainListCache && (now - chainListCacheTime) < CACHE_DURATION) {
    return chainListCache;
  }

  try {
    const response = await fetch('https://chainlist.org/rpcs.json', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo chainlist: ${response.statusText}`);
    }

    const data = await response.json();
    const mapping = new Map<number, string>();

    // chainlist.org devuelve un array de objetos con chainId y name
    // También puede ser un objeto con arrays anidados, así que manejamos ambos casos
    const chains = Array.isArray(data) ? data : (data.chains || data.data || []);
    
    for (const chain of chains) {
      const chainId = chain.chainId || chain.chain_id || chain.id;
      const name = chain.name || chain.network || chain.chainName;
      
      if (chainId && name) {
        const id = Number(chainId);
        if (!isNaN(id)) {
          // Si hay múltiples entradas para el mismo chainId, mantener la primera
          if (!mapping.has(id)) {
            mapping.set(id, String(name));
          }
        }
      }
    }

    // Actualizar cache
    chainListCache = mapping;
    chainListCacheTime = now;

    return mapping;
  } catch (error) {
    console.error('Error obteniendo chainlist:', error);
    
    // Si hay error pero tenemos cache, usar cache
    if (chainListCache) {
      return chainListCache;
    }

    // Si no hay cache, devolver mapa vacío
    return new Map<number, string>();
  }
}

/**
 * Obtiene el chainId desde la API de Alchemy usando eth_chainId
 */
export async function getChainId(chainId?: number): Promise<number | null> {
  if (!ALCHEMY_API_KEY) {
    return null;
  }

  const baseUrl = getAlchemyBaseUrl(chainId);
  
  try {
    const response = await fetch(`${baseUrl}/${ALCHEMY_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.error || !data.result) {
      return null;
    }

    // Convertir de hexadecimal a decimal
    return parseInt(data.result, 16);
  } catch (error) {
    console.error('Error obteniendo chainId:', error);
    return null;
  }
}

/**
 * Obtiene el nombre de la chain basado en el chainId desde chainlist.org
 */
export async function getChainNameFromChainId(chainId: number): Promise<string> {
  const chainList = await getChainListMapping();
  return chainList.get(chainId) || `Chain ${chainId}`;
}

/**
 * Obtiene el bloque actual de la blockchain
 */
export async function getCurrentBlock(chainId?: number): Promise<string | null> {
  if (!ALCHEMY_API_KEY) {
    return null;
  }

  const baseUrl = getAlchemyBaseUrl(chainId);
  
  try {
    const response = await fetch(`${baseUrl}/${ALCHEMY_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.error || !data.result) {
      return null;
    }

    return data.result; // Ya viene en formato hexadecimal
  } catch (error) {
    console.error('Error obteniendo bloque actual:', error);
    return null;
  }
}

/**
 * Obtiene metadatos del token desde Alchemy con cache persistente en BD
 */
export async function getTokenMetadata(contractAddress: string, chainId?: number): Promise<{ name: string; symbol: string; logo?: string } | null> {
  if (!ALCHEMY_API_KEY) {
    return null;
  }

  const contractAddressLower = contractAddress.toLowerCase();
  const finalChainId = chainId || 1;
  const TOKEN_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

  // 1. Consultar cache en BD
  try {
    const { executeQuery } = await import('@/lib/db');
    const cached = await executeQuery(
      `SELECT name, symbol, logo, updated_at 
       FROM token_metadata_cache 
       WHERE contract_address = $1 AND chain_id = $2`,
      [contractAddressLower, finalChainId]
    );

    if (cached.length > 0) {
      const cacheTime = new Date(cached[0].updated_at).getTime();
      const now = Date.now();
      
      // Si el cache es válido (menos de 24 horas), devolverlo
      if ((now - cacheTime) < TOKEN_CACHE_TTL) {
        // Si name y symbol son null, significa que el token no existe
        if (cached[0].name === null && cached[0].symbol === null) {
          return null;
        }
        return {
          name: cached[0].name || '',
          symbol: cached[0].symbol || '',
          logo: cached[0].logo || undefined,
        };
      }
    }
  } catch (error) {
    console.error('Error consultando cache de metadatos:', error);
  }

  // 2. Si no hay cache válido, consultar Alchemy
  const baseUrl = getAlchemyBaseUrl(chainId);
  
  try {
    const response = await fetch(`${baseUrl}/${ALCHEMY_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
      }),
    });

    let metadata: { name: string; symbol: string; logo?: string } | null = null;

    if (!response.ok) {
      metadata = null;
    } else {
      const data = await response.json();
      if (data.error || !data.result) {
        metadata = null;
      } else {
        metadata = {
          name: data.result.name || '',
          symbol: data.result.symbol || '',
          logo: data.result.logo || undefined,
        };
      }
    }

    // 3. Guardar en cache (BD)
    try {
      const { executeQuery } = await import('@/lib/db');
      await executeQuery(
        `INSERT INTO token_metadata_cache (contract_address, chain_id, name, symbol, logo, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (contract_address, chain_id) 
         DO UPDATE SET name = $3, symbol = $4, logo = $5, updated_at = NOW()`,
        [
          contractAddressLower,
          finalChainId,
          metadata?.name || null,
          metadata?.symbol || null,
          metadata?.logo || null,
        ]
      );
    } catch (error) {
      console.error('Error guardando cache de metadatos:', error);
    }
    
    return metadata;
  } catch (error) {
    console.error('Error obteniendo metadatos del token:', error);
    return null;
  }
}

export interface AssetTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value?: number;
  asset?: string;
  category: 'external' | 'internal' | 'erc20' | 'erc721' | 'erc1155';
  rawContract?: {
    value?: string;
    address?: string;
    decimal?: string;
  };
  metadata?: {
    blockTimestamp?: string;
  };
}

export interface AssetTransfersResponse {
  transfers: AssetTransfer[];
  pageKey?: string;
}

/**
 * Obtiene transferencias usando Asset Transfers API
 */
export async function getAssetTransfers(params: {
  fromAddress?: string;
  toAddress?: string;
  fromBlock?: string;
  toBlock?: string;
  contractAddress?: string;
  category?: ('external' | 'erc20' | 'erc721' | 'erc1155')[];
  pageKey?: string;
  chainId?: number;
}): Promise<AssetTransfersResponse> {
  if (!ALCHEMY_API_KEY) {
    throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY no está configurado');
  }

  const baseUrl = getAlchemyBaseUrl(params.chainId);

  const requestBody: any = {
    id: 1,
    jsonrpc: '2.0',
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        fromBlock: params.fromBlock || '0x0',
        toBlock: params.toBlock || 'latest',
        category: params.category || ['erc20'],
        withMetadata: true,
      },
    ],
  };

  if (params.fromAddress) {
    requestBody.params[0].fromAddress = params.fromAddress;
  }
  if (params.toAddress) {
    requestBody.params[0].toAddress = params.toAddress;
  }
  if (params.contractAddress) {
    requestBody.params[0].contractAddress = params.contractAddress;
  }
  if (params.pageKey) {
    requestBody.params[0].pageKey = params.pageKey;
  }

  const response = await fetch(`${baseUrl}/${ALCHEMY_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Error en Asset Transfers API: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Error de Alchemy: ${data.error.message}`);
  }

  return {
    transfers: data.result.transfers || [],
    pageKey: data.result.pageKey,
  };
}

