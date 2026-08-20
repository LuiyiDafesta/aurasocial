import { useState, useEffect, useCallback } from 'react';
import { ContentIdea, IdeaFilterOptions } from '../types/contentIdea';
import { getContentIdeas } from '../services/ideasService';

export function useIdeas(options?: IdeaFilterOptions) {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    if (!options?.workspaceId || !options?.brandId) {
      setIdeas([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getContentIdeas(options);
      setIdeas(data);
    } catch (err: any) {
      console.error('Error al cargar ideas:', err);
      setError(err.message || 'Error al obtener banco de ideas');
    } finally {
      setIsLoading(false);
    }
  }, [
    options?.workspaceId,
    options?.brandId,
    options?.priority,
    options?.status,
    options?.pillar,
    options?.searchQuery,
  ]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  return {
    ideas,
    isLoading,
    error,
    refreshIdeas: fetchIdeas,
  };
}
