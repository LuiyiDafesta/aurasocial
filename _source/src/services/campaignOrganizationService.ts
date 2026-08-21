import { supabase } from '../lib/supabase';
import { ContentIdea } from '../types/contentIdea';
import { ContentItem } from '../types/contentItem';

/**
 * Asigna una idea a una campaña específica invocando la RPC segura assign_idea_to_campaign.
 */
export async function assignIdeaToCampaign(ideaId: string, campaignId: string): Promise<void> {
  if (!ideaId) throw new Error('ideaId es requerido');
  if (!campaignId) throw new Error('campaignId es requerido');

  const { error } = await supabase.rpc('assign_idea_to_campaign', {
    p_idea_id: ideaId,
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error(`Error en assignIdeaToCampaign (${ideaId} -> ${campaignId}):`, error);
    throw new Error(`Error al asignar idea a campaña: ${error.message}`);
  }
}

/**
 * Quita una idea de su campaña actual convirtiéndola en Evergreen (campaign_id = NULL).
 */
export async function removeIdeaFromCampaign(ideaId: string): Promise<void> {
  if (!ideaId) throw new Error('ideaId es requerido');

  const { error } = await supabase.rpc('assign_idea_to_campaign', {
    p_idea_id: ideaId,
    p_campaign_id: null,
  });

  if (error) {
    console.error(`Error en removeIdeaFromCampaign (${ideaId}):`, error);
    throw new Error(`Error al quitar idea de campaña: ${error.message}`);
  }
}

/**
 * Mueve una idea de su campaña actual a otra campaña de la misma marca.
 */
export async function moveIdeaToCampaign(ideaId: string, targetCampaignId: string): Promise<void> {
  return assignIdeaToCampaign(ideaId, targetCampaignId);
}

/**
 * Asigna un content_item a una campaña específica invocando la RPC assign_content_to_campaign.
 */
export async function assignContentToCampaign(contentItemId: string, campaignId: string): Promise<void> {
  if (!contentItemId) throw new Error('contentItemId es requerido');
  if (!campaignId) throw new Error('campaignId es requerido');

  const { error } = await supabase.rpc('assign_content_to_campaign', {
    p_content_item_id: contentItemId,
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error(`Error en assignContentToCampaign (${contentItemId} -> ${campaignId}):`, error);
    throw new Error(`Error al asignar contenido a campaña: ${error.message}`);
  }
}

/**
 * Quita un content_item de su campaña actual convirtiéndolo en Evergreen (campaign_id = NULL).
 */
export async function removeContentFromCampaign(contentItemId: string): Promise<void> {
  if (!contentItemId) throw new Error('contentItemId es requerido');

  const { error } = await supabase.rpc('assign_content_to_campaign', {
    p_content_item_id: contentItemId,
    p_campaign_id: null,
  });

  if (error) {
    console.error(`Error en removeContentFromCampaign (${contentItemId}):`, error);
    throw new Error(`Error al quitar contenido de campaña: ${error.message}`);
  }
}

/**
 * Mueve un content_item de su campaña actual a otra campaña de la misma marca.
 */
export async function moveContentToCampaign(contentItemId: string, targetCampaignId: string): Promise<void> {
  return assignContentToCampaign(contentItemId, targetCampaignId);
}

/**
 * Asigna un array de ideas a una campaña de manera atómica (bulk).
 */
export async function bulkAssignIdeasToCampaign(ideaIds: string[], campaignId: string | null): Promise<void> {
  if (!ideaIds || ideaIds.length === 0) return;

  const { error } = await supabase.rpc('bulk_assign_ideas_to_campaign', {
    p_idea_ids: ideaIds,
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error('Error en bulkAssignIdeasToCampaign:', error);
    throw new Error(`Error al asignar ideas masivamente: ${error.message}`);
  }
}

/**
 * Asigna un array de contenidos a una campaña de manera atómica (bulk).
 */
export async function bulkAssignContentsToCampaign(contentItemIds: string[], campaignId: string | null): Promise<void> {
  if (!contentItemIds || contentItemIds.length === 0) return;

  const { error } = await supabase.rpc('bulk_assign_contents_to_campaign', {
    p_content_ids: contentItemIds,
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error('Error en bulkAssignContentsToCampaign:', error);
    throw new Error(`Error al asignar contenidos masivamente: ${error.message}`);
  }
}

export interface GetAvailableIdeasParams {
  brandId: string;
  excludeCampaignId?: string | null;
  search?: string;
  pillar?: string;
  format?: string;
  page?: number;
  limit?: number;
}

/**
 * Consulta ideas de la marca para el modal de asignación (con paginación y filtros).
 */
export async function getAvailableIdeasForCampaign({
  brandId,
  excludeCampaignId,
  search,
  pillar,
  format,
  page = 1,
  limit = 20,
}: GetAvailableIdeasParams): Promise<{ data: (ContentIdea & { campaigns?: { id: string; name: string } | null })[]; total: number }> {
  if (!brandId) return { data: [], total: 0 };

  let query = supabase
    .from('content_ideas')
    .select('*, campaigns:campaign_id ( id, name )', { count: 'exact' })
    .eq('brand_id', brandId);

  if (excludeCampaignId) {
    query = query.or(`campaign_id.is.null,campaign_id.neq.${excludeCampaignId}`);
  }

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`title.ilike.%${term}%,concept.ilike.%${term}%,hook.ilike.%${term}%`);
  }

  if (pillar && pillar !== 'all') {
    query = query.eq('pillar', pillar);
  }

  if (format && format !== 'all') {
    query = query.eq('format', format);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error al consultar ideas disponibles para campaña:', error);
    throw new Error(`Error al cargar ideas: ${error.message}`);
  }

  return {
    data: (data || []) as unknown as (ContentIdea & { campaigns?: { id: string; name: string } | null })[],
    total: count || 0,
  };
}

export interface GetAvailableContentsParams {
  brandId: string;
  excludeCampaignId?: string | null;
  search?: string;
  platform?: string;
  contentType?: string;
  page?: number;
  limit?: number;
}

/**
 * Consulta contenidos de la marca para el modal de asignación (con paginación y filtros).
 */
export async function getAvailableContentsForCampaign({
  brandId,
  excludeCampaignId,
  search,
  platform,
  contentType,
  page = 1,
  limit = 20,
}: GetAvailableContentsParams): Promise<{ data: (ContentItem & { campaigns?: { id: string; name: string } | null })[]; total: number }> {
  if (!brandId) return { data: [], total: 0 };

  let query = supabase
    .from('content_items')
    .select('*, campaigns:campaign_id ( id, name ), social_accounts ( account_name, platform )', { count: 'exact' })
    .eq('brand_id', brandId);

  if (excludeCampaignId) {
    query = query.or(`campaign_id.is.null,campaign_id.neq.${excludeCampaignId}`);
  }

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`title.ilike.%${term}%,hook.ilike.%${term}%,caption.ilike.%${term}%`);
  }

  if (platform && platform !== 'all') {
    query = query.eq('platform', platform);
  }

  if (contentType && contentType !== 'all') {
    query = query.eq('content_type', contentType);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error al consultar contenidos disponibles para campaña:', error);
    throw new Error(`Error al cargar contenidos: ${error.message}`);
  }

  return {
    data: (data || []) as unknown as (ContentItem & { campaigns?: { id: string; name: string } | null })[],
    total: count || 0,
  };
}
