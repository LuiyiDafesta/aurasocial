import { supabase } from '../lib/supabase';
import { 
  SocialConnection, 
  SocialConnectionStatus, 
  SocialPlatform, 
  DiscoveredSocialAccount, 
  ConnectionHealthReport 
} from '../types/publishing';
import { socialConnectorRegistry } from './connectors/socialConnectorRegistry';
import { sanitizeSocialConnectionForClient } from './connectors/oauthSecurityService';
import { socialitClient } from './socialProviders/socialitClient';
import { socialitProvider } from './socialProviders/SocialitProvider';
import { 
  socialProviderHealthService, 
  SocialAccountDiagnosticReport, 
  logAuditEvent 
} from './socialProviders/socialProviderHealthService';

const CONNECTION_SELECT_FIELDS = 'id, workspace_id, brand_id, platform, provider, provider_account_id, provider_account_name, provider_metadata, account_type, account_id, account_name, account_username, avatar_url, status, token_expires_at, scopes, metadata, created_at, updated_at';

/**
 * Consulta todas las conexiones sociales activas/registradas de una marca,
 * aplicando aislamiento estricto y sanitización de credenciales.
 */
export async function getSocialConnections(
  brandId: string,
  workspaceId?: string
): Promise<SocialConnection[]> {
  if (!brandId) return [];

  let query = supabase
    .from('social_connections')
    .select(CONNECTION_SELECT_FIELDS)
    .eq('brand_id', brandId)
    .order('created_at', { ascending: true });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error al obtener conexiones sociales para marca ${brandId}:`, error);
    return [];
  }

  return ((data as SocialConnection[]) || []).map(sanitizeSocialConnectionForClient);
}

/**
 * Consulta conexiones asignadas a la marca activa y cuentas descubiertas sin asignar en el workspace.
 */
export async function getBrandAndUnassignedSocialAccounts(params: {
  workspaceId: string;
  brandId: string;
}): Promise<{
  bound: SocialConnection[];
  unassigned: SocialConnection[];
}> {
  return socialProviderHealthService.getAccountsForBrandAndWorkspace(params);
}

/**
 * Consulta una conexión social específica por ID, sanitizando credenciales.
 */
export async function getSocialConnection(connectionId: string): Promise<SocialConnection | null> {
  if (!connectionId) return null;

  const { data, error } = await supabase
    .from('social_connections')
    .select(CONNECTION_SELECT_FIELDS)
    .eq('id', connectionId)
    .single();

  if (error || !data) {
    return null;
  }

  return sanitizeSocialConnectionForClient(data as SocialConnection);
}

/**
 * Inicia el flujo OAuth para una plataforma generando la URL de autorización y state Anti-CSRF.
 */
export async function startOAuthFlow(params: {
  platform: SocialPlatform;
  workspaceId: string;
  brandId: string;
  redirectUri: string;
  userId?: string;
  scopes?: string[];
}): Promise<{ url: string; state: string }> {
  const { platform, workspaceId, brandId, redirectUri, userId, scopes } = params;
  const connector = socialConnectorRegistry.getConnector(platform);
  return connector.getAuthorizationUrl({
    workspaceId,
    brandId,
    redirectUri,
    userId,
    scopes,
  });
}

/**
 * Procesa el callback OAuth, valida el state Anti-CSRF y devuelve las cuentas sociales descubiertas.
 */
export async function handleOAuthCallback(params: {
  platform: SocialPlatform;
  code: string;
  state: string;
  redirectUri: string;
}): Promise<DiscoveredSocialAccount[]> {
  const { platform, code, state, redirectUri } = params;
  const connector = socialConnectorRegistry.getConnector(platform);
  return connector.handleCallback({
    code,
    state,
    redirectUri,
  });
}

/**
 * Guarda una cuenta descubierta seleccionada por el usuario en la marca activa.
 */
export async function connectDiscoveredAccount(params: {
  workspaceId: string;
  brandId: string;
  account: DiscoveredSocialAccount;
}): Promise<SocialConnection> {
  const { workspaceId, brandId, account } = params;
  const connector = socialConnectorRegistry.getConnector(account.platform);
  const saved = await connector.saveConnection({
    workspaceId,
    brandId,
    account,
  });
  return sanitizeSocialConnectionForClient(saved);
}

/**
 * Asocia una cuenta social descubierta a una marca específica (Brand Binding).
 */
export async function bindSocialAccount(params: {
  connectionId: string;
  workspaceId: string;
  brandId: string;
}): Promise<SocialConnection> {
  return socialProviderHealthService.bindAccountToBrand(params);
}

/**
 * Desvincula una cuenta social de una marca (dejándola como descubierta / sin asignar).
 */
export async function unbindSocialAccount(params: {
  connectionId: string;
  workspaceId: string;
  currentBrandId: string;
}): Promise<SocialConnection> {
  return socialProviderHealthService.unbindAccountFromBrand(params);
}

/**
 * Reasigna una cuenta de una marca origen a una marca destino.
 */
export async function reassignSocialAccount(params: {
  connectionId: string;
  workspaceId: string;
  fromBrandId: string;
  toBrandId: string;
}): Promise<SocialConnection> {
  return socialProviderHealthService.reassignAccountToBrand(params);
}

/**
 * Diagnóstico y chequeo de salud en profundidad de una conexión social.
 */
export async function diagnoseSocialConnectionHealth(
  connectionId: string
): Promise<SocialAccountDiagnosticReport> {
  return socialProviderHealthService.checkAccountHealth(connectionId);
}

/**
 * Descubre cuentas en vivo desde la API real de Socialit y las sincroniza idempotentemente
 * en social_connections para el workspace_id.
 * Permite mantener cuentas sin asignar para vinculación explícita a marcas.
 */
export async function discoverAndSyncSocialitAccounts(params: {
  workspaceId: string;
  brandId?: string;
  bindToBrand?: boolean;
  filterPlatform?: SocialPlatform;
}): Promise<{
  discovered: DiscoveredSocialAccount[];
  connections: SocialConnection[];
  summary: { total: number; synced: number; platforms: Record<string, number> };
}> {
  const { workspaceId, brandId, bindToBrand = false, filterPlatform } = params;

  if (!workspaceId) {
    throw new Error('workspaceId es requerido para aislar multi-tenant las cuentas descubiertas.');
  }

  // 1. Descubrir cuentas reales vía Socialit Client
  const discoveredAccounts = await socialitClient.discoverAccounts(filterPlatform);
  const syncedConnections: SocialConnection[] = [];
  const platformsCount: Record<string, number> = {};

  for (const acc of discoveredAccounts) {
    platformsCount[acc.platform] = (platformsCount[acc.platform] || 0) + 1;

    // 2. Obtener reporte de salud READ-ONLY para esta cuenta de Socialit
    let healthReport: any = null;
    try {
      healthReport = await socialitClient.getSocialAccountHealth(acc.id);
    } catch (e) {
      console.warn(`No se pudo obtener health para cuenta Socialit ${acc.id}:`, e);
    }

    const postingScopes = healthReport?.scopes?.posting
      ? healthReport.scopes.posting.filter((s: any) => s.granted).map((s: any) => s.scope)
      : acc.scopes || [];

    const expiresAt = healthReport?.token?.expires_at || null;

    // 3. Buscar si ya existe la conexión en el workspace (Idempotencia)
    const { data: existing } = await supabase
      .from('social_connections')
      .select(CONNECTION_SELECT_FIELDS)
      .eq('workspace_id', workspaceId)
      .eq('platform', acc.platform)
      .or(`provider_account_id.eq.${acc.id},account_id.eq.${acc.id}`)
      .limit(1);

    const safeMetadata = {
      provider: 'socialit',
      source: 'REAL_SOCIALIT',
      provider_account_id: acc.id,
      can_post: healthReport ? healthReport.can_post : true,
      health_ok: healthReport ? healthReport.ok : true,
      last_health_check: new Date().toISOString(),
      ...(acc.metadata || {}),
    };

    if (existing && existing.length > 0) {
      const existingConn = existing[0];
      // Si ya estaba asignada a una marca, preservar esa asignación a menos que bindToBrand lo cambie
      const targetBrandId = bindToBrand && brandId ? brandId : existingConn.brand_id;

      const { data: updated, error: updateError } = await supabase
        .from('social_connections')
        .update({
          brand_id: targetBrandId,
          provider: 'socialit',
          provider_account_id: acc.id,
          provider_account_name: acc.account_name,
          account_type: acc.account_type,
          account_id: acc.id,
          account_name: acc.account_name,
          account_username: acc.account_username || null,
          avatar_url: acc.avatar_url || null,
          status: 'connected',
          token_expires_at: expiresAt,
          scopes: postingScopes,
          metadata: safeMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConn.id)
        .select(CONNECTION_SELECT_FIELDS)
        .single();

      if (!updateError && updated) {
        syncedConnections.push(sanitizeSocialConnectionForClient(updated as SocialConnection));
      }
    } else {
      // Nueva cuenta descubierta: asignar a brand si bindToBrand=true, o dejar brand_id=null
      const targetBrandId = bindToBrand && brandId ? brandId : null;

      const { data: inserted, error: insertError } = await supabase
        .from('social_connections')
        .insert({
          workspace_id: workspaceId,
          brand_id: targetBrandId,
          platform: acc.platform,
          provider: 'socialit',
          provider_account_id: acc.id,
          provider_account_name: acc.account_name,
          account_type: acc.account_type,
          account_id: acc.id,
          account_name: acc.account_name,
          account_username: acc.account_username || null,
          avatar_url: acc.avatar_url || null,
          status: 'connected',
          token_expires_at: expiresAt,
          scopes: postingScopes,
          metadata: safeMetadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(CONNECTION_SELECT_FIELDS)
        .single();

      if (!insertError && inserted) {
        syncedConnections.push(sanitizeSocialConnectionForClient(inserted as SocialConnection));
      }
    }

    logAuditEvent({
      event: 'social_account_discovered',
      workspace_id: workspaceId,
      brand_id: bindToBrand ? brandId : null,
      platform: acc.platform,
      provider: 'socialit',
      metadata: { account_name: acc.account_name, socialit_id: acc.id },
    });
  }

  return {
    discovered: discoveredAccounts.map(a => ({
      id: a.id,
      platform: a.platform,
      account_type: a.account_type as any,
      account_name: a.account_name,
      username: a.account_username,
      avatar_url: a.avatar_url,
      scopes: a.scopes || [],
      metadata: a.metadata,
    })),
    connections: syncedConnections,
    summary: {
      total: discoveredAccounts.length,
      synced: syncedConnections.length,
      platforms: platformsCount,
    },
  };
}

/**
 * Desconecta una cuenta social, marcando el estado como disconnected sin eliminarla de Socialit.
 */
export async function disconnectSocialConnection(
  connectionId: string,
  platform: SocialPlatform
): Promise<boolean> {
  const { data: conn } = await supabase
    .from('social_connections')
    .select('id, workspace_id, brand_id, provider')
    .eq('id', connectionId)
    .single();

  const { error } = await supabase
    .from('social_connections')
    .update({
      status: 'disconnected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId);

  if (conn) {
    logAuditEvent({
      event: 'social_account_disconnected',
      workspace_id: conn.workspace_id,
      brand_id: conn.brand_id,
      connection_id: connectionId,
      platform,
      provider: conn.provider || 'socialit',
    });
  }

  return !error;
}

/**
 * Diagnostica la salud de una conexión social sin exponer secretos.
 */
export async function validateSocialConnection(
  connectionId: string,
  platform: SocialPlatform
): Promise<ConnectionHealthReport> {
  const conn = await getSocialConnection(connectionId);
  if (conn && conn.provider === 'socialit') {
    return socialitProvider.validateConnection(conn);
  }
  const connector = socialConnectorRegistry.getConnector(platform);
  return connector.validateConnection(connectionId);
}

/**
 * Renueva el token de una conexión social.
 */
export async function refreshSocialConnectionToken(
  connectionId: string,
  platform: SocialPlatform
): Promise<SocialConnection> {
  const connector = socialConnectorRegistry.getConnector(platform);
  const updated = await connector.refreshToken(connectionId);
  return sanitizeSocialConnectionForClient(updated);
}

/**
 * Obtiene o crea la conexión social mock por defecto para una marca y plataforma (preservado para compatibilidad).
 */
export async function getOrCreateMockConnection(
  brandId: string,
  workspaceId: string,
  platform: SocialPlatform,
  brandName?: string
): Promise<SocialConnection> {
  // Buscar si ya existe una conexión para esta marca y plataforma
  const { data: existing } = await supabase
    .from('social_connections')
    .select(CONNECTION_SELECT_FIELDS)
    .eq('brand_id', brandId)
    .eq('platform', platform)
    .in('status', ['mock_connected', 'connected'])
    .limit(1);

  if (existing && existing.length > 0) {
    return sanitizeSocialConnectionForClient(existing[0] as SocialConnection);
  }

  const platformNames: Record<SocialPlatform, string> = {
    instagram: 'Instagram Business',
    facebook: 'Facebook Page',
    tiktok: 'TikTok Creator',
    youtube: 'YouTube Channel',
    linkedin: 'LinkedIn Company Page',
  };

  const handle = brandName 
    ? `@${brandName.toLowerCase().replace(/[^a-z0-9_]/g, '')}` 
    : `@aura_${platform}`;

  const payload = {
    workspace_id: workspaceId,
    brand_id: brandId,
    platform,
    provider: 'socialit',
    provider_account_id: `mock_soc_${platform}_${Date.now().toString(36)}`,
    account_type: platform === 'facebook' ? 'page' : platform === 'instagram' ? 'business_account' : 'channel',
    account_id: `mock_acc_${platform}_${Date.now().toString(36)}`,
    account_name: `${brandName || 'Aura'} - ${platformNames[platform]}`,
    account_username: handle,
    avatar_url: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150`,
    status: 'mock_connected' as const,
    access_token_encrypted: null,
    refresh_token_encrypted: null,
    token_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    scopes: ['read_profile', 'publish_media', 'manage_content'],
    metadata: {
      is_mock: true,
      environment: 'development',
      connected_at: new Date().toISOString(),
    },
  };

  const { data, error } = await supabase
    .from('social_connections')
    .insert(payload)
    .select(CONNECTION_SELECT_FIELDS)
    .single();

  if (error || !data) {
    throw new Error(`Error al crear conexión mock de ${platform}: ${error?.message}`);
  }

  return sanitizeSocialConnectionForClient(data as SocialConnection);
}

/**
 * Actualiza el estado de una conexión social (e.g. revocar o desconectar).
 */
export async function updateSocialConnectionStatus(
  connectionId: string,
  status: SocialConnectionStatus
): Promise<SocialConnection> {
  const { data, error } = await supabase
    .from('social_connections')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select(CONNECTION_SELECT_FIELDS)
    .single();

  if (error || !data) {
    throw new Error(`Error al actualizar estado de conexión ${connectionId}: ${error?.message}`);
  }

  return sanitizeSocialConnectionForClient(data as SocialConnection);
}

/**
 * Elimina una conexión social.
 */
export async function deleteSocialConnection(connectionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('social_connections')
    .delete()
    .eq('id', connectionId);

  if (error) {
    console.error(`Error al eliminar conexión social ${connectionId}:`, error);
    return false;
  }

  return true;
}
