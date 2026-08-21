import { supabase } from '../lib/supabase';
import { ContentVersion, CreateVersionPayload, VersionDiffResult, FieldDiff } from '../types/contentVersion';

/**
 * Normaliza una fila cruda de public.content_versions
 */
export function normalizeContentVersion(raw: any): ContentVersion {
  return {
    ...raw,
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
    media_requirements: Array.isArray(raw.media_requirements) ? raw.media_requirements : [],
    scenes: Array.isArray(raw.scenes) ? raw.scenes : [],
    production_brief_snapshot: raw.production_brief_snapshot || {},
  };
}

/**
 * Obtiene el historial inmutable de versiones de un content_item ordenado de la más reciente a la más antigua.
 */
export async function getContentVersions(contentItemId: string): Promise<ContentVersion[]> {
  if (!contentItemId) return [];

  const { data, error } = await supabase
    .from('content_versions')
    .select('*')
    .eq('content_item_id', contentItemId)
    .order('version_number', { ascending: false });

  if (error) {
    console.error(`Error al obtener versiones del contenido (${contentItemId}):`, error);
    throw new Error(`Error al cargar el historial de versiones: ${error.message}`);
  }

  return (data || []).map(normalizeContentVersion);
}

/**
 * Obtiene una versión histórica específica por su ID.
 */
export async function getContentVersionById(versionId: string): Promise<ContentVersion | null> {
  if (!versionId) return null;

  const { data, error } = await supabase
    .from('content_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error) {
    console.error(`Error al obtener versión (${versionId}):`, error);
    return null;
  }

  return normalizeContentVersion(data);
}

/**
 * Crea una nueva versión inmutable de contenido invocando la RPC transaccional create_content_version().
 * La RPC serializa la concurrencia con FOR UPDATE y actualiza atómicamente content_items.
 */
export async function createContentVersion(payload: CreateVersionPayload): Promise<ContentVersion> {
  if (!payload.content_item_id) throw new Error('content_item_id es requerido para versionar');
  if (!payload.title || !payload.title.trim()) throw new Error('El título del contenido es requerido');

  const { data, error } = await supabase.rpc('create_content_version', {
    p_content_item_id: payload.content_item_id,
    p_version_type: payload.version_type,
    p_title: payload.title.trim(),
    p_hook: payload.hook ?? null,
    p_script: payload.script ?? null,
    p_caption: payload.caption ?? null,
    p_hashtags: payload.hashtags ?? [],
    p_cta: payload.cta ?? null,
    p_creative_direction: payload.creative_direction ?? null,
    p_media_requirements: payload.media_requirements ?? [],
    p_scenes: payload.scenes ?? [],
    p_production_brief_snapshot: payload.production_brief_snapshot ?? {},
    p_platform: payload.platform ?? null,
    p_content_type: payload.content_type ?? null,
    p_status: payload.status ?? null,
    p_scheduled_at: payload.scheduled_at ?? null,
    p_published_at: payload.published_at ?? null,
    p_external_post_url: payload.external_post_url ?? null,
    p_change_summary: payload.change_summary ?? null,
  });

  if (error) {
    console.error('Error al crear content version vía RPC:', error);
    throw new Error(`Error al crear nueva versión: ${error.message}`);
  }

  return normalizeContentVersion(data);
}

/**
 * Restaura una versión histórica creando una nueva versión 'restored_from_version'
 * copiando los campos del snapshot seleccionado, garantizando que el historial permanezca inmutable.
 */
export async function restoreContentVersion(
  contentItemId: string,
  targetVersion: ContentVersion
): Promise<ContentVersion> {
  if (!contentItemId) throw new Error('contentItemId es requerido para restaurar');
  if (!targetVersion) throw new Error('targetVersion es requerido para restaurar');

  const payload: CreateVersionPayload = {
    content_item_id: contentItemId,
    version_type: 'restored_from_version',
    title: targetVersion.title,
    hook: targetVersion.hook,
    script: targetVersion.script,
    caption: targetVersion.caption,
    hashtags: targetVersion.hashtags,
    cta: targetVersion.cta,
    creative_direction: targetVersion.creative_direction,
    media_requirements: targetVersion.media_requirements,
    scenes: targetVersion.scenes,
    production_brief_snapshot: targetVersion.production_brief_snapshot,
    platform: targetVersion.platform,
    content_type: targetVersion.content_type,
    status: targetVersion.status || 'draft',
    change_summary: `Restaurado a partir de v${targetVersion.version_number}`,
  };

  return createContentVersion(payload);
}

/**
 * Calcula la diferencia estructurada campo por campo entre dos versiones (Versión A vs Versión B).
 */
export function computeVersionDiff(versionA: ContentVersion, versionB: ContentVersion): VersionDiffResult {
  const fieldsToCompare = [
    { key: 'title', label: 'Título' },
    { key: 'hook', label: 'Hook / Gancho Inicial' },
    { key: 'script', label: 'Guion Completo de Locución' },
    { key: 'caption', label: 'Caption / Copia del Post' },
    { key: 'cta', label: 'Llamado a la Acción (CTA)' },
    { key: 'creative_direction', label: 'Dirección Creativa' },
    { key: 'hashtags', label: 'Hashtags', isStructured: true },
    { key: 'scenes', label: 'Escenas Audiovisuales', isStructured: true },
    { key: 'media_requirements', label: 'Requisitos Multimedia', isStructured: true },
  ];

  const fields: FieldDiff[] = [];
  let hasAnyChange = false;

  for (const f of fieldsToCompare) {
    const valA = (versionA as any)[f.key];
    const valB = (versionB as any)[f.key];

    let hasChanged = false;
    if (f.isStructured) {
      hasChanged = JSON.stringify(valA ?? []) !== JSON.stringify(valB ?? []);
    } else {
      hasChanged = (valA ?? '').trim() !== (valB ?? '').trim();
    }

    if (hasChanged) hasAnyChange = true;

    fields.push({
      fieldName: f.key,
      label: f.label,
      hasChanged,
      valueA: valA,
      valueB: valB,
      isStructured: f.isStructured,
    });
  }

  return {
    versionA,
    versionB,
    fields,
    hasAnyChange,
  };
}
