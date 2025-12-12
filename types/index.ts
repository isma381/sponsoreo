// Types para la aplicación

export interface User {
  id: string;
  email: string;
  username: string | null;
  profile_image_url: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  status: 'pending' | 'verified';
  verification_address: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transfer {
  id: string;
  hash: string;
  from_address: string;
  to_address: string;
  value: number;
  block_num: string;
  raw_contract_value: string | null;
  raw_contract_decimal: string | null;
  token: string;
  chain: string;
  contract_address: string | null;
  chain_id: number;
  created_at: Date;
  updated_at: Date;
}

