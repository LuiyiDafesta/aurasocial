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

export const YOUTUBE_RECOMMENDED_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
];

export class YouTubeConnector implements ISocialConnector {
  readonly platform: SocialPlatform = 'youtube';
  private clientId: string;

  constructor(config?: { clientId?: string }) {
    this.clientId = config?.clientId || 'mock_google_client_id';
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<{ url: string; state: string }> {
    const { workspaceId, brandId, userId, redirectUri, scopes = YOUTUBE_RECOMMENDED_SCOPES, metadata } = options;

    const { state } = await createAndPersistOAuthState({
      workspaceId,
      brandId,
      userId,
      platform: 'youtube',
      redirectUri,
      scopes,
      metadata,
    });

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      state,
    };
  }

  async handleCallback(options: CallbackOptions): Promise<DiscoveredSocialAccount[]> {
    const { state } = options;
    const stateRecord = await validateAndConsumeOAuthState({
      state,
      platform: 'youtube',
    });

    const ts = Date.now().toString(36);
    return [
      {
        id: `youtube_channel_${ts}`,
        platform: 'youtube',
        account_type: 'channel',
        account_name: 'Canal Oficial YouTube Shorts',
        username: '@AuraSocialChannel',
        avatar_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150',
        access_token: `mock_youtube_token_${ts}`,
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        scopes: stateRecord.scopes,
        metadata: { provider: 'google', is_mock: true },
      },
    ];
  }

  async saveConnection(options: SaveConnectionOptions): Promise<SocialConnection> {
    const { workspaceId, brandId, account } = options;

    const payload = {
      workspace_id: workspaceId,
      brand_id: brandId,
      platform: 'youtube' as const,
      account_type: account.account_type,
      account_id: account.id,
      account_name: account.account_name,
      account_username: account.username || `@aura_youtube`,
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
      throw new Error(`Error al guardar conexión de YouTube: ${error?.message}`);
    }

    return data as SocialConnection;
  }

  async refreshToken(connectionId: string): Promise<SocialConnection> {
    const { data, error } = await supabase
      .from('social_connections')
      .update({
        status: 'connected',
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .select('*')
      .single();

    if (error || !data) throw new Error(`Error al renovar YouTube token: ${error?.message}`);
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
      platform: 'youtube',
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
