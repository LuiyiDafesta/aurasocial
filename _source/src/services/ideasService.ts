import { supabase } from '../lib/supabase';
import { ContentIdea, IdeaFilterOptions } from '../types/contentIdea';

/**
 * Obtiene las ideas de contenido de la marca y workspace activos con filtros opcionales.
 */
export async function getContentIdeas(options?: IdeaFilterOptions): Promise<ContentIdea[]> {
  let query = supabase
    .from('content_ideas')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.workspaceId) {
    query = query.eq('workspace_id', options.workspaceId);
  }

  if (options?.brandId) {
    query = query.eq('brand_id', options.brandId);
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

  if (options?.searchQuery && options.searchQuery.trim()) {
    const search = `%${options.searchQuery.trim()}%`;
    query = query.or(`title.ilike.${search},concept.ilike.${search},objective.ilike.${search},pillar.ilike.${search}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error al obtener content_ideas:', error);
    throw new Error(`Error al obtener ideas: ${error.message}`);
  }

  return (data as ContentIdea[]) || [];
}
