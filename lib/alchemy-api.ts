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
    11155111: 'https://eth-sepolia.g.alchemy.com/v2',
    137: 'https://polygon-mainnet.g.alchemy.com/v2',
    42161: 'https://arb-mainnet.g.alchemy.com/v2',
    10: 'https://opt-mainnet.g.alchemy.com/v2',
    8453: 'https://base-mainnet.g.alchemy.com/v2',
    421614: 'https://arb-sepolia.g.alchemy.com/v2',
    80002: 'https://polygon-amoy.g.alchemy.com/v2',
    84532: 'https://base-sepolia.g.alchemy.com/v2',
  };
  return chainMap[chainId || 11155111] || 'https://eth-sepolia.g.alchemy.com/v2';
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
 * Cache para metadatos de tokens
 */
const tokenCache = new Map<string, { data: { name: string; symbol: string; logo?: string } | null; timestamp: number }>();
const TOKEN_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Obtiene metadatos del token desde Alchemy con cache
 */
export async function getTokenMetadata(contractAddress: string, chainId?: number): Promise<{ name: string; symbol: string; logo?: string } | null> {
  if (!ALCHEMY_API_KEY) {
    return null;
  }

  const key = `${contractAddress.toLowerCase()}-${chainId || 11155111}`;
  const cached = tokenCache.get(key);
  
  // Verificar cache
  if (cached && (Date.now() - cached.timestamp) < TOKEN_CACHE_TTL) {
    return cached.data;
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
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
      }),
    });

    if (!response.ok) {
      // Cachear null para evitar llamadas repetidas
      tokenCache.set(key, { data: null, timestamp: Date.now() });
      return null;
    }

    const data = await response.json();
    if (data.error || !data.result) {
      tokenCache.set(key, { data: null, timestamp: Date.now() });
      return null;
    }

    const metadata = {
      name: data.result.name || '',
      symbol: data.result.symbol || '',
      logo: data.result.logo || undefined,
    };

    // Guardar en cache
    tokenCache.set(key, { data: metadata, timestamp: Date.now() });
    
    return metadata;
  } catch (error) {
    console.error('Error obteniendo metadatos del token:', error);
    // Cachear null para evitar llamadas repetidas
    tokenCache.set(key, { data: null, timestamp: Date.now() });
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

