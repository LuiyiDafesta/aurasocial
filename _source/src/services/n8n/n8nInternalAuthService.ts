import { sanitizeSocialitLogs } from '../socialProviders/socialitClient';

export interface N8NAuthContext {
  workspace_id: string;
  brand_id?: string | null;
  caller: 'n8n_orchestrator' | 'internal_system';
  authenticated_at: string;
}

export interface N8NAuthValidationResult {
  isValid: boolean;
  context?: N8NAuthContext;
  error?: string;
}

// Clave API de n8n por defecto para desarrollo/staging o tomada de variable de entorno server-side
const DEFAULT_SERVER_N8N_KEY = 'aura_n8n_live_sec_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4';
const revokedKeys = new Set<string>();

/**
 * Valida la autenticación Server-to-Server para llamadas provenientes del orquestador n8n.
 * Exige cabecera de autorización Bearer o X-AuraSocial-Server-Key, junto con contexto de tenant.
 */
export function validateN8NServerRequest(headers: {
  authorization?: string | null;
  'x-aurasocial-server-key'?: string | null;
  'x-workspace-id'?: string | null;
  'x-brand-id'?: string | null;
}): N8NAuthValidationResult {
  const authHeader = headers.authorization || '';
  const customKeyHeader = headers['x-aurasocial-server-key'] || '';
  const workspaceId = headers['x-workspace-id'] || '';
  const brandId = headers['x-brand-id'] || null;

  // Extraer token Bearer si existe
  let providedKey = customKeyHeader;
  if (!providedKey && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  }

  if (!providedKey) {
    return {
      isValid: false,
      error: 'UNAUTHORIZED: Credencial de autenticación n8n server-to-server requerida.',
    };
  }

  // Comprobar si la clave fue revocada
  if (revokedKeys.has(providedKey)) {
    return {
      isValid: false,
      error: 'FORBIDDEN: La credencial n8n ha sido revocada.',
    };
  }

  // Validar clave contra entorno o valor configurado
  const expectedKey = process.env.AURASOCIAL_N8N_API_KEY || DEFAULT_SERVER_N8N_KEY;
  if (providedKey !== expectedKey) {
    return {
      isValid: false,
      error: 'UNAUTHORIZED: Credencial n8n inválida.',
    };
  }

  // Validar contexto de workspace (multi-tenant)
  if (!workspaceId) {
    return {
      isValid: false,
      error: 'BAD_REQUEST: x-workspace-id es obligatorio para aislar el contexto del tenant.',
    };
  }

  return {
    isValid: true,
    context: {
      workspace_id: workspaceId,
      brand_id: brandId,
      caller: 'n8n_orchestrator',
      authenticated_at: new Date().toISOString(),
    },
  };
}

/**
 * Permite revocar una clave n8n para rotación de credenciales.
 */
export function revokeN8NServerKey(key: string): void {
  if (key) {
    revokedKeys.add(key);
    console.log(`[SECURITY] Clave n8n revocada: ${sanitizeSocialitLogs(key)}`);
  }
}

/**
 * Restaura estado de claves revocadas (útil para pruebas).
 */
export function resetRevokedN8NKeys(): void {
  revokedKeys.clear();
}
