import { useState, useEffect, useCallback } from 'react';
import { StatusCounts } from '../types/database';
import { getAggregatedStatusCounts } from '../services/statsService';

const initialCounts: StatusCounts = {
  all: 0,
  draft: 0,
  approved: 0,
  scheduled: 0,
  published: 0,
  rejected: 0,
};

export function useContentStats(workspaceId?: string | null, brandId?: string | null) {
  const [stats, setStats] = useState<StatusCounts>(initialCounts);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStats = useCallback(async () => {
    if (!workspaceId) {
      setStats(initialCounts);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getAggregatedStatusCounts(workspaceId, brandId || undefined);
      setStats(data);
    } catch (err) {
      console.error('Error al cargar estadísticas de contenido:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, brandId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    refreshStats: fetchStats,
  };
}
