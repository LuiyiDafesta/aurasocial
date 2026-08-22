import { supabase } from '../lib/supabase';
import { SocialConnection, SocialConnectionStatus, SocialPlatform } from '../types/publishing';

/**
 * Consulta todas las conexiones sociales de una marca.
 */
export async function getSocialConnections(brandId: string): Promise<SocialConnection[]> {
  if (!brandId) return [];

  const { data, error } = await supabase
    .from('social_connections')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`Error al obtener conexiones sociales para marca ${brandId}:`, error);
    return [];
  }

  return (data as SocialConnection[]) || [];
}

/**
 * Consulta una conexión social específica por ID.
 */
export async function getSocialConnection(connectionId: string): Promise<SocialConnection | null> {
  if (!connectionId) return null;

  const { data, error } = await supabase
    .from('social_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as SocialConnection;
}

/**
 * Obtiene o crea la conexión social mock por defecto para una marca y plataforma.
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
    .select('*')
    .eq('brand_id', brandId)
    .eq('platform', platform)
    .in('status', ['mock_connected', 'connected'])
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0] as SocialConnection;
  }

  // Si no existe, crear conexión mock con datos simulados seguros
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
    account_id: `mock_acc_${platform}_${Date.now().toString(36)}`,
    account_name: `${brandName || 'Aura'} - ${platformNames[platform]}`,
    account_username: handle,
    status: 'mock_connected',
    access_token_encrypted: null,
    refresh_token_encrypted: null,
    token_expires_at: null,
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
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Error al crear conexión mock de ${platform}: ${error?.message}`);
  }

  return data as SocialConnection;
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
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Error al actualizar estado de conexión ${connectionId}: ${error?.message}`);
  }

  return data as SocialConnection;
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
