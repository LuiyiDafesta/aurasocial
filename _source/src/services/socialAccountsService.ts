import { supabase } from '../lib/supabase';
import { SocialAccount } from '../types/socialAccount';

/**
 * Obtiene las cuentas sociales pertenecientes al workspace y brand activos,
 * unificando con la tabla principal social_connections.
 */
export async function getSocialAccounts(
  workspaceId?: string,
  brandId?: string
): Promise<SocialAccount[]> {
  if (!workspaceId) return [];

  // 1. Consultar social_connections (tabla autoritativa del sistema de canales)
  let connQuery = supabase
    .from('social_connections')
    .select('id, workspace_id, brand_id, platform, account_name, account_username, avatar_url, status, metadata, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .neq('status', 'disconnected')
    .order('created_at', { ascending: true });

  if (brandId) {
    connQuery = connQuery.eq('brand_id', brandId);
  }

  const { data: conns, error: connError } = await connQuery;

  if (!connError && conns) {
    return conns.map((c) => ({
      id: c.id,
      workspace_id: c.workspace_id,
      brand_id: c.brand_id || '',
      provider_connection_id: c.id,
      platform: c.platform,
      account_name: c.account_name || 'Cuenta vinculada',
      username: c.account_username || null,
      external_account_id: null,
      is_connected: c.status === 'connected' || c.status === 'mock_connected',
      is_enabled: c.status !== 'disconnected',
      publishing_enabled: c.status === 'connected' || c.status === 'mock_connected',
      metadata: {
        ...(c.metadata || {}),
        avatar_url: c.avatar_url || c.metadata?.avatar_url,
      },
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  }

  // Fallback a social_accounts si no hay registros en social_connections
  let query = supabase
    .from('social_accounts')
    .select('id, workspace_id, brand_id, provider_connection_id, platform, account_name, username, external_account_id, is_connected, is_enabled, publishing_enabled, metadata, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  if (brandId) {
    query = query.eq('brand_id', brandId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error en getSocialAccounts:', error);
    return [];
  }

  return (data as SocialAccount[]) || [];
}
