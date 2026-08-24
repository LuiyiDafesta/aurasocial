import { supabase } from '../../lib/supabase';
import { SocialPlatform, OAuthStateRecord, SocialConnection } from '../../types/publishing';

/**
 * Genera un nonce criptográfico o pseudoaleatorio seguro.
 */
export function generateOAuthNonce(length = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
  }
  return result;
}

/**
 * Crea y persiste un state OAuth server-side para prevención estricta de CSRF.
 */
export async function createAndPersistOAuthState(params: {
  workspaceId: string;
  brandId: string;
  userId?: string;
  platform: SocialPlatform;
  redirectUri: string;
  scopes?: string[];
  ttlSeconds?: number;
  metadata?: Record<string, any>;
}): Promise<{ state: string; record: OAuthStateRecord }> {
  const {
    workspaceId,
    brandId,
    userId,
    platform,
    redirectUri,
    scopes = [],
    ttlSeconds = 600, // 10 minutos de validez por defecto
    metadata = {},
  } = params;

  if (!workspaceId || !brandId || !platform) {
    throw new Error('workspaceId, brandId y platform son obligatorios para generar un state OAuth.');
  }

  const nonce = generateOAuthNonce(24);
  // State codificado estructurado: platform_nonce_timestamp
  const state = `aurastate_${platform}_${nonce}_${Date.now().toString(36)}`;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const payload = {
    state,
    workspace_id: workspaceId,
    brand_id: brandId,
    user_id: userId || null,
    platform,
    nonce,
    redirect_uri: redirectUri,
    scopes,
    expires_at: expiresAt,
    metadata,
  };

  const { data, error } = await supabase
    .from('oauth_states')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Error al persistir state OAuth Anti-CSRF: ${error?.message}`);
  }

  return { state, record: data as OAuthStateRecord };
}

/**
 * Valida y consume de forma atómica un state OAuth.
 * Reglas de rechazo:
 * - State inexistente
 * - State ya utilizado previamente (replay attack)
 * - State expirado
 * - Workspace / Brand discordante
 */
export async function validateAndConsumeOAuthState(params: {
  state: string;
  platform: SocialPlatform;
  expectedWorkspaceId?: string;
  expectedBrandId?: string;
}): Promise<OAuthStateRecord> {
  const { state, platform, expectedWorkspaceId, expectedBrandId } = params;

  if (!state || typeof state !== 'string') {
    throw new Error('State OAuth faltante o inválido.');
  }

  // 1. Consultar registro del state
  const { data: record, error } = await supabase
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .single();

  if (error || !record) {
    throw new Error('State OAuth no encontrado o manipulado (posible ataque CSRF).');
  }

  const oauthRecord = record as OAuthStateRecord;

  // 2. Verificar que no haya sido utilizado
  if (oauthRecord.used_at) {
    throw new Error('State OAuth ya fue utilizado previamente. Intento de repetición rechazado.');
  }

  // 3. Verificar expiración
  const now = new Date();
  const expiresAt = new Date(oauthRecord.expires_at);
  if (now > expiresAt) {
    throw new Error('State OAuth expirado. Por favor, iniciá el flujo de conexión nuevamente.');
  }

  // 4. Verificar coincidencia de plataforma
  if (oauthRecord.platform !== platform) {
    throw new Error(`Plataforma discordante en state OAuth: esperado ${platform}, encontrado ${oauthRecord.platform}`);
  }

  // 5. Verificar workspace si se proporcionó
  if (expectedWorkspaceId && oauthRecord.workspace_id !== expectedWorkspaceId) {
    throw new Error('Aislamiento multi-tenant violado: el state OAuth pertenece a otro workspace.');
  }

  // 6. Verificar marca si se proporcionó
  if (expectedBrandId && oauthRecord.brand_id !== expectedBrandId) {
    throw new Error('Aislamiento por marca violado: el state OAuth pertenece a otra marca.');
  }

  // 7. Marcar como utilizado (atómico)
  const { error: updateError } = await supabase
    .from('oauth_states')
    .update({ used_at: now.toISOString() })
    .eq('id', oauthRecord.id);

  if (updateError) {
    throw new Error(`Error al consumir state OAuth: ${updateError.message}`);
  }

  return oauthRecord;
}

/**
 * Sanitiza cualquier objeto de conexión social antes de enviarlo al frontend o logs,
 * removiendo estrictamente tokens sensibles y secretos.
 */
export function sanitizeSocialConnectionForClient(connection: SocialConnection): SocialConnection {
  return {
    ...connection,
    access_token_encrypted: undefined,
    refresh_token_encrypted: undefined,
    metadata: connection.metadata ? { ...connection.metadata, client_secret: undefined, app_secret: undefined } : {},
  };
}

/**
 * Sanitiza logs para prevenir fugas accidentales de tokens o credenciales.
 */
export function sanitizeLogString(str: string): string {
  if (!str) return '';
  return str
    .replace(/(access_token[=:]\s*["']?)[^"'\s&]+/gi, '$1[REDACTED]')
    .replace(/(refresh_token[=:]\s*["']?)[^"'\s&]+/gi, '$1[REDACTED]')
    .replace(/(client_secret[=:]\s*["']?)[^"'\s&]+/gi, '$1[REDACTED]')
    .replace(/(app_secret[=:]\s*["']?)[^"'\s&]+/gi, '$1[REDACTED]')
    .replace(/(code[=:]\s*["']?)[^"'\s&]+/gi, '$1[REDACTED]');
}
