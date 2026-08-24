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
  ConnectionHealthReport 
} from '../../types/publishing';
import { createAndPersistOAuthState, validateAndConsumeOAuthState } from '../connectors/oauthSecurityService';
import { sanitizePublicationText } from '../copySanitizerService';
import { validatePublishPackage } from '../publishingValidationService';

/**
 * Proveedor Secundario (🥈 SECONDARY / FALLBACK) de AuraSocial.
 */
export class RobinResearchProvider implements ISocialProvider {
  readonly id = 'robin_research';
  readonly name = 'Robin Research';
  readonly description = 'Proveedor secundario / de respaldo de AuraSocial para conexión y publicación social.';
  readonly isPrimary = false;
  readonly isSecondary = true;

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
      youtube: false, // Robin no soporta YouTube según especificación
    },
  };

  private apiKey?: string;
  private apiUrl?: string;

  constructor(config?: { apiKey?: string; apiUrl?: string }) {
    this.apiKey = config?.apiKey || (typeof process !== 'undefined' ? process.env.ROBIN_RESEARCH_API_KEY : undefined);
    this.apiUrl = config?.apiUrl || (typeof process !== 'undefined' ? process.env.ROBIN_RESEARCH_API_URL : undefined);
  }

  /**
   * Consulta si Robin Research está configurado.
   */
  getConfigurationStatus(): ProviderConfigurationStatus {
    if (this.apiKey && this.apiKey.trim().length > 0) {
      return 'configured';
    }
    return 'not_configured';
  }

  /**
   * Genera la URL de autorización para Robin Research.
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
      metadata: { ...(metadata || {}), provider: 'robin_research' },
    });

    if (this.getConfigurationStatus() !== 'configured') {
      const url = `${redirectUri}?error=ROBIN_RESEARCH_CONFIGURATION_REQUIRED&state=${state}`;
      return { url, state };
    }

    const baseUrl = this.apiUrl || 'https://api.robinresearch.io/v1';
    return {
      url: `${baseUrl}/auth/authorize?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      state,
    };
  }

  /**
   * Procesa el callback OAuth de Robin Research.
   */
  async handleCallback(options: ProviderCallbackOptions): Promise<ProviderDiscoveredAccount[]> {
    const { code, state } = options;

    const stateRecord = await validateAndConsumeOAuthState({
      state,
      platform: 'instagram',
    });

    if (this.getConfigurationStatus() !== 'configured') {
      if (code.startsWith('mock_') || code === 'test_code') {
        return [
          {
            id: `robin_mock_${stateRecord.platform}_${Date.now()}`,
            provider: 'robin_research',
            platform: stateRecord.platform,
            account_name: `Robin ${stateRecord.platform.toUpperCase()} (Mock)`,
            account_username: `@robin_${stateRecord.platform}_mock`,
            account_type: 'business_account',
            scopes: stateRecord.scopes,
            metadata: { is_mock: true, provider: 'robin_research' },
          },
        ];
      }
      throw new Error('ROBIN_RESEARCH_CONFIGURATION_REQUIRED: Las credenciales de Robin Research (ROBIN_RESEARCH_API_KEY) no están configuradas en el entorno.');
    }

    try {
      const baseUrl = this.apiUrl || 'https://api.robinresearch.io/v1';
      const res = await fetch(`${baseUrl}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(`Error de Robin Research API: ${data.error.message}`);
      }

      return (data.accounts || []).map((acc: any) => ({
        id: acc.id,
        provider: 'robin_research',
        platform: acc.platform,
        account_name: acc.name,
        account_username: acc.username,
        account_type: acc.type,
        avatar_url: acc.avatar,
        access_token: acc.token,
        token_expires_at: acc.expires_at,
        scopes: stateRecord.scopes,
        metadata: { provider: 'robin_research', ...(acc.metadata || {}) },
      }));
    } catch (err: any) {
      throw new Error(`Fallo en Robin Research callback: ${err.message}`);
    }
  }

  /**
   * Valida la salud de una conexión registrada con Robin Research.
   */
  async validateConnection(connection: SocialConnection): Promise<ConnectionHealthReport> {
    const isMock = connection.status === 'mock_connected' || connection.account_id?.includes('mock_');

    if (this.getConfigurationStatus() !== 'configured' && !isMock) {
      return {
        connection_id: connection.id,
        platform: connection.platform,
        status: 'warning',
        is_valid: false,
        issues: ['ROBIN_RESEARCH_CONFIGURATION_REQUIRED: Credenciales de Robin Research pendientes de configuración.'],
        scopes: connection.scopes || [],
        checked_at: new Date().toISOString(),
      };
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
   * Despacha la publicación a través de Robin Research.
   */
  async publish(params: {
    connection: SocialConnection;
    publishPackage: PublishPackage;
    videoUrl: string;
    isMock?: boolean;
  }): Promise<ProviderPublishResult> {
    const { connection, publishPackage, isMock = false } = params;

    const validation = validatePublishPackage(publishPackage);
    if (!validation.isValid) {
      return {
        success: false,
        errorCode: 'QUALITY_GATE_FAILED',
        errorMessage: validation.errors.map(e => e.message).join(' | '),
        errorType: 'validation',
      };
    }

    if (!this.capabilities.platforms[publishPackage.platform]) {
      return {
        success: false,
        errorCode: 'PLATFORM_NOT_SUPPORTED',
        errorMessage: `Robin Research no soporta la plataforma ${publishPackage.platform}`,
        errorType: 'permanent',
      };
    }

    if (isMock || connection.status === 'mock_connected') {
      const ts = Date.now().toString(36);
      const mockPostId = `robin_mock_post_${ts}`;
      return {
        success: true,
        externalPostId: mockPostId,
        externalPostUrl: `https://${publishPackage.platform}.com/post/${mockPostId}`,
        publishedAt: new Date().toISOString(),
        providerJobId: `robin_job_${ts}`,
        providerMetadata: { provider: 'robin_research', is_mock: true },
      };
    }

    if (this.getConfigurationStatus() !== 'configured') {
      return {
        success: false,
        errorCode: 'ROBIN_RESEARCH_NOT_CONFIGURED',
        errorMessage: 'ROBIN_RESEARCH_CONFIGURATION_REQUIRED: No es posible publicar porque Robin Research no está configurado.',
        errorType: 'permission',
      };
    }

    try {
      const cleanCaption = sanitizePublicationText(publishPackage.copy.caption);
      const baseUrl = this.apiUrl || 'https://api.robinresearch.io/v1';
      const res = await fetch(`${baseUrl}/publications/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          account_id: connection.account_id,
          platform: connection.platform,
          video_url: params.videoUrl,
          caption: cleanCaption,
        }),
      });

      const data = await res.json();
      if (data.error) {
        return {
          success: false,
          errorCode: `ROBIN_ERROR_${data.error.code || 'UNKNOWN'}`,
          errorMessage: data.error.message,
          errorType: 'transient',
        };
      }

      return {
        success: true,
        externalPostId: data.post_id,
        externalPostUrl: data.permalink,
        publishedAt: new Date().toISOString(),
        providerJobId: data.task_id,
        providerMetadata: { provider: 'robin_research', ...(data.meta || {}) },
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'ROBIN_NETWORK_ERROR',
        errorMessage: `Error de comunicación con Robin Research: ${err.message}`,
        errorType: 'transient',
      };
    }
  }
}

export const robinResearchProvider = new RobinResearchProvider();
