/**
 * Utilidades para llamar a la Enhanced API de Alchemy
 * Documentación: https://www.alchemy.com/docs/reference/transfers-api-quickstart
 */

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

/**
 * Obtiene la URL base de Alchemy para Sepolia
 */
function getAlchemyBaseUrl(): string {
  return 'https://eth-sepolia.g.alchemy.com/v2';
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
}): Promise<AssetTransfersResponse> {
  if (!ALCHEMY_API_KEY) {
    throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY no está configurado');
  }

  const baseUrl = getAlchemyBaseUrl();

  const requestBody: any = {
    id: 1,
    jsonrpc: '2.0',
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        fromBlock: params.fromBlock || '0x0',
        toBlock: params.toBlock || 'latest',
        category: params.category || ['erc20'],
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

