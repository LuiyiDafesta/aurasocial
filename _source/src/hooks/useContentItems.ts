import { useState, useEffect, useCallback } from 'react';
import { ContentItem, ContentFilterOptions } from '../types/contentItem';
import { getContentItems } from '../services/contentItemsService';

export function useContentItems(filters?: ContentFilterOptions) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getContentItems(filters);
      setItems(data);
    } catch (err: any) {
      console.error('Error al cargar lista de contenidos:', err);
      setError(err.message || 'Error al conectar con la base de datos');
    } finally {
      setIsLoading(false);
    }
  }, [filters?.status, filters?.platform, filters?.searchQuery]);

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
