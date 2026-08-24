import { supabase } from '../../lib/supabase';
import { 
  SocialConnection, 
  SocialPlatform, 
  ConnectionHealthStatus, 
  SocialProviderId 
} from '../../types/publishing';
import { sanitizeSocialConnectionForClient } from '../connectors/oauthSecurityService';
import { socialitClient, sanitizeSocialitLogs } from './socialitClient';
import { socialProviderRegistry } from './socialProviderRegistry';

export interface SocialAccountCapabilities {
  oauth: boolean;
  account_discovery: boolean;
  publishing: boolean;
  scheduling: boolean;
  media_upload: boolean;
  can_post: boolean;
  can_analytics: boolean;
  posting_scopes: string[];
}

export interface SocialAccountDiagnosticReport {
  connection_id: string;
  platform: SocialPlatform;
  provider: SocialProviderId;
  status: ConnectionHealthStatus;
  is_valid: boolean;
  can_publish: boolean;
  account_name?: string;
  account_username?: string;
  brand_id?: string | null;
  expires_at?: string | null;
  days_until_expiration?: number | null;
  issues: string[];
  scopes: string[];
  capabilities: SocialAccountCapabilities;
  last_health_check_at: string;
}

export interface AuditEventPayload {
  event: 
    | 'social_account_discovered'
    | 'social_account_bound'
    | 'social_account_health_checked'
    | 'social_account_unbound'
    | 'social_account_disconnected'
    | 'social_account_reassigned';
  workspace_id: string;
  brand_id?: string | null;
  connection_id?: string;
  platform: SocialPlatform;
  provider: string;
  metadata?: Record<string, any>;
}

/**
 * Registra un evento de auditoría sanitizado para la administración de conexiones sociales.
 * Garantiza 0% de filtración de claves API, tokens o secretos.
 */
export function logAuditEvent(payload: AuditEventPayload): void {
  const sanitizedMeta = payload.metadata ? JSON.parse(sanitizeSocialitLogs(JSON.stringify(payload.metadata))) : {};
  console.log(`[AUDIT_LOG] [${new Date().toISOString()}] Event: ${payload.event} | Provider: ${payload.provider} | Platform: ${payload.platform} | Ws: ${payload.workspace_id} | Brand: ${payload.brand_id || 'unassigned'} | Meta:`, sanitizedMeta);
}

/**
 * Calcula deterministamente si una cuenta social está habilitada para publicar contenido.
 * can_publish = true SOLAMENTE SI:
 * 1. Estado de conexión es 'connected'
 * 2. Salud de la cuenta es 'healthy' o 'expiring_soon' (token vigente)
 * 3. Proveedor soporta capacidad de publishing
 * 4. La cuenta individual posee permiso efectivo 'can_post = true'
 */
export function evaluateAccountCanPublish(params: {
  connectionStatus: string;
  healthStatus: ConnectionHealthStatus;
  providerSupportsPublishing: boolean;
  accountCanPost: boolean;
}): boolean {
  const { connectionStatus, healthStatus, providerSupportsPublishing, accountCanPost } = params;

  if (connectionStatus !== 'connected' && connectionStatus !== 'mock_connected') {
    return false;
  }

  if (healthStatus !== 'healthy' && healthStatus !== 'expiring_soon') {
    return false;
  }

  if (!providerSupportsPublishing) {
    return false;
  }

  if (!accountCanPost) {
    return false;
  }

  return true;
}

/**
 * Motor de Diagnóstico y Salud para cuentas sociales y proveedores.
 */
export class SocialProviderHealthService {

  /**
   * Ejecuta un chequeo de salud en profundidad de una conexión social sin exponer secretos.
   */
  async checkAccountHealth(connectionId: string): Promise<SocialAccountDiagnosticReport> {
    if (!connectionId) {
      throw new Error('connectionId es requerido');
    }

    const { data: connRaw, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !connRaw) {
      throw new Error(`Conexión ${connectionId} no encontrada.`);
    }

    const conn = connRaw as SocialConnection;
    const providerId = conn.provider || 'socialit';
    const isMock = conn.status === 'mock_connected' || Boolean(conn.metadata?.is_mock);
    const now = new Date();
    const lastCheckAt = now.toISOString();

    let healthStatus: ConnectionHealthStatus = 'unknown';
    let isValid = false;
    let issues: string[] = [];
    let expiresAt: string | null = conn.token_expires_at || null;
    let daysUntilExpiration: number | null = null;
    let accountCanPost = false;
    let accountCanAnalytics = false;
    let postingScopes: string[] = conn.scopes || [];

    // Proveedor registrado
    const providerInstance = socialProviderRegistry.getProvider(providerId);
    const providerPublishingSupported = Boolean(providerInstance?.capabilities.publishing);

    if (conn.status === 'disconnected') {
      healthStatus = 'disconnected';
      issues.push('La cuenta se encuentra formalmente desconectada en AuraSocial.');
    } else if (conn.status === 'revoked') {
      healthStatus = 'revoked';
      issues.push('El acceso de la cuenta fue revocado por el usuario o la plataforma.');
    } else if (isMock) {
      healthStatus = 'healthy';
      isValid = true;
      accountCanPost = true;
      daysUntilExpiration = 90;
    } else if (providerId === 'socialit') {
      const socialitAccountId = conn.provider_account_id || conn.account_id;
      if (socialitAccountId && socialitAccountId.startsWith('sa_')) {
        try {
          const rawHealth = await socialitClient.getSocialAccountHealth(socialitAccountId);
          
          accountCanPost = Boolean(rawHealth.can_post);
          accountCanAnalytics = Boolean(rawHealth.can_analytics);
          
          if (rawHealth.scopes?.posting) {
            postingScopes = rawHealth.scopes.posting.filter(s => s.granted).map(s => s.scope);
          }

          if (rawHealth.token?.expires_at) {
            expiresAt = rawHealth.token.expires_at;
            const expTime = new Date(expiresAt).getTime();
            daysUntilExpiration = Math.ceil((expTime - now.getTime()) / (1000 * 60 * 60 * 24));
          }

          if (!rawHealth.ok) {
            healthStatus = 'warning';
            issues.push('Socialit reportó un aviso de salud en la cuenta.');
          } else if (rawHealth.token && !rawHealth.token.valid) {
            healthStatus = 'expired';
            issues.push(`Token inválido o expirado: ${rawHealth.token.detail || 'Renovación requerida'}`);
          } else if (daysUntilExpiration !== null && daysUntilExpiration <= 0) {
            healthStatus = 'expired';
            issues.push('El token de acceso de la cuenta ha expirado.');
          } else if (daysUntilExpiration !== null && daysUntilExpiration <= 7) {
            healthStatus = 'expiring_soon';
            isValid = true;
            issues.push(`El token expira pronto (${daysUntilExpiration} días restantes).`);
          } else {
            healthStatus = 'healthy';
            isValid = true;
          }

          if (!accountCanPost) {
            issues.push('La cuenta no posee permisos de publicación en la plataforma (can_post=false).');
          }
        } catch (err: any) {
          healthStatus = 'error';
          issues.push(`Error al consultar salud en Socialit: ${sanitizeSocialitLogs(err.message)}`);
        }
      } else {
        healthStatus = 'warning';
        issues.push('La cuenta no tiene un identificador oficial de Socialit (sa_...).');
      }
    } else {
      healthStatus = 'warning';
      issues.push(`Proveedor '${providerId}' no soporta health check automatizado.`);
    }

    const canPublish = evaluateAccountCanPublish({
      connectionStatus: conn.status,
      healthStatus,
      providerSupportsPublishing: providerPublishingSupported,
      accountCanPost,
    });

    const capabilities: SocialAccountCapabilities = {
      oauth: Boolean(providerInstance?.capabilities.oauth),
      account_discovery: Boolean(providerInstance?.capabilities.account_discovery),
      publishing: providerPublishingSupported,
      scheduling: Boolean(providerInstance?.capabilities.scheduling),
      media_upload: Boolean(providerInstance?.capabilities.media_upload),
      can_post: accountCanPost,
      can_analytics: accountCanAnalytics,
      posting_scopes: postingScopes,
    };

    // Actualizar metadata no sensible en DB
    const updatedMetadata = {
      ...(conn.metadata || {}),
      health_status: healthStatus,
      can_publish: canPublish,
      can_post: accountCanPost,
      days_until_expiration: daysUntilExpiration,
      last_health_check_at: lastCheckAt,
      health_issues: issues,
      capabilities,
    };

    await supabase
      .from('social_connections')
      .update({
        token_expires_at: expiresAt,
        scopes: postingScopes,
        metadata: updatedMetadata,
        updated_at: lastCheckAt,
      })
      .eq('id', connectionId);

    logAuditEvent({
      event: 'social_account_health_checked',
      workspace_id: conn.workspace_id,
      brand_id: conn.brand_id,
      connection_id: conn.id,
      platform: conn.platform,
      provider: providerId,
      metadata: { health_status: healthStatus, can_publish: canPublish, daysUntilExpiration },
    });

    return {
      connection_id: conn.id,
      platform: conn.platform,
      provider: providerId,
      status: healthStatus,
      is_valid: isValid,
      can_publish: canPublish,
      account_name: conn.account_name || undefined,
      account_username: conn.account_username || undefined,
      brand_id: conn.brand_id,
      expires_at: expiresAt,
      days_until_expiration: daysUntilExpiration,
      issues,
      scopes: postingScopes,
      capabilities,
      last_health_check_at: lastCheckAt,
    };
  }

  /**
   * Asocia una cuenta social descubierta a una marca específica (Brand Binding).
   * Valida estrictamente aislamiento por workspace_id.
   */
  async bindAccountToBrand(params: {
    connectionId: string;
    workspaceId: string;
    brandId: string;
  }): Promise<SocialConnection> {
    const { connectionId, workspaceId, brandId } = params;

    if (!connectionId || !workspaceId || !brandId) {
      throw new Error('connectionId, workspaceId y brandId son requeridos para asociar la cuenta.');
    }

    // 1. Validar que la marca pertenezca al workspace
    const { data: brand, error: brandErr } = await supabase
      .from('brands')
      .select('id, workspace_id, name')
      .eq('id', brandId)
      .eq('workspace_id', workspaceId)
      .single();

    if (brandErr || !brand) {
      throw new Error(`VALIDATION_ERROR: La marca ${brandId} no pertenece al workspace ${workspaceId}.`);
    }

    // 2. Validar que la conexión pertenezca al workspace
    const { data: conn, error: connErr } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .single();

    if (connErr || !conn) {
      throw new Error(`VALIDATION_ERROR: Conexión ${connectionId} no encontrada en workspace ${workspaceId}.`);
    }

    // 3. Vincular a la marca
    const { data: updated, error: updateErr } = await supabase
      .from('social_connections')
      .update({
        brand_id: brandId,
        status: conn.status === 'disconnected' ? 'connected' : conn.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new Error(`Error al vincular cuenta a marca: ${updateErr?.message}`);
    }

    logAuditEvent({
      event: 'social_account_bound',
      workspace_id: workspaceId,
      brand_id: brandId,
      connection_id: connectionId,
      platform: conn.platform,
      provider: conn.provider || 'socialit',
      metadata: { brand_name: brand.name, account_name: conn.account_name },
    });

    return sanitizeSocialConnectionForClient(updated as SocialConnection);
  }

  /**
   * Desvincula una cuenta de su marca (dejándola como descubierta / sin asignar en el workspace).
   */
  async unbindAccountFromBrand(params: {
    connectionId: string;
    workspaceId: string;
    currentBrandId: string;
  }): Promise<SocialConnection> {
    const { connectionId, workspaceId, currentBrandId } = params;

    // Validar pertenencia actual
    const { data: conn, error: connErr } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .eq('brand_id', currentBrandId)
      .single();

    if (connErr || !conn) {
      throw new Error(`VALIDATION_ERROR: La cuenta ${connectionId} no pertenece a la marca ${currentBrandId} o workspace ${workspaceId}.`);
    }

    const { data: updated, error: updateErr } = await supabase
      .from('social_connections')
      .update({
        brand_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new Error(`Error al desvincular cuenta: ${updateErr?.message}`);
    }

    logAuditEvent({
      event: 'social_account_unbound',
      workspace_id: workspaceId,
      brand_id: currentBrandId,
      connection_id: connectionId,
      platform: conn.platform,
      provider: conn.provider || 'socialit',
    });

    return sanitizeSocialConnectionForClient(updated as SocialConnection);
  }

  /**
   * Reasigna una cuenta de una marca origen a una marca destino.
   */
  async reassignAccountToBrand(params: {
    connectionId: string;
    workspaceId: string;
    fromBrandId: string;
    toBrandId: string;
  }): Promise<SocialConnection> {
    const { connectionId, workspaceId, fromBrandId, toBrandId } = params;

    // Validar marca destino
    const { data: targetBrand, error: targetErr } = await supabase
      .from('brands')
      .select('id, workspace_id, name')
      .eq('id', toBrandId)
      .eq('workspace_id', workspaceId)
      .single();

    if (targetErr || !targetBrand) {
      throw new Error(`VALIDATION_ERROR: La marca destino ${toBrandId} no pertenece al workspace ${workspaceId}.`);
    }

    // Validar conexión en marca origen
    const { data: conn, error: connErr } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('workspace_id', workspaceId)
      .eq('brand_id', fromBrandId)
      .single();

    if (connErr || !conn) {
      throw new Error(`VALIDATION_ERROR: La cuenta ${connectionId} no pertenece a la marca de origen ${fromBrandId}.`);
    }

    const { data: updated, error: updateErr } = await supabase
      .from('social_connections')
      .update({
        brand_id: toBrandId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new Error(`Error al reasignar cuenta: ${updateErr?.message}`);
    }

    logAuditEvent({
      event: 'social_account_reassigned',
      workspace_id: workspaceId,
      brand_id: toBrandId,
      connection_id: connectionId,
      platform: conn.platform,
      provider: conn.provider || 'socialit',
      metadata: { from_brand_id: fromBrandId, to_brand_id: toBrandId, brand_name: targetBrand.name },
    });

    return sanitizeSocialConnectionForClient(updated as SocialConnection);
  }

  /**
   * Consulta cuentas vinculadas a la marca activa y cuentas descubiertas sin asignar en el workspace.
   */
  async getAccountsForBrandAndWorkspace(params: {
    workspaceId: string;
    brandId: string;
  }): Promise<{
    bound: SocialConnection[];
    unassigned: SocialConnection[];
  }> {
    const { workspaceId, brandId } = params;

    if (!workspaceId) return { bound: [], unassigned: [] };

    // Cuentas de la marca activa
    let bound: SocialConnection[] = [];
    if (brandId) {
      const { data: boundRaw } = await supabase
        .from('social_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('brand_id', brandId)
        .order('created_at', { ascending: true });
      
      bound = ((boundRaw as SocialConnection[]) || []).map(sanitizeSocialConnectionForClient);
    }

    // Cuentas sin asignar en el workspace
    const { data: unassignedRaw } = await supabase
      .from('social_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('brand_id', null)
      .order('created_at', { ascending: true });

    const unassigned = ((unassignedRaw as SocialConnection[]) || []).map(sanitizeSocialConnectionForClient);

    return { bound, unassigned };
  }
}

export const socialProviderHealthService = new SocialProviderHealthService();
