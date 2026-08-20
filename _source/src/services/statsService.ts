import { supabase } from '../lib/supabase';
import { StatusCounts } from '../types/database';

/**
 * Obtiene los contadores de contenidos por estado filtrados por workspace y brand.
 */
export async function getAggregatedStatusCounts(
  workspaceId?: string,
  brandId?: string
): Promise<StatusCounts> {
  let query = supabase.from('content_items').select('status');

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  if (brandId) {
    query = query.eq('brand_id', brandId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error al obtener contadores de estado:', error);
    return {
      all: 0,
      draft: 0,
      approved: 0,
      scheduled: 0,
      published: 0,
      rejected: 0,
    };
  }

  const counts: StatusCounts = {
    all: data?.length || 0,
    draft: 0,
    approved: 0,
    scheduled: 0,
    published: 0,
    rejected: 0,
  };

  data?.forEach((item: { status: string }) => {
    const s = item.status as keyof Omit<StatusCounts, 'all'>;
    if (counts[s] !== undefined) {
      counts[s]++;
    }
  });

  return counts;
}
