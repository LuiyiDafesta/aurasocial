import { useState, useEffect, useCallback } from 'react';
import { Campaign, CampaignStatus } from '../types/campaign';
import { getCampaigns } from '../services/campaignService';

export function useCampaigns(brandId?: string | null) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!brandId) {
      setCampaigns([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await getCampaigns({
        brandId,
        status: statusFilter,
        searchQuery,
        page,
        pageSize,
      });
      setCampaigns(res.campaigns);
      setTotalCount(res.totalCount);
    } catch (err: any) {
      console.error('Error en useCampaigns:', err);
      setError(err.message || 'Error al cargar campañas');
    } finally {
      setIsLoading(false);
    }
  }, [brandId, statusFilter, searchQuery, page, pageSize]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Resetear página al cambiar filtros
  const handleStatusChange = (status: CampaignStatus | 'all') => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  return {
    campaigns,
    statusFilter,
    searchQuery,
    page,
    pageSize,
    totalCount,
    isLoading,
    error,
    setStatusFilter: handleStatusChange,
    setSearchQuery: handleSearchChange,
    setPage,
    refreshCampaigns: fetchCampaigns,
  };
}
