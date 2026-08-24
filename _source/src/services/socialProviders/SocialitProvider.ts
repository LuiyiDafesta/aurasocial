import { 
  ISocialProvider, 
  ProviderCapabilities, 
  ProviderConfigurationStatus, 
  ProviderAuthUrlOptions, 
  ProviderCallbackOptions, 
  ProviderDiscoveredAccount, 
  ProviderPublishResult 
} from './SocialProvider';
import { 
  SocialConnection, 
  PublishPackage, 
  ConnectionHealthReport,
  SocialPlatform 
} from '../../types/publishing';
import { createAndPersistOAuthState, validateAndConsumeOAuthState } from '../connectors/oauthSecurityService';
import { validatePublishPackage } from '../publishingValidationService';
import { isRealPublishingEnabled } from '../../config/publishingConfig';
import { SocialitClient, socialitClient, sanitizeSocialitLogs } from './socialitClient';

export type SocialitHealthStatus = 
  | 'configured'
  | 'configuration_warning'
  | 'invalid_credentials'
  | 'api_unavailable'
  | 'not_configured';

export interface SocialitConfigurationReport {
  status: SocialitHealthStatus;
  is_valid: boolean;
  message: string;
  has_api_key: boolean;
  has_api_url: boolean;
  has_client_id?: boolean;
  accounts_count?: number;
  checked_at: string;
}

/**
 * Proveedor Principal (🥇 PRIMARY) de AuraSocial para conexión y publicación multi-canal con Socialit.
 */
export class SocialitProvider implements ISocialProvider {
  readonly id = 'socialit';
  readonly name = 'Socialit';
  readonly description = 'Proveedor principal de AuraSocial para gestión unificada de conexiones sociales y publicación.';
  readonly isPrimary = true;
  readonly isSecondary = false;

  readonly capabilities: ProviderCapabilities = {
    oauth: true,
    account_discovery: true,
    publishing: true,
    scheduling: true,
    media_upload: true,
    platforms: {
      instagram: true,
      facebook: true,
      tiktok: true,
      linkedin: true,
      youtube: true,
    },
  };

  private client: SocialitClient;
  private apiKey?: string;
  private apiUrl?: string;

  constructor(config?: { apiKey?: string; apiUrl?: string; clientId?: string }) {
    this.apiKey = config?.apiKey || (typeof process !== 'undefined' ? process.env.SOCIALIT_API_KEY : undefined);
    this.apiUrl = config?.apiUrl || (typeof process !== 'undefined' ? process.env.SOCIALIT_API_URL : undefined);
    this.client = (config?.apiKey || config?.apiUrl) 
      ? new SocialitClient({ apiKey: this.apiKey, apiUrl: this.apiUrl }) 
      : socialitClient;
  }

  /**
   * Determina el estado de configuración de Socialit en el entorno.
   */
  getConfigurationStatus(): ProviderConfigurationStatus {
    if (this.apiKey && this.apiKey.trim().length > 0) {
      return 'configured';
    }
    if (this.client.hasApiKey()) {
      return 'configured';
    }
    return 'not_configured';
  }

  /**
   * Valida exhaustivamente la configuración y conectividad con Socialit mediante request READ-ONLY.
   */
  async validateSocialitConfiguration(): Promise<SocialitConfigurationReport> {
    const hasApiKey = this.getConfigurationStatus() === 'configured';
    const hasApiUrl = Boolean(this.apiUrl && this.apiUrl.trim().length > 0);

    if (!hasApiKey) {
      return {
        status: 'not_configured',
        is_valid: false,
        message: 'SOCIALIT_CONFIGURATION_REQUIRED: SOCIALIT_API_KEY no está configurada en el entorno de servidor.',
        has_api_key: false,
        has_api_url: hasApiUrl,
        checked_at: new Date().toISOString(),
      };
    }

    try {
      const clientReport = await this.client.validateSocialitConfiguration();

      let mappedStatus: SocialitHealthStatus = 'configured';
      if (clientReport.status === 'invalid_credentials') mappedStatus = 'invalid_credentials';
      else if (clientReport.status === 'unavailable') mappedStatus = 'api_unavailable';
      else if (clientReport.status === 'not_configured') mappedStatus = 'not_configured';
      else if (clientReport.status === 'warning') mappedStatus = 'configuration_warning';

      return {
        status: mappedStatus,
        is_valid: clientReport.configured,
        message: clientReport.message,
        has_api_key: true,
        has_api_url: hasApiUrl,
        accounts_count: clientReport.accounts_count,
        checked_at: clientReport.checked_at,
      };
    } catch (err: any) {
      return {
        status: 'api_unavailable',
        is_valid: false,
        message: `No se pudo alcanzar el endpoint de Socialit: ${sanitizeSocialitLogs(err.message, [this.apiKey])}`,
        has_api_key: true,
        has_api_url: hasApiUrl,
        checked_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Genera la URL de autorización para el flujo OAuth de Socialit.
   * Si Socialit gestiona las conexiones en su propio panel, informa la acción requerida.
   */
  async getAuthorizationUrl(options: ProviderAuthUrlOptions): Promise<{ url: string; state: string }> {
    const { workspaceId, brandId, userId, redirectUri, platform = 'instagram', scopes = [], metadata } = options;

    const { state } = await createAndPersistOAuthState({
      workspaceId,
      brandId,
      userId,
      platform,
      redirectUri,
      scopes,
      metadata: { ...(metadata || {}), provider: 'socialit' },
    });

    if (this.getConfigurationStatus() !== 'configured') {
      const url = `${redirectUri}?error=SOCIALIT_CONFIGURATION_REQUIRED&state=${state}`;
      return { url, state };
    }

    // Socialit administra las conexiones de forma centralizada en su panel o hosted flow
    const baseUrl = (this.apiUrl || 'https://api.socialit.com').replace(/\/+$/, '');
    const url = `${baseUrl}/oauth/connect?platform=${platform}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return {
      url,
      state,
    };
  }

  /**
   * Procesa el callback OAuth de Socialit y descubre las cuentas vinculadas.
   */
  async handleCallback(options: ProviderCallbackOptions): Promise<ProviderDiscoveredAccount[]> {
    const { code, state } = options;

    // 1. Validar Anti-CSRF
    const stateRecord = await validateAndConsumeOAuthState({
      state,
      platform: 'instagram',
    });

    // 2. Si no está configurado en producción, rechazar a menos que sea mock explícito de test
    if (this.getConfigurationStatus() !== 'configured') {
      if (code.startsWith('mock_') || code === 'test_code') {
        return [
          {
            id: `socialit_mock_${stateRecord.platform}_${Date.now()}`,
            provider: 'socialit',
            platform: stateRecord.platform,
            account_name: `Socialit ${stateRecord.platform.toUpperCase()} (Mock)`,
            account_username: `@socialit_${stateRecord.platform}_mock`,
            account_type: 'business_account',
            scopes: stateRecord.scopes,
            metadata: { is_mock: true, provider: 'socialit' },
          },
        ];
      }
      throw new Error('SOCIALIT_CONFIGURATION_REQUIRED: Las credenciales de Socialit (SOCIALIT_API_KEY) no están configuradas en el entorno.');
    }

    // 3. Descubrir cuentas reales a través de Socialit API
    try {
      const discovered = await this.client.discoverAccounts(stateRecord.platform);
      return discovered;
    } catch (err: any) {
      throw new Error(`Fallo en Socialit callback: ${err.message}`);
    }
  }

  /**
   * Descubre cuentas sociales disponibles en la cuenta de Socialit para una plataforma específica o todas.
   */
  async discoverAccounts(platform?: SocialPlatform): Promise<ProviderDiscoveredAccount[]> {
    if (this.getConfigurationStatus() !== 'configured') {
      throw new Error('SOCIALIT_CONFIGURATION_REQUIRED: No es posible descubrir cuentas sin SOCIALIT_API_KEY.');
    }

    return this.client.discoverAccounts(platform);
  }

  /**
   * Valida la salud de una conexión registrada con Socialit consultando el endpoint oficial de health.
   */
  async validateConnection(connection: SocialConnection): Promise<ConnectionHealthReport> {
    const isMock = connection.status === 'mock_connected' || connection.account_id?.includes('mock_');

    if (this.getConfigurationStatus() !== 'configured' && !isMock) {
      return {
        connection_id: connection.id,
        platform: connection.platform,
        status: 'warning',
        is_valid: false,
        issues: ['SOCIALIT_CONFIGURATION_REQUIRED: Credenciales de Socialit pendientes de configuración.'],
        scopes: connection.scopes || [],
        checked_at: new Date().toISOString(),
      };
    }

    if (connection.status === 'disconnected' || connection.status === 'revoked') {
      return {
        connection_id: connection.id,
        platform: connection.platform,
        status: 'disconnected',
        is_valid: false,
        issues: ['La conexión fue desconectada formalmente'],
        scopes: [],
        checked_at: new Date().toISOString(),
      };
    }

    const socialitAccountId = connection.provider_account_id || connection.account_id;

    // Si es una cuenta real conectada con Socialit y tenemos ID de cuenta
    if (!isMock && socialitAccountId && socialitAccountId.startsWith('sa_')) {
      try {
        const health = await this.client.getSocialAccountHealth(socialitAccountId);
        const issues: string[] = [];

        if (!health.ok) {
          issues.push('Socialit reportó un problema de salud en esta cuenta.');
        }
        if (health.token && !health.token.valid) {
          issues.push(`Token no válido (${health.token.detail || 'expirado o revocado'}).`);
        }
        if (!health.can_post) {
          issues.push('La cuenta no cuenta con permisos suficientes para publicar (can_post=false).');
        }

        const isValid = health.ok && (!health.token || health.token.valid);
        const expiresAt = health.token?.expires_at || connection.token_expires_at || null;
        let daysUntilExp: number | null = null;
        if (expiresAt) {
          daysUntilExp = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        }

        const grantedPostingScopes = (health.scopes?.posting || [])
          .filter(s => s.granted)
          .map(s => s.scope);

        return {
          connection_id: connection.id,
          platform: connection.platform,
          status: isValid ? (issues.length > 0 ? 'warning' : 'healthy') : 'error',
          is_valid: isValid,
          account_name: connection.account_name || undefined,
          expires_at: expiresAt,
          days_until_expiration: daysUntilExp,
          issues,
          scopes: grantedPostingScopes.length > 0 ? grantedPostingScopes : connection.scopes || [],
          checked_at: new Date().toISOString(),
        };
      } catch (err: any) {
        return {
          connection_id: connection.id,
          platform: connection.platform,
          status: 'warning',
          is_valid: false,
          issues: [`No se pudo obtener health check en tiempo real de Socialit: ${err.message}`],
          scopes: connection.scopes || [],
          checked_at: new Date().toISOString(),
        };
      }
    }

    return {
      connection_id: connection.id,
      platform: connection.platform,
      status: 'healthy',
      is_valid: true,
      issues: [],
      scopes: connection.scopes || [],
      checked_at: new Date().toISOString(),
    };
  }

  /**
   * Despacha la publicación a través de Socialit.
   * ZERO PUBLISHING: En Fase 12D.1 cualquier publicación real permanece bloqueada por Kill Switch.
   */
  async publish(params: {
    connection: SocialConnection;
    publishPackage: PublishPackage;
    videoUrl: string;
    isMock?: boolean;
  }): Promise<ProviderPublishResult> {
    const { connection, publishPackage, isMock = false } = params;

    // Quality Gate
    const validation = validatePublishPackage(publishPackage);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'QUALITY_GATE_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
        errorType: 'validation',
      };
    }

    if (isMock || connection.status === 'mock_connected') {
      const ts = Date.now().toString(36);
      const mockPostId = `socialit_mock_post_${ts}`;
      return {
        success: true,
        externalPostId: mockPostId,
        externalPostUrl: `https://${publishPackage.platform}.com/post/${mockPostId}`,
        publishedAt: new Date().toISOString(),
        providerJobId: `socialit_job_${ts}`,
        providerMetadata: { provider: 'socialit', is_mock: true },
      };
    }

    // Kill Switch estricto
    if (!isRealPublishingEnabled()) {
      return {
        success: false,
        errorCode: 'REAL_PUBLISHING_DISABLED',
        errorMessage: 'ZERO_PUBLISHING_GATE: La publicación real está estrictamente bloqueada en Fase 12D.1 (Kill Switch activo).',
        errorType: 'permission',
      };
    }

    if (this.getConfigurationStatus() !== 'configured') {
      return {
        success: false,
        errorCode: 'SOCIALIT_NOT_CONFIGURED',
        errorMessage: 'SOCIALIT_CONFIGURATION_REQUIRED: No es posible publicar porque Socialit no está configurado.',
        errorType: 'permission',
      };
    }

    return {
      success: false,
      errorCode: 'ZERO_PUBLISHING_ENFORCED',
      errorMessage: 'ZERO_PUBLISHING_GATE: Fase 12D.1 es exclusivamente de configuración y descubrimiento.',
      errorType: 'permission',
    };
  }
}

export const socialitProvider = new SocialitProvider();
