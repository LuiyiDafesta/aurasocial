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
import { MetaConnector } from '../connectors/MetaConnector';
import { metaPublisher } from '../publishers/MetaPublisher';

/**
 * Proveedor Directo de Meta (🔌 OPTIONAL / FUTURE / LEGACY).
 * No es utilizado automáticamente como proveedor primario.
 */
export class MetaDirectProvider implements ISocialProvider {
  readonly id = 'meta_direct';
  readonly name = 'Meta Direct API';
  readonly description = 'Conector directo legacy/opcional con Meta Graph API (Instagram Reels & Facebook Pages).';
  readonly isPrimary = false;
  readonly isSecondary = false;

  readonly capabilities: ProviderCapabilities = {
    oauth: true,
    account_discovery: true,
    publishing: true,
    scheduling: false,
    media_upload: true,
    platforms: {
      instagram: true,
      facebook: true,
      tiktok: false,
      linkedin: false,
      youtube: false,
    },
  };

  private connector: MetaConnector;

  constructor() {
    this.connector = new MetaConnector();
  }

  getConfigurationStatus(): ProviderConfigurationStatus {
    const hasAppId = typeof process !== 'undefined' && Boolean(process.env.META_APP_ID || process.env.META_CLIENT_ID);
    const hasAppSecret = typeof process !== 'undefined' && Boolean(process.env.META_APP_SECRET || process.env.META_CLIENT_SECRET);
    if (hasAppId && hasAppSecret) {
      return 'configured';
    }
    return 'not_configured';
  }

  async getAuthorizationUrl(options: ProviderAuthUrlOptions): Promise<{ url: string; state: string }> {
    return this.connector.getAuthorizationUrl({
      workspaceId: options.workspaceId,
      brandId: options.brandId,
      userId: options.userId,
      redirectUri: options.redirectUri,
      scopes: options.scopes,
      metadata: options.metadata,
    });
  }

  async handleCallback(options: ProviderCallbackOptions): Promise<ProviderDiscoveredAccount[]> {
    const accounts = await this.connector.handleCallback({
      code: options.code,
      state: options.state,
      redirectUri: options.redirectUri,
    });

    return accounts.map(acc => ({
      id: acc.id,
      provider: 'meta_direct',
      platform: acc.platform,
      account_name: acc.account_name,
      account_username: acc.username,
      account_type: acc.account_type,
      avatar_url: acc.avatar_url,
      access_token: acc.access_token,
      token_expires_at: acc.token_expires_at,
      scopes: acc.scopes,
      metadata: { ...(acc.metadata || {}), provider: 'meta_direct' },
    }));
  }

  async validateConnection(connection: SocialConnection): Promise<ConnectionHealthReport> {
    return this.connector.validateConnection(connection.id);
  }

  async publish(params: {
    connection: SocialConnection;
    publishPackage: PublishPackage;
    videoUrl: string;
    isMock?: boolean;
  }): Promise<ProviderPublishResult> {
    const { connection, publishPackage, videoUrl, isMock = false } = params;

    if (publishPackage.platform === 'instagram') {
      const res = await metaPublisher.publishInstagramReel({
        connection,
        publishPackage,
        videoUrl,
        caption: publishPackage.copy.caption,
        hashtags: publishPackage.copy.hashtags,
        isMock,
      });

      return {
        success: res.success,
        externalPostId: res.externalPostId,
        externalPostUrl: res.externalPostUrl,
        publishedAt: res.publishedAt,
        errorCode: res.errorCode,
        errorMessage: res.errorMessage,
        errorType: res.errorType,
        retryAfterSeconds: res.retryAfterSeconds,
      };
    } else if (publishPackage.platform === 'facebook') {
      const res = await metaPublisher.publishFacebookVideo({
        connection,
        publishPackage,
        videoUrl,
        caption: publishPackage.copy.caption,
        title: publishPackage.copy.title,
        hashtags: publishPackage.copy.hashtags,
        isMock,
      });

      return {
        success: res.success,
        externalPostId: res.externalPostId,
        externalPostUrl: res.externalPostUrl,
        publishedAt: res.publishedAt,
        errorCode: res.errorCode,
        errorMessage: res.errorMessage,
        errorType: res.errorType,
        retryAfterSeconds: res.retryAfterSeconds,
      };
    }

    return {
      success: false,
      errorCode: 'PLATFORM_NOT_SUPPORTED',
      errorMessage: `MetaDirectProvider no soporta ${publishPackage.platform}`,
      errorType: 'permanent',
    };
  }
}

export const metaDirectProvider = new MetaDirectProvider();
