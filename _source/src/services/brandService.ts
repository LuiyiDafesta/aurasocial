import { supabase } from '../lib/supabase';
import { Brand } from '../types/database';

/**
 * Obtiene todas las marcas activas del workspace actual.
 */
export async function getWorkspaceBrands(workspaceId: string): Promise<Brand[]> {
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error al obtener marcas del workspace:', error);
    throw new Error(`Error al cargar marcas: ${error.message}`);
  }

  return (data as Brand[]) || [];
}

/**
 * Obtiene una marca específica por su ID.
 */
export async function getBrandById(brandId: string): Promise<Brand | null> {
  if (!brandId) return null;

  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  if (error) {
    console.error(`Error al obtener marca (${brandId}):`, error);
    return null;
  }

  return data as Brand;
}

/**
 * Crea una nueva marca en el workspace con su perfil estratégico de Brand Brain.
 */
export async function createBrand(
  workspaceId: string,
  brandData: Partial<Brand>
): Promise<Brand> {
  if (!workspaceId) throw new Error('workspaceId es requerido');
  if (!brandData.name || !brandData.name.trim()) throw new Error('El nombre de la marca es requerido');

  const insertPayload = {
    workspace_id: workspaceId,
    name: brandData.name.trim(),
    description: brandData.description || null,
    audience: brandData.audience || null,
    tone: brandData.tone || null,
    objectives: brandData.objectives || [],
    rules: brandData.rules || [],
    content_pillars: brandData.content_pillars || [],
  };

  const { data, error } = await supabase
    .from('brands')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('Error al crear marca:', error);
    throw new Error(`Error al crear la marca: ${error.message}`);
  }

  return data as Brand;
}

/**
 * Actualiza el perfil estratégico del Brand Brain de una marca existente.
 */
export async function updateBrand(
  brandId: string,
  brandData: Partial<Brand>
): Promise<Brand> {
  if (!brandId) throw new Error('brandId es requerido');

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (brandData.name !== undefined) updatePayload.name = brandData.name.trim();
  if (brandData.description !== undefined) updatePayload.description = brandData.description;
  if (brandData.audience !== undefined) updatePayload.audience = brandData.audience;
  if (brandData.tone !== undefined) updatePayload.tone = brandData.tone;
  if (brandData.objectives !== undefined) updatePayload.objectives = brandData.objectives;
  if (brandData.rules !== undefined) updatePayload.rules = brandData.rules;
  if (brandData.content_pillars !== undefined) updatePayload.content_pillars = brandData.content_pillars;

  const { data, error } = await supabase
    .from('brands')
    .update(updatePayload)
    .eq('id', brandId)
    .select('*')
    .single();

  if (error) {
    console.error(`Error al actualizar marca (${brandId}):`, error);
    throw new Error(`Error al actualizar la marca: ${error.message}`);
  }

  return data as Brand;
}
