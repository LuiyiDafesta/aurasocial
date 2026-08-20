import { supabase } from '../lib/supabase';
import { SocialAccount } from '../types/socialAccount';

/**
 * Obtiene las cuentas sociales pertenecientes al workspace y brand activos.
 */
export async function getSocialAccounts(
  workspaceId?: string,
  brandId?: string
): Promise<SocialAccount[]> {
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
    throw new Error(`Error al obtener cuentas sociales: ${error.message}`);
  }

  return (data as SocialAccount[]) || [];
}
