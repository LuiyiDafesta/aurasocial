import { useState, useEffect, useCallback } from 'react';
import { Workspace, Brand } from '../types/database';
import { getUserWorkspaces, getWorkspaceBrands } from '../services/workspaceService';

export function useWorkspace(isAuthenticated: boolean) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Cargar workspaces del usuario
  const loadWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setBrands([]);
      setCurrentBrand(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const userWorkspaces = await getUserWorkspaces();
      setWorkspaces(userWorkspaces);

      if (userWorkspaces.length > 0) {
        // Por defecto seleccionamos el primer workspace disponible
        const activeWs = userWorkspaces[0];
        setCurrentWorkspace(activeWs);

        // 2. Cargar brands del workspace activo
        const wsBrands = await getWorkspaceBrands(activeWs.id);
        setBrands(wsBrands);

        if (wsBrands.length > 0) {
          // Por defecto seleccionamos la primera brand disponible
          setCurrentBrand(wsBrands[0]);
        } else {
          setCurrentBrand(null);
        }
      } else {
        setCurrentWorkspace(null);
        setBrands([]);
        setCurrentBrand(null);
      }
    } catch (err: any) {
      console.error('Error en useWorkspace:', err);
      setError(err.message || 'Error al cargar workspace');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Función para cambiar manualmente de workspace (preparado para multi-workspace)
  const selectWorkspace = useCallback(async (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;

    setCurrentWorkspace(ws);
    try {
      const wsBrands = await getWorkspaceBrands(ws.id);
      setBrands(wsBrands);
      setCurrentBrand(wsBrands.length > 0 ? wsBrands[0] : null);
    } catch (err: any) {
      console.error('Error al cambiar workspace:', err);
    }
  }, [workspaces]);

  // Función para cambiar manualmente de brand (preparado para multi-brand)
  const selectBrand = useCallback((brandId: string) => {
    const b = brands.find((brand) => brand.id === brandId);
    if (b) setCurrentBrand(b);
  }, [brands]);

  return {
    workspaces,
    currentWorkspace,
    brands,
    currentBrand,
    isLoading,
    error,
    selectWorkspace,
    selectBrand,
    refreshWorkspace: loadWorkspaces,
  };
}
