import { supabase } from '../lib/supabase';
import { ContentItem, Scene } from '../types/contentItem';
import { ContentAsset } from '../types/contentAsset';
import { 
  MediaSlot, 
  MediaSlotType, 
  MediaSlotStatus, 
  SourcePreference, 
  CandidateAssetScore, 
  MediaSlotResolution,
  ResolutionMethod,
  SceneReadiness,
  ContentMediaReadiness
} from '../types/mediaSlot';
import { extractMediaSlotsFromScenes } from './mediaSlotService';

export const RESOLVER_VERSION = '9b2';
export const SCORE_THRESHOLD = 80;
export const TIE_DIFFERENCE_THRESHOLD = 5;

/**
 * Matriz estricta de compatibilidad entre MediaSlotType y ContentAsset.asset_type
 */
export const TYPE_COMPATIBILITY_MAP: Record<MediaSlotType, string[]> = {
  video: ['video', 'b_roll', 'raw_footage'],
  image: ['image', 'thumbnail'],
  logo: ['logo'],
  audio: ['audio'],
  b_roll: ['b_roll', 'video', 'raw_footage'],
  background: ['image', 'video'],
  thumbnail: ['thumbnail', 'image'],
};

/**
 * Palabras irrelevantes (stop words) para el análisis semántico de coincidencia
 */
const STOP_WORDS = new Set([
  'de', 'la', 'el', 'en', 'un', 'una', 'con', 'por', 'para', 'los', 'las', 'del', 
  'al', 'y', 'o', 'que', 'su', 'se', 'a', 'es', 'son', 'sobre', 'este', 'esta'
]);

/**
 * Valida la compatibilidad técnica y multi-tenant de un asset candidato contra un slot y un content item.
 */
export function validateAssetCompatibility(
  asset: ContentAsset,
  slot: MediaSlot,
  contentItem: ContentItem
): { compatible: boolean; reason?: string } {
  if (!asset || !slot || !contentItem) {
    return { compatible: false, reason: 'Parámetros incompletos' };
  }

  // 1. Aislamiento Multi-tenant estricto
  if (asset.workspace_id !== contentItem.workspace_id) {
    return { compatible: false, reason: 'Aislamiento Multi-tenant: workspace_id no coincide' };
  }

  if (asset.brand_id !== contentItem.brand_id) {
    return { compatible: false, reason: 'Aislamiento de Marca: brand_id no coincide' };
  }

  // 2. Compatibilidad de Tipo
  const allowedTypes = TYPE_COMPATIBILITY_MAP[slot.media_type] || [];
  if (!allowedTypes.includes(asset.asset_type)) {
    return { 
      compatible: false, 
      reason: `Tipo de asset incompatible (${asset.asset_type}) para media_type ${slot.media_type}. Permitidos: ${allowedTypes.join(', ')}` 
    };
  }

  return { compatible: true };
}

/**
 * Valida la selección manual de un asset para un slot (permite selección incluso si el score está bajo el umbral).
 */
export function validateManualAssetSelection(
  asset: ContentAsset,
  slot: MediaSlot,
  contentItem: ContentItem
): { valid: boolean; reason?: string } {
  const compat = validateAssetCompatibility(asset, slot, contentItem);
  return {
    valid: compat.compatible,
    reason: compat.reason,
  };
}

/**
 * Normaliza y tokeniza una cadena de texto para comparación léxica.
 */
function tokenizeText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remover tildes
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Evalúa y calcula el score determinista de un asset candidato para un MediaSlot.
 */
export function scoreAssetCandidate(
  asset: ContentAsset,
  slot: MediaSlot,
  contentItem: ContentItem
): CandidateAssetScore {
  const compat = validateAssetCompatibility(asset, slot, contentItem);
  if (!compat.compatible) {
    return {
      asset_id: asset.id,
      name: asset.name,
      asset_type: asset.asset_type,
      asset_scope: asset.asset_scope as SourcePreference,
      score: 0,
      reason: compat.reason || 'Incompatible',
      storage_path: asset.storage_path,
    };
  }

  let score = 0;
  const matchedCriteria: string[] = [];

  // 1. Coincidencia de Tipo
  if (asset.asset_type === slot.media_type) {
    score += 100;
    matchedCriteria.push(`Tipo exacto (${asset.asset_type}) +100`);
  } else {
    score += 80;
    matchedCriteria.push(`Tipo compatible (${asset.asset_type}) +80`);
  }

  // 2. Bonificación de Jerarquía de Scope
  if (asset.asset_scope === 'content' && asset.content_item_id === contentItem.id) {
    score += 80;
    matchedCriteria.push('Scope prioritario: asignado al propio contenido +80');
  } else if (
    asset.asset_scope === 'campaign' && 
    contentItem.campaign_id && 
    asset.campaign_id === contentItem.campaign_id
  ) {
    score += 50;
    matchedCriteria.push('Scope prioritario: perteneciente a la misma campaña +50');
  } else if (asset.asset_scope === 'brand') {
    score += 30;
    matchedCriteria.push('Scope institucional de marca +30');
  } else if ((asset.asset_scope as string) === 'local') {
    score += 10;
    matchedCriteria.push('Scope local/biblioteca +10');
  }

  // 3. Coincidencia Semántica y de Tags
  const queryTokens = tokenizeText(slot.semantic_query || '');
  const assetNameTokens = tokenizeText(asset.name || '');
  
  // Extraer tags del metadata del asset si existen
  const assetTags = Array.isArray(asset.metadata?.tags) 
    ? asset.metadata.tags.map((t: string) => String(t).toLowerCase()) 
    : [];

  let tagMatches = 0;
  let nameMatches = 0;

  for (const token of queryTokens) {
    // Coincidencia con tags
    if (assetTags.some((tag: string) => tag.includes(token))) {
      tagMatches++;
    }
    // Coincidencia con nombre de archivo
    if (assetNameTokens.some((nameTok: string) => nameTok.includes(token) || token.includes(nameTok))) {
      nameMatches++;
    }
  }

  const tagPoints = Math.min(tagMatches * 50, 100);
  if (tagPoints > 0) {
    score += tagPoints;
    matchedCriteria.push(`Coincidencia de tags (+${tagPoints})`);
  }

  const namePoints = Math.min(nameMatches * 30, 60);
  if (namePoints > 0) {
    score += namePoints;
    matchedCriteria.push(`Coincidencia en nombre de archivo (+${namePoints})`);
  }

  return {
    asset_id: asset.id,
    name: asset.name,
    asset_type: asset.asset_type,
    asset_scope: asset.asset_scope as SourcePreference,
    score,
    reason: matchedCriteria.join(' | '),
    storage_path: asset.storage_path,
  };
}

/**
 * Consulta la base de datos para obtener todos los assets candidatos de la marca, campaña y contenido.
 */
export async function findCandidateAssets(
  _slot: MediaSlot,
  contentItem: ContentItem,
  preloadedAssets?: ContentAsset[]
): Promise<ContentAsset[]> {
  if (preloadedAssets && preloadedAssets.length > 0) {
    return preloadedAssets.filter(
      (a) => a.workspace_id === contentItem.workspace_id && a.brand_id === contentItem.brand_id
    );
  }

  if (!contentItem.workspace_id || !contentItem.brand_id) {
    return [];
  }

  let query = supabase
    .from('content_assets')
    .select('*')
    .eq('workspace_id', contentItem.workspace_id)
    .eq('brand_id', contentItem.brand_id);

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error al consultar candidate assets:', error);
    return [];
  }

  return data as ContentAsset[];
}

/**
 * Obtiene la lista ordenada de candidatos para un slot específico.
 */
export async function getSlotCandidates(
  slot: MediaSlot,
  contentItem: ContentItem,
  availableAssets?: ContentAsset[]
): Promise<CandidateAssetScore[]> {
  const candidatePool = availableAssets || (await findCandidateAssets(slot, contentItem));
  return candidatePool
    .map((asset) => scoreAssetCandidate(asset, slot, contentItem))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Resuelve un MediaSlot determinísticamente contra la lista de assets disponibles.
 */
export async function resolveMediaSlot(
  slot: MediaSlot,
  contentItem: ContentItem,
  availableAssets?: ContentAsset[]
): Promise<{ slot: MediaSlot; candidates: CandidateAssetScore[] }> {
  // Idempotencia: si ya está resuelto y el asset existe y sigue siendo compatible, conservarlo
  if (slot.status === 'resolved' && slot.asset_id) {
    const assets = availableAssets || (await findCandidateAssets(slot, contentItem));
    const currentAsset = assets.find((a) => a.id === slot.asset_id);
    if (currentAsset) {
      const compat = validateAssetCompatibility(currentAsset, slot, contentItem);
      if (compat.compatible) {
        return { slot, candidates: [] };
      }
    }
  }

  const candidatePool = availableAssets || (await findCandidateAssets(slot, contentItem));
  if (!candidatePool || candidatePool.length === 0) {
    return {
      slot: {
        ...slot,
        asset_id: null,
        status: 'needs_asset' as MediaSlotStatus,
        resolution: null,
        candidates: [],
      },
      candidates: [],
    };
  }

  // Evaluar score para todos los candidatos
  const scoredCandidates: CandidateAssetScore[] = candidatePool
    .map((asset) => scoreAssetCandidate(asset, slot, contentItem))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredCandidates.length === 0) {
    return {
      slot: {
        ...slot,
        asset_id: null,
        status: 'needs_asset' as MediaSlotStatus,
        resolution: null,
        candidates: [],
      },
      candidates: [],
    };
  }

  const topCandidate = scoredCandidates[0];

  // Regla de Empate: Si hay más de un candidato con puntuación prácticamente idéntica
  let isTie = false;
  if (scoredCandidates.length > 1) {
    const secondCandidate = scoredCandidates[1];
    if (
      topCandidate.score >= SCORE_THRESHOLD &&
      Math.abs(topCandidate.score - secondCandidate.score) <= TIE_DIFFERENCE_THRESHOLD
    ) {
      isTie = true;
    }
  }

  // Si supera el threshold y no hay empate, resolver con éxito
  if (topCandidate.score >= SCORE_THRESHOLD && !isTie) {
    const resolution: MediaSlotResolution = {
      resolved_at: new Date().toISOString(),
      source_scope: topCandidate.asset_scope,
      score: topCandidate.score,
      resolver_version: RESOLVER_VERSION,
      candidate_count: scoredCandidates.length,
      asset_name: topCandidate.name,
      storage_path: topCandidate.storage_path,
      matched_criteria: topCandidate.reason.split(' | '),
      method: 'automatic',
      selected_by: null,
      previous_asset_id: null,
    };

    return {
      slot: {
        ...slot,
        asset_id: topCandidate.asset_id,
        status: 'resolved' as MediaSlotStatus,
        resolution,
        candidates: scoredCandidates.slice(0, 5),
      },
      candidates: scoredCandidates,
    };
  }

  // Si no supera el threshold o hay empate, marcar como needs_asset conservando candidatos
  return {
    slot: {
      ...slot,
      asset_id: null,
      status: 'needs_asset' as MediaSlotStatus,
      resolution: null,
      candidates: scoredCandidates.slice(0, 5),
    },
    candidates: scoredCandidates,
  };
}

/**
 * Resuelve todos los MediaSlots de una escena específica.
 */
export async function resolveSceneMediaSlots(
  scene: Scene,
  contentItem: ContentItem,
  availableAssets?: ContentAsset[]
): Promise<Scene> {
  const currentSlots = Array.isArray(scene.media_slots) && scene.media_slots.length > 0
    ? scene.media_slots
    : extractMediaSlotsFromScenes([scene], contentItem.content_type, contentItem.platform)[0]?.media_slots || [];

  const resolvedSlots: MediaSlot[] = [];
  for (const slot of currentSlots) {
    const res = await resolveMediaSlot(slot, contentItem, availableAssets);
    resolvedSlots.push(res.slot);
  }

  return {
    ...scene,
    media_slots: resolvedSlots,
  };
}

/**
 * Resuelve todos los MediaSlots de un ContentItem completo, opcionalmente persistiendo en PostgreSQL.
 */
export async function resolveContentMediaSlots(
  contentItemId: string,
  persistToDb = false
): Promise<{ 
  contentItem: ContentItem | null; 
  scenes: Scene[]; 
  summary: { total: number; resolved: number; needs_asset: number } 
}> {
  if (!contentItemId) {
    return { contentItem: null, scenes: [], summary: { total: 0, resolved: 0, needs_asset: 0 } };
  }

  const { data: itemData, error } = await supabase
    .from('content_items')
    .select('*, campaigns:campaign_id ( id, name )')
    .eq('id', contentItemId)
    .single();

  if (error || !itemData) {
    console.error(`Error al obtener content item ${contentItemId}:`, error);
    return { contentItem: null, scenes: [], summary: { total: 0, resolved: 0, needs_asset: 0 } };
  }

  const contentItem = itemData as ContentItem;
  const rawScenes: Scene[] = Array.isArray(contentItem.scenes) ? contentItem.scenes : [];
  
  // Extraer slots iniciales si no existen
  const scenesWithSlots = extractMediaSlotsFromScenes(rawScenes, contentItem.content_type, contentItem.platform);

  // Obtener catálogo de assets de la marca una sola vez en memoria
  const availableAssets = await findCandidateAssets({} as MediaSlot, contentItem);

  const resolvedScenes: Scene[] = [];
  let totalSlots = 0;
  let resolvedCount = 0;
  let needsAssetCount = 0;

  for (const scene of scenesWithSlots) {
    const resolvedScene = await resolveSceneMediaSlots(scene, contentItem, availableAssets);
    resolvedScenes.push(resolvedScene);

    if (Array.isArray(resolvedScene.media_slots)) {
      totalSlots += resolvedScene.media_slots.length;
      resolvedScene.media_slots.forEach((s) => {
        if (s.status === 'resolved') resolvedCount++;
        if (s.status === 'needs_asset') needsAssetCount++;
      });
    }
  }

  // Persistir en content_items.scenes sin generar versiones redundantes
  if (persistToDb) {
    const { error: updateError } = await supabase
      .from('content_items')
      .update({ scenes: resolvedScenes })
      .eq('id', contentItemId);

    if (updateError) {
      console.error('Error al persistir scenes resueltas en DB:', updateError);
    }
  }

  return {
    contentItem: { ...contentItem, scenes: resolvedScenes },
    scenes: resolvedScenes,
    summary: {
      total: totalSlots,
      resolved: resolvedCount,
      needs_asset: needsAssetCount,
    },
  };
}

/**
 * Resuelve manualmente un MediaSlot asignando un asset específico con trazabilidad completa (Fase 9B.3).
 */
export function manuallyResolveMediaSlot(
  scenes: Scene[],
  slotId: string,
  asset: ContentAsset,
  contentItem: ContentItem,
  userId?: string | null,
  method: ResolutionMethod = 'manual'
): { scenes: Scene[]; slot: MediaSlot | null } {
  if (!Array.isArray(scenes)) return { scenes: [], slot: null };

  let targetSlot: MediaSlot | null = null;

  const updatedScenes = scenes.map((scene) => {
    if (!Array.isArray(scene.media_slots)) return scene;

    const updatedSlots = scene.media_slots.map((slot) => {
      if (slot.slot_id === slotId) {
        const calculatedScore = scoreAssetCandidate(asset, slot, contentItem).score;
        const resolution: MediaSlotResolution = {
          resolved_at: new Date().toISOString(),
          source_scope: asset.asset_scope as SourcePreference,
          score: calculatedScore,
          resolver_version: RESOLVER_VERSION,
          candidate_count: 1,
          asset_name: asset.name,
          storage_path: asset.storage_path,
          method,
          selected_by: userId || null,
          previous_asset_id: slot.asset_id || null,
        };

        const updated: MediaSlot = {
          ...slot,
          asset_id: asset.id,
          status: 'resolved' as MediaSlotStatus,
          resolution,
        };
        targetSlot = updated;
        return updated;
      }
      return slot;
    });

    return {
      ...scene,
      media_slots: updatedSlots,
    };
  });

  return { scenes: updatedScenes, slot: targetSlot };
}

/**
 * Quita el asset asociado a un slot y lo restablece a needs_asset sin borrar el archivo físico (Fase 9B.3).
 */
export function clearMediaSlotResolution(
  scenes: Scene[],
  slotId: string
): { scenes: Scene[]; slot: MediaSlot | null } {
  if (!Array.isArray(scenes)) return { scenes: [], slot: null };

  let targetSlot: MediaSlot | null = null;

  const updatedScenes = scenes.map((scene) => {
    if (!Array.isArray(scene.media_slots)) return scene;

    const updatedSlots = scene.media_slots.map((slot) => {
      if (slot.slot_id === slotId) {
        const cleared: MediaSlot = {
          ...slot,
          asset_id: null,
          status: 'needs_asset' as MediaSlotStatus,
          resolution: null,
        };
        targetSlot = cleared;
        return cleared;
      }
      return slot;
    });

    return {
      ...scene,
      media_slots: updatedSlots,
    };
  });

  return { scenes: updatedScenes, slot: targetSlot };
}

/**
 * Invalida la resolución actual de un slot específico y vuelve a ejecutar el resolver.
 */
export async function reResolveMediaSlot(
  scenes: Scene[],
  slotId: string,
  contentItem: ContentItem,
  availableAssets?: ContentAsset[]
): Promise<Scene[]> {
  if (!Array.isArray(scenes)) return [];

  const candidatePool = availableAssets || (await findCandidateAssets({} as MediaSlot, contentItem));

  const updatedScenes: Scene[] = [];

  for (const scene of scenes) {
    if (!Array.isArray(scene.media_slots)) {
      updatedScenes.push(scene);
      continue;
    }

    const updatedSlots: MediaSlot[] = [];
    for (const slot of scene.media_slots) {
      if (slot.slot_id === slotId) {
        // Forzar reset de estado
        const cleanSlot: MediaSlot = {
          ...slot,
          asset_id: null,
          status: 'unresolved' as MediaSlotStatus,
          resolution: null,
        };
        const resolved = await resolveMediaSlot(cleanSlot, contentItem, candidatePool);
        updatedSlots.push(resolved.slot);
      } else {
        updatedSlots.push(slot);
      }
    }

    updatedScenes.push({
      ...scene,
      media_slots: updatedSlots,
    });
  }

  return updatedScenes;
}

/**
 * Calcula el estado de producción y preparación de una escena (Fase 9B.3).
 */
export function calculateSceneReadiness(scene: Scene): SceneReadiness {
  const slots = Array.isArray(scene.media_slots) ? scene.media_slots : [];
  const requiredSlots = slots.filter((s) => s.required);
  const totalRequired = requiredSlots.length;
  const resolvedRequired = requiredSlots.filter((s) => s.status === 'resolved' && s.asset_id).length;
  const missingRequired = totalRequired - resolvedRequired;
  const isReady = missingRequired === 0;

  let status: 'ready' | 'missing_one' | 'missing_multiple' = 'ready';
  if (missingRequired === 1) status = 'missing_one';
  else if (missingRequired > 1) status = 'missing_multiple';

  return {
    scene_number: scene.scene_number,
    isReady,
    totalRequired,
    resolvedRequired,
    missingRequired,
    status,
  };
}

/**
 * Calcula el estado global de preparación multimedia del contenido (Fase 9B.3).
 */
export function calculateContentReadiness(scenes: Scene[]): ContentMediaReadiness {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return {
      isReady: false,
      totalScenes: 0,
      readyScenes: 0,
      totalRequiredSlots: 0,
      resolvedRequiredSlots: 0,
      missingRequiredSlots: 0,
      status: 'requires_assets',
    };
  }

  let readyScenes = 0;
  let totalRequiredSlots = 0;
  let resolvedRequiredSlots = 0;

  for (const scene of scenes) {
    const sceneReadiness = calculateSceneReadiness(scene);
    if (sceneReadiness.isReady) {
      readyScenes++;
    }
    totalRequiredSlots += sceneReadiness.totalRequired;
    resolvedRequiredSlots += sceneReadiness.resolvedRequired;
  }

  const missingRequiredSlots = totalRequiredSlots - resolvedRequiredSlots;
  const isReady = totalRequiredSlots > 0 && missingRequiredSlots === 0;

  return {
    isReady,
    totalScenes: scenes.length,
    readyScenes,
    totalRequiredSlots,
    resolvedRequiredSlots,
    missingRequiredSlots,
    status: isReady ? 'ready_for_render' : 'requires_assets',
  };
}
