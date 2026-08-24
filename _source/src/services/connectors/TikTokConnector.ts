import { supabase } from '../../lib/supabase';
import { 
  SocialPlatform, 
  SocialConnection, 
  DiscoveredSocialAccount, 
  ConnectionHealthReport 
} from '../../types/publishing';
import { 
  ISocialConnector, 
  AuthorizationUrlOptions, 
  CallbackOptions, 
  SaveConnectionOptions 
} from './SocialConnector';
import { createAndPersistOAuthState, validateAndConsumeOAuthState } from './oauthSecurityService';

export const TIKTOK_RECOMMENDED_SCOPES = [
  'user.info.basic',
  'video.list',
  'video.upload',
];

export class TikTokConnector implements ISocialConnector {
  readonly platform: SocialPlatform = 'tiktok';
  private clientKey: string;

  constructor(config?: { clientKey?: string }) {
    this.clientKey = config?.clientKey || 'mock_tiktok_client_key';
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<{ url: string; state: string }> {
    const { workspaceId, brandId, userId, redirectUri, scopes = TIKTOK_RECOMMENDED_SCOPES, metadata } = options;

    const { state } = await createAndPersistOAuthState({
      workspaceId,
      brandId,
      userId,
      platform: 'tiktok',
      redirectUri,
      scopes,
      metadata,
    });

    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope: scopes.join(','),
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });

    return {
      url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
      state,
    };
  }

  async handleCallback(options: CallbackOptions): Promise<DiscoveredSocialAccount[]> {
    const { state } = options;
    const stateRecord = await validateAndConsumeOAuthState({
      state,
      platform: 'tiktok',
    });

    const ts = Date.now().toString(36);
    return [
      {
        id: `tiktok_creator_${ts}`,
        platform: 'tiktok',
        account_type: 'channel',
        account_name: 'TikTok Creator Channel',
        username: '@aura_tiktok_creator',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        access_token: `mock_tiktok_token_${ts}`,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        scopes: stateRecord.scopes,
        metadata: { provider: 'tiktok', is_mock: true },
      },
    ];
  }

  async saveConnection(options: SaveConnectionOptions): Promise<SocialConnection> {
    const { workspaceId, brandId, account } = options;

    const payload = {
      workspace_id: workspaceId,
      brand_id: brandId,
      platform: 'tiktok' as const,
      account_type: account.account_type,
      account_id: account.id,
      account_name: account.account_name,
      account_username: account.username || `@aura_tiktok`,
      avatar_url: account.avatar_url || null,
      status: 'connected' as const,
      access_token_encrypted: account.access_token ? `enc_${account.access_token}` : null,
      token_expires_at: account.token_expires_at,
      scopes: account.scopes,
      metadata: { ...(account.metadata || {}), connected_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('social_connections')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Error al guardar conexión de TikTok: ${error?.message}`);
    }

    return data as SocialConnection;
  }

  async refreshToken(connectionId: string): Promise<SocialConnection> {
    const { data, error } = await supabase
      .from('social_connections')
      .update({
        status: 'connected',
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .select('*')
      .single();

    if (error || !data) throw new Error(`Error al renovar TikTok token: ${error?.message}`);
    return data as SocialConnection;
  }

  async disconnect(connectionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('social_connections')
      .update({
        status: 'disconnected',
        access_token_encrypted: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return !error;
  }

  async validateConnection(connectionId: string): Promise<ConnectionHealthReport> {
    const { data: conn } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    return {
      connection_id: connectionId,
      platform: 'tiktok',
      status: conn && conn.status === 'connected' ? 'healthy' : 'disconnected',
      is_valid: Boolean(conn && conn.status === 'connected'),
      account_name: conn?.account_name,
      expires_at: conn?.token_expires_at,
      issues: conn?.status === 'connected' ? [] : ['Cuenta desconectada o inválida'],
      scopes: conn?.scopes || [],
      checked_at: new Date().toISOString(),
    };
  }
}
