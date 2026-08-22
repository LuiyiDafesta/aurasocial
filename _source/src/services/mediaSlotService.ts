import { supabase } from '../lib/supabase';
import { Scene } from '../types/contentItem';
import { 
  MediaSlot, 
  MediaSlotType, 
  MediaSlotStatus, 
  SourcePreference, 
  SceneWithMediaSlots 
} from '../types/mediaSlot';

/**
 * Limpia y normaliza el texto de dirección visual para generar una consulta semántica representativa.
 */
export function generateSemanticQuery(visualDirection: string, onScreenText?: string): string {
  if (!visualDirection || !visualDirection.trim()) {
    return onScreenText?.trim() || 'recurso visual';
  }

  // Remover términos técnicos de encuadre o cámara
  let clean = visualDirection
    .replace(/^(primer plano de|primerísimo plano de|plano general de|plano medio de|detalle de|toma de|vista cenital de|corte a|paneo a|fade in a|zoom a)\s+/gi, '')
    .replace(/\s+(en primer plano|de fondo|al centro|en cámara lenta|con desenfoque)\b/gi, '')
    .trim();

  // Si queda demasiado corto, complementar con onScreenText
  if (clean.length < 10 && onScreenText && onScreenText.trim()) {
    clean = `${clean} ${onScreenText.trim()}`.trim();
  }

  return clean || visualDirection.trim();
}

/**
 * Determina el tipo principal de media slot según el análisis determinista de la escena.
 */
export function determineMediaType(
  visualDirection: string, 
  durationSeconds?: number, 
  contentType?: string
): MediaSlotType {
  const text = (visualDirection || '').toLowerCase();

  if (text.includes('b-roll') || text.includes('metraje de apoyo') || text.includes('tomas secundarias') || text.includes('broll')) {
    return 'b_roll';
  }

  if (text.includes('fondo sólido') || text.includes('placa de fondo') || text.includes('gradiente') || text.includes('text card') || text.includes('solo texto')) {
    return 'background';
  }

  if (text.includes('fotografía') || text.includes('foto fija') || text.includes('imagen estática') || text.includes('infografía') || text.includes('captura de pantalla') || text.includes('screenshot')) {
    return 'image';
  }

  const isVideoContent = contentType === 'reel' || contentType === 'video' || contentType === 'short' || contentType === 'tiktok';
  const hasDuration = typeof durationSeconds === 'number' && durationSeconds > 0;

  if (hasDuration || isVideoContent) {
    return 'video';
  }

  return 'image';
}

/**
 * Extrae slots multimedia estructurados para una lista de escenas de forma determinista e idempotente.
 */
export function extractMediaSlotsFromScenes(
  scenes: Scene[],
  contentType?: string,
  _platform?: string
): SceneWithMediaSlots[] {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return [];
  }

  return scenes.map((scene, index) => {
    const sceneNumber = scene.scene_number || index + 1;
    const duration = scene.duration_seconds || 5;
    const visualDir = scene.visual_direction || '';
    const onScreen = scene.on_screen_text || '';

    // Si la escena ya cuenta con media_slots válidos y no vacíos, conservarlos de forma idempotente
    if (Array.isArray(scene.media_slots) && scene.media_slots.length > 0) {
      return {
        ...scene,
        scene_number: sceneNumber,
        duration_seconds: duration,
        media_slots: scene.media_slots,
      };
    }

    const mediaSlots: MediaSlot[] = [];

    // 1. Slot Principal de Contenido
    const primaryType = determineMediaType(visualDir, duration, contentType);
    const semanticQuery = generateSemanticQuery(visualDir, onScreen);

    const primarySlot: MediaSlot = {
      slot_id: `slot_${sceneNumber}_primary_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      scene_number: sceneNumber,
      media_type: primaryType,
      required: true,
      semantic_query: semanticQuery,
      duration_seconds: primaryType === 'video' || primaryType === 'b_roll' ? duration : undefined,
      fit_mode: 'cover',
      position: { x: 50, y: 50 },
      crop: { mode: 'center' },
      source_preference: ['content', 'campaign', 'brand', 'local'] as SourcePreference[],
      asset_id: null,
      status: 'unresolved' as MediaSlotStatus,
      fallback: {
        type: primaryType === 'background' ? 'brand_background' : 'placeholder',
      },
    };

    mediaSlots.push(primarySlot);

    // 2. Detección de Slot Secundario: Logo / Marca de agua
    const lowerText = `${visualDir} ${onScreen}`.toLowerCase();
    if (lowerText.includes('logo') || lowerText.includes('isotipo') || lowerText.includes('marca de agua') || lowerText.includes('placa de marca')) {
      const logoSlot: MediaSlot = {
        slot_id: `slot_${sceneNumber}_logo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        scene_number: sceneNumber,
        media_type: 'logo',
        required: false,
        semantic_query: 'logo oficial de la marca',
        fit_mode: 'contain',
        position: { x: 50, y: 15 },
        source_preference: ['brand', 'campaign', 'content', 'local'] as SourcePreference[],
        asset_id: null,
        status: 'unresolved' as MediaSlotStatus,
        fallback: {
          type: 'text_card',
        },
      };
      mediaSlots.push(logoSlot);
    }

    return {
      ...scene,
      scene_number: sceneNumber,
      duration_seconds: duration,
      media_slots: mediaSlots,
    };
  });
}

/**
 * Obtiene todos los media slots de un content_item consultando la base de datos.
 */
export async function getMediaSlotsForContent(contentItemId: string): Promise<MediaSlot[]> {
  if (!contentItemId) return [];

  const { data, error } = await supabase
    .from('content_items')
    .select('id, scenes, content_type, platform')
    .eq('id', contentItemId)
    .single();

  if (error || !data) {
    console.error(`Error al consultar scenes para contentItemId ${contentItemId}:`, error);
    return [];
  }

  const rawScenes: Scene[] = Array.isArray(data.scenes) ? data.scenes : [];
  const scenesWithSlots = extractMediaSlotsFromScenes(rawScenes, data.content_type, data.platform);

  return scenesWithSlots.flatMap((s) => s.media_slots || []);
}

/**
 * Obtiene los media slots correspondientes a una escena específica.
 */
export function getMediaSlotsForScene(scenes: Scene[], sceneNumber: number): MediaSlot[] {
  if (!Array.isArray(scenes)) return [];
  const targetScene = scenes.find((s) => s.scene_number === sceneNumber);
  if (!targetScene) return [];

  if (Array.isArray(targetScene.media_slots) && targetScene.media_slots.length > 0) {
    return targetScene.media_slots;
  }

  const extracted = extractMediaSlotsFromScenes([targetScene]);
  return extracted[0]?.media_slots || [];
}

/**
 * Valida la integridad estructural de un MediaSlot.
 */
export function validateMediaSlot(slot: MediaSlot): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!slot.slot_id || typeof slot.slot_id !== 'string') {
    errors.push('slot_id es requerido y debe ser una cadena válida');
  }

  if (typeof slot.scene_number !== 'number' || slot.scene_number < 1) {
    errors.push('scene_number debe ser un número positivo');
  }

  const validMediaTypes: MediaSlotType[] = ['image', 'video', 'audio', 'logo', 'background', 'b_roll', 'thumbnail'];
  if (!validMediaTypes.includes(slot.media_type)) {
    errors.push(`media_type inválido: ${slot.media_type}`);
  }

  const validStatuses: MediaSlotStatus[] = ['unresolved', 'resolved', 'needs_asset'];
  if (!validStatuses.includes(slot.status)) {
    errors.push(`status inválido: ${slot.status}`);
  }

  if (!Array.isArray(slot.source_preference) || slot.source_preference.length === 0) {
    errors.push('source_preference debe ser un arreglo no vacío');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Actualiza un MediaSlot dentro del arreglo de escenas de forma inmutable.
 */
export function updateMediaSlotInScenes(scenes: Scene[], updatedSlot: MediaSlot): Scene[] {
  if (!Array.isArray(scenes)) return [];

  return scenes.map((scene) => {
    if (scene.scene_number !== updatedSlot.scene_number) {
      return scene;
    }

    const currentSlots = Array.isArray(scene.media_slots) ? scene.media_slots : [];
    const slotIndex = currentSlots.findIndex((s) => s.slot_id === updatedSlot.slot_id);

    let newSlots: MediaSlot[];
    if (slotIndex >= 0) {
      newSlots = [...currentSlots];
      newSlots[slotIndex] = { ...updatedSlot };
    } else {
      newSlots = [...currentSlots, { ...updatedSlot }];
    }

    return {
      ...scene,
      media_slots: newSlots,
    };
  });
}

/**
 * Limpia el asset_id de un slot y restablece su estado a 'unresolved'.
 */
export function clearResolvedAsset(scenes: Scene[], slotId: string): Scene[] {
  if (!Array.isArray(scenes)) return [];

  return scenes.map((scene) => {
    if (!Array.isArray(scene.media_slots)) return scene;

    const newSlots = scene.media_slots.map((slot) => {
      if (slot.slot_id === slotId) {
        return {
          ...slot,
          asset_id: null,
          status: 'unresolved' as MediaSlotStatus,
        };
      }
      return slot;
    });

    return {
      ...scene,
      media_slots: newSlots,
    };
  });
}
