import { supabase } from '../lib/supabase';
import { StatusCounts } from '../types/database';

/**
 * Obtiene los contadores de contenidos por estado en una sola consulta eficiente.
 */
export async function getAggregatedStatusCounts(): Promise<StatusCounts> {
  const { data, error } = await supabase
    .from('content_items')
    .select('status');

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
    all: data.length,
    draft: 0,
    approved: 0,
    scheduled: 0,
    published: 0,
    rejected: 0,
  };

  data.forEach((item: { status: string }) => {
    const s = item.status as keyof Omit<StatusCounts, 'all'>;
    if (counts[s] !== undefined) {
      counts[s]++;
    }
  });

  return counts;
}
