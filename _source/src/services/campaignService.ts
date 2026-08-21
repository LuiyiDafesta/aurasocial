import { supabase } from '../lib/supabase';
import { Campaign, CreateCampaignPayload, CampaignStatus } from '../types/campaign';

export interface CampaignFilterOptions {
  brandId: string;
  status?: CampaignStatus | 'all';
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface CampaignSummaryCounts {
  sessions_count: number;
  ideas_count: number;
  contents_count: number;
  assets_count: number;
}

/**
 * Normaliza una fila de public.campaigns a la interfaz Campaign
 */
export function normalizeCampaign(raw: any): Campaign {
  return {
    ...raw,
    kpis: Array.isArray(raw.kpis) ? raw.kpis : [],
    total_ideas: raw.total_ideas ?? 0,
    total_contents: raw.total_contents ?? 0,
    total_generations: raw.total_generations ?? 0,
  };
}

/**
 * Obtiene las campañas de una marca con filtros, paginación y conteos reales.
 */
export async function getCampaigns(options: CampaignFilterOptions): Promise<{
  campaigns: Campaign[];
  totalCount: number;
}> {
  const { brandId, status = 'all', searchQuery, page = 1, pageSize = 20 } = options;
  if (!brandId) return { campaigns: [], totalCount: 0 };

  let query = supabase
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('brand_id', brandId);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (searchQuery && searchQuery.trim()) {
    query = query.or(`name.ilike.%${searchQuery.trim()}%,strategic_objective.ilike.%${searchQuery.trim()}%,strategic_theme.ilike.%${searchQuery.trim()}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error al obtener campañas:', error);
    throw new Error(`Error al cargar campañas: ${error.message}`);
  }

  const rawCampaigns = data || [];
  if (rawCampaigns.length === 0) {
    return { campaigns: [], totalCount: count || 0 };
  }

  // Obtener conteos reales de ideas, contenidos y sesiones para cada campaña
  const campaignIds = rawCampaigns.map((c: any) => c.id);

  // 1. Contar generation_runs por campaña
  const { data: runsCounts } = await supabase
    .from('generation_runs')
    .select('campaign_id')
    .in('campaign_id', campaignIds);

  // 2. Contar content_ideas por campaña
  const { data: ideasCounts } = await supabase
    .from('content_ideas')
    .select('campaign_id')
    .in('campaign_id', campaignIds);

  // 3. Contar content_items por campaña
  const { data: itemsCounts } = await supabase
    .from('content_items')
    .select('campaign_id')
    .in('campaign_id', campaignIds);

  const runsMap: Record<string, number> = {};
  const ideasMap: Record<string, number> = {};
  const itemsMap: Record<string, number> = {};

  (runsCounts || []).forEach((r: any) => {
    if (r.campaign_id) runsMap[r.campaign_id] = (runsMap[r.campaign_id] || 0) + 1;
  });
  (ideasCounts || []).forEach((i: any) => {
    if (i.campaign_id) ideasMap[i.campaign_id] = (ideasMap[i.campaign_id] || 0) + 1;
  });
  (itemsCounts || []).forEach((item: any) => {
    if (item.campaign_id) itemsMap[item.campaign_id] = (itemsMap[item.campaign_id] || 0) + 1;
  });

  const enrichedCampaigns = rawCampaigns.map((raw: any) => {
    const c = normalizeCampaign(raw);
    c.total_generations = runsMap[c.id] || 0;
    c.total_ideas = ideasMap[c.id] || 0;
    c.total_contents = itemsMap[c.id] || 0;
    return c;
  });

  return {
    campaigns: enrichedCampaigns,
    totalCount: count || enrichedCampaigns.length,
  };
}

/**
 * Obtiene una campaña por su ID.
 */
export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  if (!campaignId) return null;

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error) {
    console.error(`Error al obtener campaña (${campaignId}):`, error);
    return null;
  }

  const c = normalizeCampaign(data);

  // Obtener conteos detallados
  const summary = await getCampaignSummaryCounts(campaignId);
  c.total_generations = summary.sessions_count;
  c.total_ideas = summary.ideas_count;
  c.total_contents = summary.contents_count;

  return c;
}

/**
 * Obtiene los conteos agregados reales de una campaña específica.
 */
export async function getCampaignSummaryCounts(campaignId: string): Promise<CampaignSummaryCounts> {
  if (!campaignId) return { sessions_count: 0, ideas_count: 0, contents_count: 0, assets_count: 0 };

  const [runsRes, ideasRes, itemsRes, assetsRes] = await Promise.all([
    supabase.from('generation_runs').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId),
    supabase.from('content_ideas').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId),
    supabase.from('content_assets').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId),
  ]);

  return {
    sessions_count: runsRes.count || 0,
    ideas_count: ideasRes.count || 0,
    contents_count: itemsRes.count || 0,
    assets_count: assetsRes.count || 0,
  };
}

/**
 * Genera un slug limpio y normalizado a partir de un texto.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

/**
 * Crea una nueva campaña en la marca y workspace activos.
 */
export async function createCampaign(
  workspaceId: string,
  payload: CreateCampaignPayload
): Promise<Campaign> {
  if (!workspaceId) throw new Error('workspaceId es requerido');
  if (!payload.brand_id) throw new Error('brand_id es requerido');
  if (!payload.name || !payload.name.trim()) throw new Error('El nombre de la campaña es requerido');
  if (!payload.strategic_objective || !payload.strategic_objective.trim()) {
    throw new Error('El objetivo estratégico es requerido');
  }

  const slug = payload.slug?.trim() ? generateSlug(payload.slug) : generateSlug(payload.name);
  if (!slug) throw new Error('El slug de la campaña es inválido');

  const insertPayload = {
    workspace_id: workspaceId,
    brand_id: payload.brand_id,
    name: payload.name.trim(),
    slug,
    description: payload.description?.trim() || null,
    strategic_objective: payload.strategic_objective.trim(),
    strategic_theme: payload.strategic_theme?.trim() || null,
    target_audience: payload.target_audience?.trim() || null,
    primary_channel: payload.primary_channel?.trim() || null,
    budget_context: payload.budget_context?.trim() || null,
    kpis: payload.kpis || [],
    status: payload.status || 'draft',
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };

  const { data, error } = await supabase
    .from('campaigns')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('uq_campaigns_brand_slug')) {
      throw new Error(`Ya existe una campaña con el slug "${slug}" para esta marca. Por favor elige otro nombre o slug.`);
    }
    console.error('Error al crear campaña:', error);
    throw new Error(`Error al crear la campaña: ${error.message}`);
  }

  return normalizeCampaign(data);
}

/**
 * Actualiza una campaña existente.
 */
export async function updateCampaign(
  campaignId: string,
  payload: Partial<CreateCampaignPayload>
): Promise<Campaign> {
  if (!campaignId) throw new Error('campaignId es requerido');

  const updateBody: any = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) updateBody.name = payload.name.trim();
  if (payload.slug !== undefined) updateBody.slug = generateSlug(payload.slug);
  if (payload.description !== undefined) updateBody.description = payload.description?.trim() || null;
  if (payload.strategic_objective !== undefined) updateBody.strategic_objective = payload.strategic_objective.trim();
  if (payload.strategic_theme !== undefined) updateBody.strategic_theme = payload.strategic_theme?.trim() || null;
  if (payload.target_audience !== undefined) updateBody.target_audience = payload.target_audience?.trim() || null;
  if (payload.primary_channel !== undefined) updateBody.primary_channel = payload.primary_channel?.trim() || null;
  if (payload.budget_context !== undefined) updateBody.budget_context = payload.budget_context?.trim() || null;
  if (payload.kpis !== undefined) updateBody.kpis = payload.kpis;
  if (payload.status !== undefined) updateBody.status = payload.status;
  if (payload.start_date !== undefined) updateBody.start_date = payload.start_date || null;
  if (payload.end_date !== undefined) updateBody.end_date = payload.end_date || null;

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateBody)
    .eq('id', campaignId)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('uq_campaigns_brand_slug')) {
      throw new Error(`El slug "${updateBody.slug}" ya está en uso por otra campaña de esta marca.`);
    }
    console.error('Error al actualizar campaña:', error);
    throw new Error(`Error al actualizar la campaña: ${error.message}`);
  }

  return normalizeCampaign(data);
}

/**
 * Cambia el estado de una campaña a archivada.
 */
export async function archiveCampaign(campaignId: string): Promise<Campaign> {
  return updateCampaign(campaignId, { status: 'archived' });
}
