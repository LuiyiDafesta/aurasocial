import { useState, useEffect, useCallback } from 'react';
import { ContentIdea, IdeaFilterOptions } from '../types/contentIdea';
import { getContentIdeas } from '../services/ideasService';

export function useIdeas(options?: IdeaFilterOptions) {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentPage = options?.page || 1;
  const pageSize = options?.pageSize || 24;

  const fetchIdeas = useCallback(async () => {
    if (!options?.workspaceId || !options?.brandId) {
      setIdeas([]);
      setTotalCount(0);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await getContentIdeas(options);
      setIdeas(result.ideas);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      console.error('Error al cargar ideas:', err);
      setError(err.message || 'Error al obtener banco de ideas');
    } finally {
      setIsLoading(false);
    }
  }, [
    options?.workspaceId,
    options?.brandId,
    options?.generationRunId,
    options?.priority,
    options?.status,
    options?.pillar,
    options?.format,
    options?.searchQuery,
    options?.sortBy,
    options?.page,
    options?.pageSize,
  ]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  return {
    ideas,
    totalCount,
    page: currentPage,
    pageSize,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    isLoading,
    error,
    refreshIdeas: fetchIdeas,
  };
}
