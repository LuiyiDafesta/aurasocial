import { 
  SocialPlatform, 
  SocialAccountType 
} from '../../types/publishing';
import { ProviderDiscoveredAccount } from './SocialProvider';

/**
 * Representación cruda de una cuenta social retornada por Socialit API (GET /v1/social-accounts)
 */
export interface SocialitAccountRaw {
  id: string;
  profile_id?: string;
  group_ids?: string[];
  platform: string;
  account_type: string;
  username: string | null;
  name: string;
  display_name: string;
  avatar_url: string | null;
  external_id: string;
  status: string;
  created_at?: string;
}

/**
 * Reporte de salud y permisos retornado por Socialit API (GET /v1/social-accounts/:id/health)
 */
export interface SocialitAccountHealth {
  ok: boolean;
  token?: {
    valid: boolean;
    strategy?: string;
    expires_at?: string | null;
    detail?: string | null;
  };
  scopes?: {
    posting?: Array<{ scope: string; granted: boolean }>;
    analytics?: Array<{ scope: string; granted: boolean }>;
    optional?: Array<{ scope: string; granted: boolean }>;
  };
  can_post: boolean;
  can_analytics?: boolean;
}

export type SocialitHealthState = 
  | 'healthy'
  | 'warning'
  | 'invalid_credentials'
  | 'unavailable'
  | 'not_configured';

export interface SocialitConfigHealthReport {
  status: SocialitHealthState;
  configured: boolean;
  message: string;
  accounts_count?: number;
  checked_at: string;
}

/**
 * Sanitiza cualquier texto o mensaje para evitar que tokens o API keys se filtren en logs o UI.
 */
export function sanitizeSocialitLogs(message: string, secrets: (string | undefined | null)[] = []): string {
  if (!message) return '';
  let sanitized = message;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) {
      sanitized = sanitized.split(secret).join('[REDACTED]');
    }
  }
  // Enmascarar patrones típicos de API keys (e.g. sk_live_..., Bearer ...)
  sanitized = sanitized.replace(/(Bearer\s+)[A-Za-z0-9_\-\.]{10,}/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/sk_live_[A-Za-z0-9_\-]{10,}/gi, 'sk_live_[REDACTED]');
  sanitized = sanitized.replace(/sa_[A-Za-z0-9_\-]{15,}/gi, (match) => `${match.substring(0, 6)}...`);
  return sanitized;
}

/**
 * Mapea la plataforma y tipo de cuenta de Socialit a los tipos canónicos de AuraSocial.
 */
export function mapSocialitPlatform(rawPlatform: string, accountType?: string): SocialPlatform {
  const normPlatform = (rawPlatform || '').toLowerCase().trim();
  const normType = (accountType || '').toLowerCase().trim();

  if (normPlatform === 'meta') {
    if (normType.includes('instagram') || normType === 'ig') {
      return 'instagram';
    }
    return 'facebook'; // Por defecto meta page -> facebook
  }

  if (normPlatform === 'instagram' || normPlatform === 'ig') {
    return 'instagram';
  }
  if (normPlatform === 'facebook' || normPlatform === 'fb') {
    return 'facebook';
  }
  if (normPlatform === 'tiktok') {
    return 'tiktok';
  }
  if (normPlatform === 'linkedin') {
    return 'linkedin';
  }
  if (normPlatform === 'youtube') {
    return 'youtube';
  }

  // Fallback seguro a instagram
  return 'instagram';
}

/**
 * Mapea el tipo de cuenta crudo a SocialAccountType.
 */
export function mapSocialitAccountType(accountType: string, platform: SocialPlatform): SocialAccountType {
  const norm = (accountType || '').toLowerCase();
  if (norm === 'page' || platform === 'facebook') return 'page';
  if (norm === 'channel' || platform === 'youtube') return 'channel';
  if (norm === 'profile') return 'profile';
  return 'business_account';
}

/**
 * Cliente seguro de solo lectura y descubrimiento para la API oficial de Socialit.
 * ZERO PUBLISHING: Toda operación de publicación está bloqueada en esta capa.
 */
export class SocialitClient {
  private apiKey?: string;
  private apiUrl: string;
  private timeoutMs: number;

  constructor(config?: { apiKey?: string; apiUrl?: string; timeoutMs?: number }) {
    this.apiKey = config?.apiKey || (typeof process !== 'undefined' ? process.env.SOCIALIT_API_KEY : undefined);
    this.apiUrl = (config?.apiUrl || (typeof process !== 'undefined' ? process.env.SOCIALIT_API_URL : undefined) || 'https://api.socialit.com').replace(/\/+$/, '');
    this.timeoutMs = config?.timeoutMs || 8000;
  }

  /**
   * Obtiene la clave configurada (sin exponerla al frontend).
   */
  public hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Helper HTTP con timeout, autenticación y manejo de errores seguro.
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.hasApiKey()) {
      throw new Error('SOCIALIT_CONFIGURATION_REQUIRED: SOCIALIT_API_KEY no está configurada.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const url = `${this.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error('SOCIALIT_INVALID_CREDENTIALS: La API Key de Socialit es inválida o expiró.');
      }

      if (res.status === 429) {
        throw new Error('SOCIALIT_RATE_LIMIT: Se alcanzó el límite de solicitudes de Socialit.');
      }

      if (res.status === 404) {
        throw new Error(`SOCIALIT_NOT_FOUND: Recurso no encontrado (${path}).`);
      }

      if (!res.ok) {
        throw new Error(`SOCIALIT_API_ERROR: La API de Socialit respondió con código HTTP ${res.status}`);
      }

      const json = await res.json();
      return json as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`SOCIALIT_TIMEOUT: Tiempo de espera agotado (${this.timeoutMs}ms) al conectar con Socialit.`);
      }
      throw new Error(sanitizeSocialitLogs(err.message, [this.apiKey]));
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Valida la configuración de Socialit mediante un request real READ-ONLY (GET /v1/social-accounts).
   */
  public async validateSocialitConfiguration(): Promise<SocialitConfigHealthReport> {
    const checked_at = new Date().toISOString();

    if (!this.hasApiKey()) {
      return {
        status: 'not_configured',
        configured: false,
        message: 'SOCIALIT_CONFIGURATION_REQUIRED: SOCIALIT_API_KEY no está configurada en el entorno server-side.',
        checked_at,
      };
    }

    try {
      const data = await this.getSocialAccounts();
      const accounts_count = Array.isArray(data) ? data.length : 0;

      return {
        status: 'healthy',
        configured: true,
        message: `🟢 Conexión con Socialit verificada exitosamente (${accounts_count} cuenta(s) conectada(s)).`,
        accounts_count,
        checked_at,
      };
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('SOCIALIT_INVALID_CREDENTIALS')) {
        return {
          status: 'invalid_credentials',
          configured: false,
          message: '🔴 Credenciales de Socialit inválidas o rechazadas por la API.',
          checked_at,
        };
      }

      return {
        status: 'unavailable',
        configured: false,
        message: `🟡 Socialit API no disponible: ${sanitizeSocialitLogs(msg, [this.apiKey])}`,
        checked_at,
      };
    }
  }

  /**
   * Obtiene la lista de cuentas sociales conectadas en Socialit (GET /v1/social-accounts).
   */
  public async getSocialAccounts(): Promise<SocialitAccountRaw[]> {
    const res = await this.request<{ social_accounts?: SocialitAccountRaw[] }>('/v1/social-accounts');
    return res.social_accounts || [];
  }

  /**
   * Obtiene los datos detallados de una cuenta social específica (GET /v1/social-accounts/:id).
   */
  public async getSocialAccount(accountId: string): Promise<SocialitAccountRaw> {
    if (!accountId) throw new Error('accountId es requerido');
    const res = await this.request<{ social_account?: SocialitAccountRaw }>(`/v1/social-accounts/${accountId}`);
    if (!res.social_account) {
      throw new Error(`SOCIALIT_NOT_FOUND: Cuenta ${accountId} no encontrada en Socialit.`);
    }
    return res.social_account;
  }

  /**
   * Ejecuta un chequeo de salud REAL del token y permisos de publicación (GET /v1/social-accounts/:id/health).
   */
  public async getSocialAccountHealth(accountId: string): Promise<SocialitAccountHealth> {
    if (!accountId) throw new Error('accountId es requerido');
    const res = await this.request<{ health?: SocialitAccountHealth }>(`/v1/social-accounts/${accountId}/health`);
    if (!res.health) {
      return {
        ok: false,
        can_post: false,
        token: { valid: false, expires_at: null },
      };
    }
    return res.health;
  }

  /**
   * Descubre todas las cuentas sociales reales y las mapea al modelo canónico de AuraSocial.
   */
  public async discoverAccounts(filterPlatform?: SocialPlatform): Promise<ProviderDiscoveredAccount[]> {
    const rawAccounts = await this.getSocialAccounts();

    const discovered: ProviderDiscoveredAccount[] = [];

    for (const raw of rawAccounts) {
      const platform = mapSocialitPlatform(raw.platform, raw.account_type);

      if (filterPlatform && platform !== filterPlatform) {
        continue;
      }

      const accountType = mapSocialitAccountType(raw.account_type, platform);

      discovered.push({
        id: raw.id,
        provider: 'socialit',
        platform,
        account_name: raw.name || raw.display_name || `Socialit ${platform}`,
        account_username: raw.username ? (raw.username.startsWith('@') ? raw.username : `@${raw.username}`) : undefined,
        account_type: accountType,
        avatar_url: raw.avatar_url || undefined,
        metadata: {
          provider: 'socialit',
          provider_account_id: raw.id,
          profile_id: raw.profile_id,
          group_ids: raw.group_ids,
          external_id: raw.external_id,
          raw_platform: raw.platform,
          raw_account_type: raw.account_type,
          display_name: raw.display_name,
          socialit_status: raw.status,
          discovered_at: new Date().toISOString(),
        },
      });
    }

    return discovered;
  }

  /**
   * GUARDRAIL: Funciones de publicación explícitamente bloqueadas.
   */
  public createPost(): never {
    throw new Error('ZERO_PUBLISHING_GATE: La creación de publicaciones está estrictamente bloqueada en Fase 12D.1.');
  }

  public publishPost(): never {
    throw new Error('ZERO_PUBLISHING_GATE: La publicación de contenidos está estrictamente bloqueada en Fase 12D.1.');
  }

  public schedulePost(): never {
    throw new Error('ZERO_PUBLISHING_GATE: La programación de publicaciones está estrictamente bloqueada en Fase 12D.1.');
  }
}

export const socialitClient = new SocialitClient();
