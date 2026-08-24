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

export const LINKEDIN_RECOMMENDED_SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
  'w_organization_social',
  'r_organization_social',
];

export class LinkedInConnector implements ISocialConnector {
  readonly platform: SocialPlatform = 'linkedin';
  private clientId: string;

  constructor(config?: { clientId?: string }) {
    this.clientId = config?.clientId || 'mock_linkedin_client_id';
  }

  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<{ url: string; state: string }> {
    const { workspaceId, brandId, userId, redirectUri, scopes = LINKEDIN_RECOMMENDED_SCOPES, metadata } = options;

    const { state } = await createAndPersistOAuthState({
      workspaceId,
      brandId,
      userId,
      platform: 'linkedin',
      redirectUri,
      scopes,
      metadata,
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(' '),
    });

    return {
      url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
      state,
    };
  }

  async handleCallback(options: CallbackOptions): Promise<DiscoveredSocialAccount[]> {
    const { state } = options;
    const stateRecord = await validateAndConsumeOAuthState({
      state,
      platform: 'linkedin',
    });

    const ts = Date.now().toString(36);
    return [
      {
        id: `linkedin_org_${ts}`,
        platform: 'linkedin',
        account_type: 'page',
        account_name: 'Empresa / Organización LinkedIn',
        username: 'aura-social-corp',
        avatar_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=150',
        access_token: `mock_linkedin_token_${ts}`,
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        scopes: stateRecord.scopes,
        metadata: { provider: 'linkedin', is_mock: true },
      },
    ];
  }

  async saveConnection(options: SaveConnectionOptions): Promise<SocialConnection> {
    const { workspaceId, brandId, account } = options;

    const payload = {
      workspace_id: workspaceId,
      brand_id: brandId,
      platform: 'linkedin' as const,
      account_type: account.account_type,
      account_id: account.id,
      account_name: account.account_name,
      account_username: account.username || `@aura_linkedin`,
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
      throw new Error(`Error al guardar conexión de LinkedIn: ${error?.message}`);
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

    if (error || !data) throw new Error(`Error al renovar LinkedIn token: ${error?.message}`);
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
      platform: 'linkedin',
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
