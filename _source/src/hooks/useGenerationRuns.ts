import { useState, useEffect, useCallback } from 'react';
import { GenerationRun } from '../types/generationRun';
import { getWorkspaceGenerationRuns } from '../services/generationService';

interface UseGenerationRunsOptions {
  workspaceId?: string | null;
  brandId?: string | null;
  page?: number;
  pageSize?: number;
}

export function useGenerationRuns({
  workspaceId,
  brandId,
  page = 1,
  pageSize = 12,
}: UseGenerationRunsOptions) {
  const [runs, setRuns] = useState<GenerationRun[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!workspaceId || !brandId) {
      setRuns([]);
      setTotalCount(0);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await getWorkspaceGenerationRuns(workspaceId, brandId, page, pageSize);
      setRuns(result.runs);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      console.error('Error al cargar historial de generaciones:', err);
      setError(err.message || 'Error al obtener historial de generaciones');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, brandId, page, pageSize]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return {
    runs,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    isLoading,
    error,
    refreshRuns: fetchRuns,
  };
}
