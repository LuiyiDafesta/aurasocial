export interface SocialAccountMetadata {
  provider?: string;
  avatar_url?: string;
  profile_id?: string;
  account_type?: string;
  socialit_account_id?: string;
  group_ids?: string[];
  provider_metadata?: Record<string, any>;
  [key: string]: any;
}

export interface SocialAccount {
  id: string;
  workspace_id: string;
  brand_id: string;
  provider_connection_id?: string | null;
  platform: string;
  account_name: string;
  username?: string | null;
  external_account_id?: string | null;
  is_connected: boolean;
  is_enabled: boolean;
  publishing_enabled: boolean;
  metadata?: SocialAccountMetadata | null;
  created_at: string;
  updated_at: string;
}
