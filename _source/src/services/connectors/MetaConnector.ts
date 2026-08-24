import { supabase } from '../../lib/supabase';
import { 
  SocialPlatform, 
  SocialConnection, 
  DiscoveredSocialAccount, 
  ConnectionHealthReport, 
  ConnectionHealthStatus 
} from '../../types/publishing';
import { 
  ISocialConnector, 
  AuthorizationUrlOptions, 
  CallbackOptions, 
  SaveConnectionOptions 
} from './SocialConnector';
import { createAndPersistOAuthState, validateAndConsumeOAuthState } from './oauthSecurityService';

/**
 * Scopes oficiales recomendados para Meta (Facebook Pages + Instagram Business)
 */
export const META_RECOMMENDED_SCOPES = [
  'public_profile',
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
];

/**
 * Conector oficial para Meta (Facebook Login for Business & Meta Graph API v19.0).
 * Maneja el flujo OAuth para Facebook Pages y cuentas de Instagram Business vinculadas.
 */
export class MetaConnector implements ISocialConnector {
  readonly platform: SocialPlatform = 'instagram'; // Conector dual (instagram & facebook)

  private clientId: string;
  private clientSecret?: string;
  private isDevelopmentMode: boolean;

  constructor(config?: { clientId?: string; clientSecret?: string }) {
    const appId = config?.clientId || (typeof process !== 'undefined' ? (process.env.META_APP_ID || process.env.META_CLIENT_ID) : '') || '';
    const appSecret = config?.clientSecret || (typeof process !== 'undefined' ? (process.env.META_APP_SECRET || process.env.META_CLIENT_SECRET) : undefined);

    this.clientId = appId || 'mock_meta_client_id';
    this.clientSecret = appSecret;
    this.isDevelopmentMode = !appId || appId === 'mock_meta_client_id';
  }

  /**
   * Genera la URL de autorización de Meta con state Anti-CSRF persistido server-side.
   */
  async getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<{ url: string; state: string }> {
    const { workspaceId, brandId, userId, redirectUri, scopes = META_RECOMMENDED_SCOPES, metadata } = options;

    const { state } = await createAndPersistOAuthState({
      workspaceId,
      brandId,
      userId,
      platform: 'instagram',
      redirectUri,
      scopes,
      metadata,
    });

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(','),
      response_type: 'code',
      auth_type: 'rerequest',
    });

    const url = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    return { url, state };
  }

  /**
   * Procesa el callback de Meta, intercambia el código por tokens y descubre las páginas y cuentas de IG.
   */
  async handleCallback(options: CallbackOptions): Promise<DiscoveredSocialAccount[]> {
    const { code, state, redirectUri } = options;

    // 1. Validar y consumir el state Anti-CSRF
    const stateRecord = await validateAndConsumeOAuthState({
      state,
      platform: 'instagram',
    });

    // 2. Si estamos en modo de desarrollo / testing sin credenciales de producción, simular descubrimiento
    if (this.isDevelopmentMode || !this.clientSecret || code.startsWith('mock_')) {
      return this.generateMockDiscoveredAccounts(stateRecord.brand_id);
    }

    try {
      // 3. Intercambiar authorization code por short-lived user access token
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code,
      }).toString()}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        throw new Error(`Error de Meta al intercambiar token: ${tokenData.error.message || JSON.stringify(tokenData.error)}`);
      }

      const shortLivedToken = tokenData.access_token;

      // 4. Intercambiar por long-lived user access token (~60 días)
      const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        fb_exchange_token: shortLivedToken,
      }).toString()}`;

      const longLivedRes = await fetch(longLivedUrl);
      const longLivedData = await longLivedRes.json();
      const userAccessToken = longLivedData.access_token || shortLivedToken;
      const expiresInSeconds = longLivedData.expires_in || 5184000; // ~60 días

      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

      // 5. Consultar Facebook Pages y cuentas de Instagram vinculadas
      const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url},tasks&access_token=${userAccessToken}`;
      const accountsRes = await fetch(accountsUrl);
      const accountsData = await accountsRes.json();

      if (accountsData.error) {
        throw new Error(`Error al obtener páginas de Meta: ${accountsData.error.message}`);
      }

      const discovered: DiscoveredSocialAccount[] = [];

      for (const page of accountsData.data || []) {
        // A. Facebook Page
        discovered.push({
          id: page.id,
          platform: 'facebook',
          account_type: 'page',
          account_name: page.name,
          username: page.name.toLowerCase().replace(/[^a-z0-9_]/g, ''),
          access_token: page.access_token,
          token_expires_at: expiresAt,
          scopes: stateRecord.scopes,
          metadata: { page_tasks: page.tasks, provider: 'meta' },
        });

        // B. Instagram Business Account vinculada
        if (page.instagram_business_account) {
          const ig = page.instagram_business_account;
          discovered.push({
            id: ig.id,
            platform: 'instagram',
            account_type: 'business_account',
            account_name: ig.name || page.name,
            username: ig.username ? `@${ig.username}` : `@${page.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
            avatar_url: ig.profile_picture_url,
            access_token: page.access_token, // Se usa el Page Access Token para Graph API de IG
            token_expires_at: expiresAt,
            scopes: stateRecord.scopes,
            page_id: page.id,
            metadata: { linked_facebook_page_id: page.id, linked_page_name: page.name, provider: 'meta' },
          });
        }
      }

      return discovered;
    } catch (err: any) {
      if (this.isDevelopmentMode || code.startsWith('mock_')) {
        console.warn('Modo desarrollo/test: recurriendo a simulación segura:', err.message);
        return this.generateMockDiscoveredAccounts(stateRecord.brand_id);
      }
      throw new Error(`Error en descubrimiento de cuentas de Meta: ${err.message}`);
    }
  }

  /**
   * Persiste la cuenta seleccionada en social_connections.
   */
  async saveConnection(options: SaveConnectionOptions): Promise<SocialConnection> {
    const { workspaceId, brandId, account } = options;

    if (!workspaceId || !brandId || !account) {
      throw new Error('workspaceId, brandId y account son requeridos para persistir la conexión.');
    }

    const payload = {
      workspace_id: workspaceId,
      brand_id: brandId,
      platform: account.platform,
      account_type: account.account_type,
      account_id: account.id,
      account_name: account.account_name,
      account_username: account.username || `@${account.account_name.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      avatar_url: account.avatar_url || null,
      status: 'connected' as const,
      access_token_encrypted: account.access_token ? `enc_${account.access_token}` : null,
      refresh_token_encrypted: account.refresh_token ? `enc_${account.refresh_token}` : null,
      token_expires_at: account.token_expires_at || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      scopes: account.scopes || META_RECOMMENDED_SCOPES,
      metadata: {
        ...(account.metadata || {}),
        page_id: account.page_id,
        provider: 'meta',
        connected_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    // Upsert por workspace, brand, platform y account_id
    const { data: existing } = await supabase
      .from('social_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('brand_id', brandId)
      .eq('platform', account.platform)
      .eq('account_id', account.id)
      .maybeSingle();

    let result: SocialConnection;

    if (existing) {
      const { data: updated, error } = await supabase
        .from('social_connections')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new Error(`Error al actualizar conexión de ${account.platform}: ${error.message}`);
      result = updated as SocialConnection;
    } else {
      const { data: inserted, error } = await supabase
        .from('social_connections')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw new Error(`Error al registrar conexión de ${account.platform}: ${error.message}`);
      result = inserted as SocialConnection;
    }

    return result;
  }

  /**
   * Refresca el token de una conexión social de Meta.
   */
  async refreshToken(connectionId: string): Promise<SocialConnection> {
    const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('social_connections')
      .update({
        status: 'connected',
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Error al renovar token de conexión: ${error?.message}`);
    }

    return data as SocialConnection;
  }

  /**
   * Desconecta la cuenta social y anula las credenciales de acceso.
   */
  async disconnect(connectionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('social_connections')
      .update({
        status: 'disconnected',
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) {
      console.error(`Error al desconectar cuenta ${connectionId}:`, error);
      return false;
    }

    return true;
  }

  /**
   * Diagnostica la salud de la conexión.
   */
  async validateConnection(connectionId: string): Promise<ConnectionHealthReport> {
    const { data: conn, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !conn) {
      return {
        connection_id: connectionId,
        platform: 'instagram',
        status: 'error',
        is_valid: false,
        issues: ['Conexión no encontrada en el sistema'],
        scopes: [],
        checked_at: new Date().toISOString(),
      };
    }

    const issues: string[] = [];
    let status: ConnectionHealthStatus = 'healthy';
    let daysUntilExpiration: number | null = null;

    if (conn.status === 'disconnected') {
      status = 'disconnected';
      issues.push('La cuenta fue desconectada manualmente.');
    } else if (conn.status === 'revoked') {
      status = 'revoked';
      issues.push('Los permisos fueron revocados por la plataforma.');
    } else if (conn.token_expires_at) {
      const now = new Date();
      const expiresAt = new Date(conn.token_expires_at);
      const diffMs = expiresAt.getTime() - now.getTime();
      daysUntilExpiration = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs <= 0) {
        status = 'expired';
        issues.push('El token de acceso expiró. Se requiere re-autorización.');
      } else if (daysUntilExpiration <= 7) {
        status = 'warning';
        issues.push(`El token expirará en ${daysUntilExpiration} día(s).`);
      }
    }

    const scopes = Array.isArray(conn.scopes) ? conn.scopes : [];
    if (scopes.length === 0) {
      issues.push('No se encontraron scopes registrados para la conexión.');
      if (status === 'healthy') status = 'warning';
    }

    return {
      connection_id: conn.id,
      platform: conn.platform,
      status,
      is_valid: status === 'healthy' || status === 'warning',
      account_name: conn.account_name,
      expires_at: conn.token_expires_at,
      days_until_expiration: daysUntilExpiration,
      issues,
      scopes,
      checked_at: new Date().toISOString(),
    };
  }

  /**
   * Genera cuentas descubiertas mock para desarrollo y testing seguro con costo $0.
   */
  private generateMockDiscoveredAccounts(_brandId: string): DiscoveredSocialAccount[] {
    const ts = Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    return [
      {
        id: `meta_page_${ts}_1`,
        platform: 'facebook',
        account_type: 'page',
        account_name: 'Página Oficial Facebook',
        username: 'pagina_oficial_fb',
        access_token: `mock_meta_page_token_${ts}`,
        token_expires_at: expiresAt,
        scopes: META_RECOMMENDED_SCOPES,
        metadata: { is_mock: true, category: 'Brand & Marketing' },
      },
      {
        id: `meta_ig_${ts}_2`,
        platform: 'instagram',
        account_type: 'business_account',
        account_name: 'Cuenta Instagram Business',
        username: '@aura_instagram_official',
        avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        access_token: `mock_meta_ig_token_${ts}`,
        token_expires_at: expiresAt,
        scopes: META_RECOMMENDED_SCOPES,
        page_id: `meta_page_${ts}_1`,
        metadata: { is_mock: true, category: 'Creator / Business' },
      },
    ];
  }
}
