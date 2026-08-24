import { 
  SocialPlatform, 
  SocialConnection, 
  PublishPackage, 
  ConnectionHealthReport,
  SocialProviderId
} from '../../types/publishing';

/**
 * Capacidades declaradas por un proveedor social.
 */
export interface ProviderCapabilities {
  oauth: boolean;
  account_discovery: boolean;
  publishing: boolean;
  scheduling: boolean;
  media_upload: boolean;
  platforms: Record<SocialPlatform, boolean>;
}

/**
 * Estado de configuración del proveedor en el entorno.
 */
export type ProviderConfigurationStatus = 
  | 'configured'
  | 'not_configured'
  | 'partially_configured'
  | 'error';

/**
 * Cuenta social descubierta a través de la API del proveedor.
 */
export interface ProviderDiscoveredAccount {
  id: string;
  provider: SocialProviderId;
  platform: SocialPlatform;
  account_name: string;
  account_username?: string;
  account_type?: string;
  avatar_url?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string | null;
  scopes?: string[];
  metadata?: Record<string, any>;
}

/**
 * Opciones para generar la URL de autorización del proveedor.
 */
export interface ProviderAuthUrlOptions {
  workspaceId: string;
  brandId: string;
  userId?: string;
  redirectUri: string;
  platform?: SocialPlatform;
  scopes?: string[];
  metadata?: Record<string, any>;
}

/**
 * Opciones para procesar el callback OAuth del proveedor.
 */
export interface ProviderCallbackOptions {
  code: string;
  state: string;
  redirectUri: string;
  metadata?: Record<string, any>;
}

/**
 * Resultado de una operación de publicación a través del proveedor.
 */
export interface ProviderPublishResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  publishedAt?: string;
  providerJobId?: string;
  errorType?: 'validation' | 'authentication' | 'permission' | 'rate_limit' | 'transient' | 'permanent';
  errorCode?: string;
  errorMessage?: string;
  retryAfterSeconds?: number;
  providerMetadata?: Record<string, any>;
}

/**
 * Interfaz canónica y agnóstica para cualquier proveedor social (Socialit, Robin Research, Meta Direct, etc.).
 */
export interface ISocialProvider {
  readonly id: SocialProviderId;
  readonly name: string;
  readonly description: string;
  readonly isPrimary: boolean;
  readonly isSecondary: boolean;
  readonly capabilities: ProviderCapabilities;

  /**
   * Consulta si el proveedor está debidamente configurado con credenciales en el entorno actual.
   */
  getConfigurationStatus(): ProviderConfigurationStatus;

  /**
   * Genera la URL de autorización para el flujo de conexión.
   */
  getAuthorizationUrl(options: ProviderAuthUrlOptions): Promise<{ url: string; state: string }>;

  /**
   * Procesa el callback de conexión e intercambia tokens para descubrir cuentas sociales.
   */
  handleCallback(options: ProviderCallbackOptions): Promise<ProviderDiscoveredAccount[]>;

  /**
   * Valida la salud y vigencia de una conexión existente.
   */
  validateConnection(connection: SocialConnection): Promise<ConnectionHealthReport>;

  /**
   * Refresca las credenciales de una conexión.
   */
  refreshConnection?(connection: SocialConnection): Promise<SocialConnection>;

  /**
   * Desconecta o revoca una cuenta social.
   */
  disconnectAccount?(connection: SocialConnection): Promise<boolean>;

  /**
   * Despacha la publicación de un PublicationPackage aprobado a la plataforma destino.
   */
  publish(params: {
    connection: SocialConnection;
    publishPackage: PublishPackage;
    videoUrl: string;
    isMock?: boolean;
  }): Promise<ProviderPublishResult>;
}
