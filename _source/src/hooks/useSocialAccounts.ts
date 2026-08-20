import { useState, useEffect, useCallback } from 'react';
import { SocialAccount } from '../types/socialAccount';
import { getSocialAccounts } from '../services/socialAccountsService';

export function useSocialAccounts(workspaceId?: string | null, brandId?: string | null) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!workspaceId) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getSocialAccounts(workspaceId, brandId || undefined);
      setAccounts(data);
    } catch (err: any) {
      console.error('Error al cargar cuentas sociales:', err);
      setError(err.message || 'Error al obtener cuentas sociales');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, brandId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const activeCount = accounts.filter((a) => a.is_connected && a.is_enabled).length;

  return {
    accounts,
    activeCount,
    isLoading,
    error,
    refreshAccounts: fetchAccounts,
  };
}
