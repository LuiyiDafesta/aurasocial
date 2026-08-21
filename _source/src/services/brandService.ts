import { supabase } from '../lib/supabase';
import { Brand } from '../types/database';

export interface BrandBrainPayload {
  name: string;
  industry?: string;
  subindustry?: string;
  market_geo?: string;
  business_model?: string;
  description?: string;
  value_proposition?: string;
  audience?: string;
  pains?: string[];
  desires?: string[];
  objections?: string[];
  differentiators?: string[];
  tone?: string;
  personality?: string;
  words_to_use?: string[];
  words_to_avoid?: string[];
  content_pillars?: string[];
  objectives?: string[];
  rules?: string[];
  limits?: string[];
  legal_restrictions?: string[];
}

/**
 * Normaliza una fila de base de datos a un objeto Brand con Brand Brain completo.
 */
export function normalizeBrand(raw: any): Brand {
  if (!raw) return raw;

  let rulesObj: any = {};
  let rawRules = raw.rules;
  let standardRules: string[] = [];

  if (Array.isArray(rawRules)) {
    standardRules = rawRules;
  } else if (rawRules && typeof rawRules === 'object') {
    rulesObj = rawRules;
    standardRules = Array.isArray(rulesObj.rules) ? rulesObj.rules : [];
  }

  return {
    ...raw,
    industry: rulesObj.industry || raw.industry || 'General',
    subindustry: rulesObj.subindustry || raw.subindustry || null,
    country: rulesObj.market_geo || raw.country || null,
    rules: standardRules,
    content_pillars: Array.isArray(raw.content_pillars) ? raw.content_pillars : [],
    objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
    business_profile: {
      value_proposition: rulesObj.value_proposition || '',
      differentiators: rulesObj.differentiators || [],
    },
    audience_profile: {
      pains: rulesObj.pains || [],
      desires: rulesObj.desires || [],
      objections: rulesObj.objections || [],
    },
    voice_profile: {
      personality: rulesObj.personality || '',
      words_to_use: rulesObj.words_to_use || [],
      words_to_avoid: rulesObj.words_to_avoid || [],
      rules: standardRules,
    },
    strategic_limits: {
      rules: standardRules,
      limits: rulesObj.limits || [],
      legal_restrictions: rulesObj.legal_restrictions || [],
    } as any,
  };
}

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

  return (data || []).map(normalizeBrand);
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

  return normalizeBrand(data);
}

/**
 * Empaqueta un payload de Brand Brain en la estructura compatible de public.brands.
 */
function packBrandBrainPayload(workspaceId: string, payload: BrandBrainPayload) {
  const structuredRules = {
    industry: payload.industry || 'General',
    subindustry: payload.subindustry || '',
    market_geo: payload.market_geo || '',
    business_model: payload.business_model || 'B2C',
    value_proposition: payload.value_proposition || '',
    pains: payload.pains || [],
    desires: payload.desires || [],
    objections: payload.objections || [],
    differentiators: payload.differentiators || [],
    personality: payload.personality || '',
    words_to_use: payload.words_to_use || [],
    words_to_avoid: payload.words_to_avoid || [],
    rules: payload.rules || [],
    limits: payload.limits || [],
    legal_restrictions: payload.legal_restrictions || [],
  };

  return {
    workspace_id: workspaceId,
    name: payload.name.trim(),
    description: payload.description || null,
    audience: payload.audience || null,
    tone: payload.tone || null,
    objectives: payload.objectives || [],
    content_pillars: payload.content_pillars || [],
    rules: structuredRules,
  };
}

/**
 * Crea una nueva marca en el workspace con su perfil estratégico de Brand Brain.
 */
export async function createBrand(
  workspaceId: string,
  brandData: BrandBrainPayload
): Promise<Brand> {
  if (!workspaceId) throw new Error('workspaceId es requerido');
  if (!brandData.name || !brandData.name.trim()) throw new Error('El nombre de la marca es requerido');

  const insertPayload = packBrandBrainPayload(workspaceId, brandData);

  const { data, error } = await supabase
    .from('brands')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('Error al crear marca:', error);
    throw new Error(`Error al crear la marca: ${error.message}`);
  }

  return normalizeBrand(data);
}

/**
 * Actualiza el perfil estratégico del Brand Brain de una marca existente.
 */
export async function updateBrand(
  brandId: string,
  brandData: Partial<BrandBrainPayload>
): Promise<Brand> {
  if (!brandId) throw new Error('brandId es requerido');

  const { data: current, error: getErr } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  if (getErr) throw getErr;

  const currentBrand = normalizeBrand(current);

  const mergedPayload: BrandBrainPayload = {
    name: brandData.name !== undefined ? brandData.name : currentBrand.name,
    industry: brandData.industry !== undefined ? brandData.industry : currentBrand.industry || 'General',
    subindustry: brandData.subindustry !== undefined ? brandData.subindustry : currentBrand.subindustry || '',
    market_geo: brandData.market_geo !== undefined ? brandData.market_geo : currentBrand.country || '',
    business_model: brandData.business_model !== undefined ? brandData.business_model : 'B2C',
    description: brandData.description !== undefined ? brandData.description : currentBrand.description || '',
    value_proposition: brandData.value_proposition !== undefined ? brandData.value_proposition : currentBrand.business_profile?.value_proposition || '',
    audience: brandData.audience !== undefined ? brandData.audience : currentBrand.audience || '',
    pains: brandData.pains !== undefined ? brandData.pains : currentBrand.audience_profile?.pains || [],
    desires: brandData.desires !== undefined ? brandData.desires : currentBrand.audience_profile?.desires || [],
    objections: brandData.objections !== undefined ? brandData.objections : currentBrand.audience_profile?.objections || [],
    differentiators: brandData.differentiators !== undefined ? brandData.differentiators : currentBrand.business_profile?.differentiators || [],
    tone: brandData.tone !== undefined ? brandData.tone : currentBrand.tone || '',
    personality: brandData.personality !== undefined ? brandData.personality : currentBrand.voice_profile?.personality || '',
    words_to_use: brandData.words_to_use !== undefined ? brandData.words_to_use : currentBrand.voice_profile?.words_to_use || [],
    words_to_avoid: brandData.words_to_avoid !== undefined ? brandData.words_to_avoid : currentBrand.voice_profile?.words_to_avoid || [],
    content_pillars: brandData.content_pillars !== undefined ? brandData.content_pillars : currentBrand.content_pillars || [],
    objectives: brandData.objectives !== undefined ? brandData.objectives : currentBrand.objectives || [],
    rules: brandData.rules !== undefined ? brandData.rules : currentBrand.rules || [],
    limits: brandData.limits !== undefined ? brandData.limits : (currentBrand.strategic_limits as any)?.limits || [],
    legal_restrictions: brandData.legal_restrictions !== undefined ? brandData.legal_restrictions : (currentBrand.strategic_limits as any)?.legal_restrictions || [],
  };

  const updatePayload = packBrandBrainPayload(current.workspace_id, mergedPayload);

  const { data, error } = await supabase
    .from('brands')
    .update({
      ...updatePayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandId)
    .select('*')
    .single();

  if (error) {
    console.error(`Error al actualizar marca (${brandId}):`, error);
    throw new Error(`Error al actualizar la marca: ${error.message}`);
  }

  return normalizeBrand(data);
}
