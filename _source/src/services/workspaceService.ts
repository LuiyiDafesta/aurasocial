import { supabase } from '../lib/supabase';
import { Workspace, Brand } from '../types/database';

/**
 * Obtiene todos los workspaces a los que tiene acceso el usuario autenticado.
 */
export async function getUserWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error en getUserWorkspaces:', error);
    throw new Error(`Error al obtener workspaces: ${error.message}`);
  }

  return (data as Workspace[]) || [];
}

/**
 * Obtiene las marcas (brands) pertenecientes a un workspace específico.
 */
export async function getWorkspaceBrands(workspaceId: string): Promise<Brand[]> {
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('brands')
    .select('id, workspace_id, name, description, audience, tone, objectives, rules, content_pillars, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`Error en getWorkspaceBrands (${workspaceId}):`, error);
    throw new Error(`Error al obtener brands: ${error.message}`);
  }

  return (data as Brand[]) || [];
}
