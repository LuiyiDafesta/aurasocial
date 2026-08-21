import { useState, useEffect, useCallback } from 'react';
import { Workspace, Brand } from '../types/database';
import { getUserWorkspaces, getWorkspaceBrands } from '../services/workspaceService';

const ACTIVE_BRAND_KEY = 'aura_active_brand_id';

export function useWorkspace(isAuthenticated: boolean) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Cargar workspaces y brands del usuario
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
        const activeWs = userWorkspaces[0];
        setCurrentWorkspace(activeWs);

        // Cargar brands del workspace activo
        const wsBrands = await getWorkspaceBrands(activeWs.id);
        setBrands(wsBrands);

        if (wsBrands.length > 0) {
          // Recuperar la última marca activa guardada si existe y es válida
          const savedBrandId = localStorage.getItem(ACTIVE_BRAND_KEY);
          const found = wsBrands.find((b) => b.id === savedBrandId);
          const initialBrand = found || wsBrands[0];
          setCurrentBrand(initialBrand);
          localStorage.setItem(ACTIVE_BRAND_KEY, initialBrand.id);
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

  // Función para conmutar de marca activa con aislamiento total
  const selectBrand = useCallback((brandId: string) => {
    const b = brands.find((brand) => brand.id === brandId);
    if (!b) return;

    setIsSwitchingBrand(true);
    setCurrentBrand(b);
    localStorage.setItem(ACTIVE_BRAND_KEY, b.id);

    setTimeout(() => {
      setIsSwitchingBrand(false);
    }, 150);
  }, [brands]);

  // Recarga solo las marcas (ej. tras crear o editar una marca)
  const refreshBrands = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const wsBrands = await getWorkspaceBrands(currentWorkspace.id);
      setBrands(wsBrands);
      if (currentBrand) {
        const updated = wsBrands.find((b) => b.id === currentBrand.id);
        if (updated) setCurrentBrand(updated);
      }
    } catch (err) {
      console.error('Error al refrescar marcas:', err);
    }
  }, [currentWorkspace, currentBrand]);

  return {
    workspaces,
    currentWorkspace,
    brands,
    currentBrand,
    isLoading,
    isSwitchingBrand,
    error,
    selectBrand,
    refreshBrands,
    refreshWorkspace: loadWorkspaces,
  };
}
