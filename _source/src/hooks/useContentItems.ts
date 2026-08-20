import { useState, useEffect, useCallback } from 'react';
import { ContentItem, ContentFilterOptions } from '../types/contentItem';
import { getContentItems } from '../services/contentItemsService';

interface UseContentItemsOptions extends ContentFilterOptions {
  workspaceId?: string | null;
  brandId?: string | null;
}

export function useContentItems(options?: UseContentItemsOptions) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!options?.workspaceId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getContentItems({
        status: options.status,
        platform: options.platform,
        searchQuery: options.searchQuery,
        workspaceId: options.workspaceId,
        brandId: options.brandId || undefined,
      });
      setItems(data);
    } catch (err: any) {
      console.error('Error al cargar lista de contenidos:', err);
      setError(err.message || 'Error al conectar con la base de datos');
    } finally {
      setIsLoading(false);
    }
  }, [options?.workspaceId, options?.brandId, options?.status, options?.platform, options?.searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    refreshItems: fetchItems,
  };
}
