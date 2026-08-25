import { supabase } from '../lib/supabase';
import { ContentIdea, IdeaFilterOptions, PaginatedIdeasResult } from '../types/contentIdea';

const DEFAULT_PAGE_SIZE = 24;

/**
 * Obtiene las ideas de contenido paginadas server-side con filtros y ordenamiento dinámico.
 */
export async function getContentIdeas(options?: IdeaFilterOptions): Promise<PaginatedIdeasResult> {
  const page = options?.page && options.page > 0 ? options.page : 1;
  const pageSize = options?.pageSize && options.pageSize > 0 ? options.pageSize : DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('content_ideas')
    .select('*', { count: 'exact' });

  if (options?.workspaceId) {
    query = query.eq('workspace_id', options.workspaceId);
  }

  if (options?.brandId) {
    query = query.eq('brand_id', options.brandId);
  }

  if (options?.generationRunId) {
    query = query.eq('generation_run_id', options.generationRunId);
  }

  if (options?.campaignId) {
    query = query.eq('campaign_id', options.campaignId);
  }

  if (options?.priority && options.priority !== 'all') {
    query = query.eq('priority', options.priority);
  }

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.pillar && options.pillar !== 'all') {
    query = query.eq('pillar', options.pillar);
  }

  if (options?.format && options.format !== 'all') {
    query = query.ilike('format', `%${options.format}%`);
  }

  if (options?.searchQuery && options.searchQuery.trim()) {
    const search = `%${options.searchQuery.trim()}%`;
    query = query.or(`title.ilike.${search},concept.ilike.${search},objective.ilike.${search},pillar.ilike.${search},hook.ilike.${search}`);
  }

  // Ordenamiento configurable
  switch (options?.sortBy) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'title':
      query = query.order('title', { ascending: true });
      break;
    case 'priority':
      query = query.order('priority', { ascending: true }).order('created_at', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Paginación server-side con range
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error al obtener content_ideas:', error);
    throw new Error(`Error al obtener ideas: ${error.message}`);
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    ideas: (data as ContentIdea[]) || [],
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Obtiene los pilares únicos disponibles en el banco de ideas para la marca activa.
 */
export async function getBrandIdeaPillars(workspaceId?: string | null, brandId?: string | null): Promise<string[]> {
  if (!workspaceId || !brandId) return [];

  const { data, error } = await supabase
    .from('content_ideas')
    .select('pillar')
    .eq('workspace_id', workspaceId)
    .eq('brand_id', brandId);

  if (error) {
    console.error('Error al obtener pilares de ideas:', error);
    return [];
  }

  const pillarsSet = new Set<string>();
  for (const item of (data || [])) {
    if (item.pillar && item.pillar.trim()) {
      pillarsSet.add(item.pillar.trim());
    }
  }

  return Array.from(pillarsSet);
}

/**
 * Elimina una idea de contenido por su ID.
 */
export async function deleteIdea(ideaId: string): Promise<void> {
  if (!ideaId) throw new Error('ideaId es requerido');

  const { error } = await supabase
    .from('content_ideas')
    .delete()
    .eq('id', ideaId);

  if (error) {
    console.error(`Error al eliminar idea (${ideaId}):`, error);
    throw new Error(`Error al eliminar idea: ${error.message}`);
  }
}

/**
 * Elimina múltiples ideas de contenido en lote (Bulk Delete).
 */
export async function deleteIdeasBulk(ideaIds: string[]): Promise<{ deletedCount: number }> {
  if (!ideaIds || ideaIds.length === 0) {
    return { deletedCount: 0 };
  }

  const { error } = await supabase
    .from('content_ideas')
    .delete()
    .in('id', ideaIds);

  if (error) {
    console.error('Error al eliminar ideas en lote:', error);
    throw new Error(`Error al eliminar ideas: ${error.message}`);
  }

  return { deletedCount: ideaIds.length };
}
