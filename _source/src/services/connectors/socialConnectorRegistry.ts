import { SocialPlatform } from '../../types/publishing';
import { ISocialConnector } from './SocialConnector';
import { MetaConnector } from './MetaConnector';
import { TikTokConnector } from './TikTokConnector';
import { LinkedInConnector } from './LinkedInConnector';
import { YouTubeConnector } from './YouTubeConnector';

/**
 * Registro y fábrica de conectores sociales para AuraSocial.
 */
export class SocialConnectorRegistry {
  private static instance: SocialConnectorRegistry;
  private connectors: Map<SocialPlatform, ISocialConnector> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): SocialConnectorRegistry {
    if (!SocialConnectorRegistry.instance) {
      SocialConnectorRegistry.instance = new SocialConnectorRegistry();
    }
    return SocialConnectorRegistry.instance;
  }

  private registerDefaults() {
    const metaConnector = new MetaConnector();
    this.connectors.set('instagram', metaConnector);
    this.connectors.set('facebook', metaConnector);
    this.connectors.set('tiktok', new TikTokConnector());
    this.connectors.set('linkedin', new LinkedInConnector());
    this.connectors.set('youtube', new YouTubeConnector());
  }

  /**
   * Obtiene el conector apropiado para una plataforma dada.
   */
  public getConnector(platform: SocialPlatform): ISocialConnector {
    const connector = this.connectors.get(platform);
    if (!connector) {
      throw new Error(`No existe un SocialConnector registrado para la plataforma: ${platform}`);
    }
    return connector;
  }

  /**
   * Permite registrar o sobreescribir un conector (útil para testing o extensiones).
   */
  public registerConnector(platform: SocialPlatform, connector: ISocialConnector) {
    this.connectors.set(platform, connector);
  }
}

export const socialConnectorRegistry = SocialConnectorRegistry.getInstance();
