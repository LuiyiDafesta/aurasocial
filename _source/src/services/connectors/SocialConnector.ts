import { 
  SocialPlatform, 
  SocialConnection, 
  DiscoveredSocialAccount, 
  ConnectionHealthReport 
} from '../../types/publishing';

export interface AuthorizationUrlOptions {
  workspaceId: string;
  brandId: string;
  userId?: string;
  redirectUri: string;
  scopes?: string[];
  metadata?: Record<string, any>;
}

export interface CallbackOptions {
  code: string;
  state: string;
  redirectUri: string;
}

export interface SaveConnectionOptions {
  workspaceId: string;
  brandId: string;
  account: DiscoveredSocialAccount;
}

/**
 * Contrato base para todos los conectores sociales de AuraSocial.
 * Responsabilidad exclusiva: Autenticación OAuth, descubrimiento de cuentas,
 * almacenamiento seguro, validación de salud y desconexión.
 * 
 * NO INCLUYE MÉTODOS DE PUBLICACIÓN.
 */
export interface ISocialConnector {
  readonly platform: SocialPlatform;

  /**
   * Genera la URL de autorización OAuth con un state Anti-CSRF persistido server-side.
   */
  getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<{ url: string; state: string }>;

  /**
   * Procesa el callback OAuth, valida el state Anti-CSRF, realiza el intercambio de tokens
   * y descubre las cuentas/páginas disponibles para vincular.
   */
  handleCallback(options: CallbackOptions): Promise<DiscoveredSocialAccount[]>;

  /**
   * Persiste la cuenta seleccionada por el usuario en la tabla social_connections.
   */
  saveConnection(options: SaveConnectionOptions): Promise<SocialConnection>;

  /**
   * Refresca un token expirado o próximo a expirar.
   */
  refreshToken(connectionId: string): Promise<SocialConnection>;

  /**
   * Desconecta la cuenta y revoca los tokens en el proveedor cuando sea soportado.
   */
  disconnect(connectionId: string): Promise<boolean>;

  /**
   * Diagnostica la salud de una conexión social sin exponer credenciales.
   */
  validateConnection(connectionId: string): Promise<ConnectionHealthReport>;
}
