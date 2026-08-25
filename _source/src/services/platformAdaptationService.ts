import { supabase } from '../lib/supabase';
import { ContentItem, Scene } from '../types/contentItem';
import { ContentAsset } from '../types/contentAsset';
import { ContentVersion } from '../types/contentVersion';
import { RenderJob } from '../types/renderJob';
import {
  PlatformAdaptation,
  TargetPlatform,
  TargetFormat,
  SceneMediaPlan,
  ValidationResult,
  PlatformReadinessSummary,
  RenderPackage,
  ReadinessStatus,
  ValidationStatus,
  RenderStatus,
  PlatformDimensions,
} from '../types/platformAdaptation';
import { getPlatformProfile, PlatformProfile } from '../config/platformProfiles';
import { validatePlatformTexts } from './platformTextValidator';
import { extractMediaSlotsFromScenes } from './mediaSlotService';
import { planMediaForContent } from './mediaPlannerService';
import { composeAndRenderAdaptation } from './renderService';
import { getSignedAssetUrl } from './contentAssetService';
import { getB2CdnUrl } from '../lib/b2Storage';

export const DEFAULT_PLATFORM_CONFIGS: Array<{
  platform: TargetPlatform;
  format: TargetFormat;
  dimensions: PlatformDimensions;
}> = [
  { platform: 'instagram', format: 'reel', dimensions: { width: 1080, height: 1920, aspect_ratio: '9:16' } },
  { platform: 'tiktok', format: 'video', dimensions: { width: 1080, height: 1920, aspect_ratio: '9:16' } },
  { platform: 'facebook', format: 'post', dimensions: { width: 1080, height: 1080, aspect_ratio: '1:1' } },
  { platform: 'linkedin', format: 'post', dimensions: { width: 1080, height: 1080, aspect_ratio: '1:1' } },
];

/**
 * Consulta todas las adaptaciones asociadas a un content_item.
 */
export async function getPlatformAdaptations(
  contentItemId: string,
  contentVersionId?: string | null
): Promise<PlatformAdaptation[]> {
  if (!contentItemId) return [];

  let query = supabase
    .from('platform_adaptations')
    .select('*')
    .eq('content_item_id', contentItemId)
    .order('created_at', { ascending: true });

  if (contentVersionId) {
    query = query.eq('content_version_id', contentVersionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error al consultar platform_adaptations:', error);
    throw new Error(`Error al obtener adaptaciones: ${error.message}`);
  }

  return (data as PlatformAdaptation[]) || [];
}

/**
 * Consulta una adaptación por su ID.
 */
export async function getPlatformAdaptation(id: string): Promise<PlatformAdaptation | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from('platform_adaptations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error(`Error al obtener platform_adaptation ${id}:`, error);
    return null;
  }

  return data as PlatformAdaptation;
}

/**
 * Elimina una adaptación de plataforma por su ID.
 */
export async function deletePlatformAdaptation(id: string): Promise<boolean> {
  if (!id) return false;

  const { error } = await supabase
    .from('platform_adaptations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error al eliminar platform_adaptation ${id}:`, error);
    throw new Error(`Error al eliminar adaptación: ${error.message}`);
  }

  return true;
}

/**
 * Transforma las escenas del Content Master en SceneMediaPlans optimizados para la plataforma.
 */
export function adaptScenesForPlatform(
  rawScenes: Scene[],
  profile: PlatformProfile
): SceneMediaPlan[] {
  const scenesWithSlots = extractMediaSlotsFromScenes(rawScenes);

  return scenesWithSlots.map((scene) => {
    const primarySlot = (scene.media_slots || []).find((s) => s.required) || (scene.media_slots || [])[0];
    const isResolved = primarySlot && primarySlot.status === 'resolved' && Boolean(primarySlot.asset_id);

    const onScreenText = scene.on_screen_text || '';
    const safeAreaValid = onScreenText.length <= 100;

    return {
      scene_number: scene.scene_number,
      asset_type: (primarySlot?.media_type as any) || 'video',
      description: scene.visual_direction || '',
      visual_direction: scene.visual_direction,
      camera_direction: scene.camera_direction,
      duration_seconds: scene.duration_seconds || 4,
      on_screen_text: onScreenText,
      voiceover: scene.voiceover,
      transition: scene.transition || 'fade',
      layout: 'full_screen',
      text_position: 'middle',
      text_alignment: profile.textRules.allowedAlignments[0] || 'center',
      font_scale: 1.0,
      crop: { mode: profile.defaultFitMode === 'contain' ? 'contain' : 'cover' },
      fit_mode: profile.defaultFitMode,
      source: isResolved ? ('real_asset' as const) : ('needs_asset' as const),
      asset_id: primarySlot?.asset_id || null,
      asset_name: primarySlot?.resolution?.asset_name || null,
      storage_path: primarySlot?.resolution?.storage_path || null,
      safe_area_valid: safeAreaValid,
      safe_area_warning: safeAreaValid ? null : 'Texto excede safe area recomendada',
      status: isResolved ? ('resolved' as const) : ('needs_asset' as const),
    };
  });
}

/**
 * Valida integralmente una adaptación contra las restricciones de la plataforma.
 */
export function validatePlatformAdaptation(
  adaptation: Partial<PlatformAdaptation>,
  _contentItem?: ContentItem
): ValidationResult {
  const profile = getPlatformProfile(adaptation.platform || 'instagram');

  const textVal = validatePlatformTexts(
    {
      title: adaptation.title,
      hook: adaptation.hook,
      caption: adaptation.caption,
      hashtags: adaptation.hashtags,
      cta: adaptation.cta,
      sceneTexts: (adaptation.scene_mappings || []).map((s) => ({
        scene_number: s.scene_number,
        on_screen_text: s.on_screen_text || '',
      })),
    },
    profile
  );

  const errors = [...textVal.errors];
  const warnings = [...textVal.warnings];

  // Validación de Escenas y Recursos Multimedia
  const scenes = adaptation.scene_mappings || [];
  if (scenes.length === 0) {
    errors.push({
      code: 'NO_SCENES',
      field: 'scene_mappings',
      message: 'La adaptación debe contener al menos una escena.',
      severity: 'error',
    });
  }

  // Verificar duración total
  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  if (totalDuration > profile.maxDurationSeconds) {
    errors.push({
      code: 'DURATION_EXCEEDED',
      field: 'target_duration_seconds',
      message: `La duración total (${totalDuration}s) excede el máximo permitido para ${profile.name} (${profile.maxDurationSeconds}s).`,
      severity: 'error',
    });
  }

  if (totalDuration < profile.minDurationSeconds) {
    warnings.push({
      code: 'DURATION_TOO_SHORT',
      field: 'target_duration_seconds',
      message: `La duración total (${totalDuration}s) es menor al mínimo sugerido (${profile.minDurationSeconds}s).`,
    });
  }

  // Verificar que todas las escenas tengan recursos resueltos
  for (const scene of scenes) {
    if (scene.status === 'needs_asset' || !scene.asset_id) {
      warnings.push({
        code: 'SCENE_NEEDS_ASSET',
        field: 'scene_mappings',
        message: `La Escena ${scene.scene_number} no tiene un recurso multimedia asignado.`,
        scene_number: scene.scene_number,
      });
    }
  }

  const isBlocked = errors.some((e) => e.severity === 'error' || e.severity === 'fatal');
  const isValid = !isBlocked;

  return {
    isValid,
    isBlocked,
    errors,
    warnings,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Calcula el resumen de preparación para render de la plataforma.
 */
export function calculatePlatformReadiness(
  adaptation: Partial<PlatformAdaptation>,
  contentItem?: ContentItem
): PlatformReadinessSummary {
  const validation = validatePlatformAdaptation(adaptation, contentItem);
  const scenes = adaptation.scene_mappings || [];

  const totalMedia = scenes.length;
  const resolvedMedia = scenes.filter((s) => s.status === 'resolved' && s.asset_id).length;
  const mediaReady = totalMedia > 0 && resolvedMedia === totalMedia;
  const textReady = validation.isValid;
  const formatReady = validation.errors.every((e) => e.code !== 'DURATION_EXCEEDED');

  const isReady = mediaReady && textReady && formatReady;
  let status: 'ready_for_render' | 'requires_correction' | 'blocked' = 'ready_for_render';

  if (validation.isBlocked) {
    status = 'blocked';
  } else if (!isReady) {
    status = 'requires_correction';
  }

  return {
    isReady,
    status,
    mediaReady,
    textReady,
    formatReady,
    resolvedMediaCount: resolvedMedia,
    totalMediaCount: totalMedia,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

/**
 * Genera determinísticamente una adaptación derivada a partir del Content Master.
 */
export function generatePlatformAdaptation(
  contentItem: ContentItem,
  platform: TargetPlatform,
  profileOverride?: Partial<PlatformProfile>
): Partial<PlatformAdaptation> {
  const profile = { ...getPlatformProfile(platform), ...profileOverride };
  const rawScenes: Scene[] = Array.isArray(contentItem.scenes) ? contentItem.scenes : [];
  const sceneMappings = adaptScenesForPlatform(rawScenes, profile);

  const hashtags = Array.isArray(contentItem.hashtags) 
    ? contentItem.hashtags.slice(0, profile.maxHashtags) 
    : [];

  const totalDuration = sceneMappings.reduce((acc, s) => acc + s.duration_seconds, 0);

  const rawAdaptation: Partial<PlatformAdaptation> = {
    workspace_id: contentItem.workspace_id || '',
    brand_id: contentItem.brand_id || '',
    campaign_id: contentItem.campaign_id || null,
    content_item_id: contentItem.id,
    platform,
    format: profile.defaultFormat,
    title: contentItem.title || null,
    hook: contentItem.hook || null,
    caption: contentItem.caption || '',
    hashtags,
    cta: contentItem.cta || null,
    dimensions: {
      width: profile.dimensions.width,
      height: profile.dimensions.height,
      aspect_ratio: profile.dimensions.aspect_ratio,
    },
    target_duration_seconds: totalDuration,
    safe_area: profile.safeArea,
    platform_rules: {
      maxCaptionLength: profile.maxCaptionLength,
      textRules: profile.textRules,
    },
    thumbnail_strategy: { mode: 'first_frame' },
    scene_mappings: sceneMappings,
    render_status: 'not_started' as RenderStatus,
    render_output: {
      renderer_version: 'deterministic_9c',
      media_url: '',
      mime_type: 'video/mp4',
      width: profile.dimensions.width,
      height: profile.dimensions.height,
      duration_seconds: totalDuration,
      file_size_bytes: 0,
      format: profile.defaultFormat,
      input_assets: sceneMappings.map((s) => ({
        scene_number: s.scene_number,
        asset_id: s.asset_id,
        asset_name: s.asset_name,
        source: s.source,
        storage_path: s.storage_path,
        fit_mode: s.fit_mode,
      })),
      is_mock: true,
      rendered_at: new Date().toISOString(),
    },
    validation_status: 'pending' as ValidationStatus,
    validation_errors: [],
    validation_warnings: [],
    readiness_status: 'draft' as ReadinessStatus,
    publication_package: {},
  };

  const readiness = calculatePlatformReadiness(rawAdaptation, contentItem);
  rawAdaptation.validation_status = readiness.textReady ? 'valid' : 'blocked';
  rawAdaptation.validation_errors = readiness.errors;
  rawAdaptation.validation_warnings = readiness.warnings;
  rawAdaptation.readiness_status = readiness.isReady ? 'valid' : readiness.status === 'blocked' ? 'blocked' : 'needs_assets';

  return rawAdaptation;
}

/**
 * Crea o guarda una PlatformAdaptation en PostgreSQL de forma estrictamente idempotente.
 */
export async function createPlatformAdaptation(
  contentItem: ContentItem,
  platform: TargetPlatform,
  options?: { format?: TargetFormat; title?: string; caption?: string; hashtags?: string[]; cta?: string }
): Promise<PlatformAdaptation> {
  if (!contentItem || !contentItem.id || !contentItem.workspace_id || !contentItem.brand_id) {
    throw new Error('ContentItem inválido o incompleto (workspace_id y brand_id requeridos)');
  }

  const profile = getPlatformProfile(platform);
  const base = generatePlatformAdaptation(contentItem, platform);

  const payload: Record<string, any> = {
    workspace_id: contentItem.workspace_id,
    brand_id: contentItem.brand_id,
    campaign_id: contentItem.campaign_id || null,
    content_item_id: contentItem.id,
    platform,
    format: options?.format || profile.defaultFormat,
    title: options?.title ?? base.title,
    hook: base.hook,
    caption: options?.caption ?? base.caption,
    hashtags: options?.hashtags ?? base.hashtags,
    cta: options?.cta ?? base.cta,
    dimensions: base.dimensions,
    target_duration_seconds: base.target_duration_seconds,
    safe_area: base.safe_area,
    platform_rules: base.platform_rules,
    thumbnail_strategy: base.thumbnail_strategy,
    scene_mappings: base.scene_mappings,
    render_status: base.render_status,
    render_output: base.render_output,
    validation_status: base.validation_status,
    validation_errors: base.validation_errors,
    validation_warnings: base.validation_warnings,
    readiness_status: base.readiness_status,
    publication_package: base.publication_package || {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('platform_adaptations')
    .upsert(payload, { onConflict: 'content_item_id, platform' })
    .select('*')
    .single();

  if (error || !data) {
    console.error(`Error al crear/actualizar adaptación para ${platform}:`, error);
    throw new Error(`Error al persistir adaptación: ${error?.message}`);
  }

  return data as PlatformAdaptation;
}

/**
 * Guarda o actualiza una adaptación (para compatibilidad con Studio).
 */
export async function savePlatformAdaptation(
  adaptation: Partial<PlatformAdaptation>
): Promise<PlatformAdaptation> {
  if (!adaptation.content_item_id || !adaptation.workspace_id || !adaptation.brand_id) {
    throw new Error('workspace_id, brand_id y content_item_id son requeridos');
  }

  const payload: Record<string, any> = {
    workspace_id: adaptation.workspace_id,
    brand_id: adaptation.brand_id,
    campaign_id: adaptation.campaign_id || null,
    content_item_id: adaptation.content_item_id,
    content_version_id: adaptation.content_version_id || null,
    platform: adaptation.platform || 'instagram',
    format: adaptation.format || 'reel',
    title: adaptation.title || null,
    hook: adaptation.hook || null,
    dimensions: adaptation.dimensions || { width: 1080, height: 1920, aspect_ratio: '9:16' },
    target_duration_seconds: typeof adaptation.target_duration_seconds === 'number' && !isNaN(adaptation.target_duration_seconds) ? adaptation.target_duration_seconds : null,
    caption: adaptation.caption || '',
    hashtags: Array.isArray(adaptation.hashtags) ? adaptation.hashtags : [],
    cta: adaptation.cta || '',
    safe_area: adaptation.safe_area || {},
    platform_rules: adaptation.platform_rules || {},
    thumbnail_strategy: adaptation.thumbnail_strategy || {},
    scene_mappings: Array.isArray(adaptation.scene_mappings) ? adaptation.scene_mappings : [],
    render_status: adaptation.render_status || 'not_started',
    render_output: adaptation.render_output || {},
    validation_status: adaptation.validation_status || 'pending',
    validation_errors: Array.isArray(adaptation.validation_errors) ? adaptation.validation_errors : [],
    validation_warnings: Array.isArray(adaptation.validation_warnings) ? adaptation.validation_warnings : [],
    readiness_status: adaptation.readiness_status || 'draft',
    approved_by: adaptation.approved_by || null,
    approved_at: adaptation.approved_at || null,
    publication_package: adaptation.publication_package || {},
    updated_at: new Date().toISOString(),
  };

  let res;
  if (adaptation.id) {
    res = await supabase
      .from('platform_adaptations')
      .update(payload)
      .eq('id', adaptation.id)
      .select('*')
      .single();
  } else {
    res = await supabase
      .from('platform_adaptations')
      .upsert(payload, { onConflict: 'content_item_id, platform' })
      .select('*')
      .single();
  }

  if (res.error) {
    console.error('Error al guardar platform_adaptation:', res.error);
    throw new Error(`Error al guardar adaptación en base de datos: ${res.error.message}`);
  }

  return res.data as PlatformAdaptation;
}

/**
 * Genera de forma automatizada las 4 adaptaciones estándar a partir de un content_item y su versión.
 */
export async function generateDefaultAdaptations(
  item: ContentItem,
  version?: ContentVersion | null
): Promise<PlatformAdaptation[]> {
  const brandName = item.brands?.name || 'Aura Social';
  const brandAvatar = item.social_accounts?.metadata?.avatar_url;
  const versionId = version?.id || null;
  const versionNumber = version?.version_number || 1;

  const caption = version?.caption || item.caption || '';
  const hashtags = Array.isArray(version?.hashtags) ? version?.hashtags : (item.hashtags || []);
  const cta = version?.cta || item.cta || '';

  const mediaPlan = await planMediaForContent(item, {
    allowPlaceholders: true,
    aspectRatio: '9:16',
  });

  const adaptations: PlatformAdaptation[] = [];

  for (const config of DEFAULT_PLATFORM_CONFIGS) {
    const rawAdaptation: Partial<PlatformAdaptation> = {
      workspace_id: item.workspace_id || '',
      brand_id: item.brand_id || '',
      campaign_id: item.campaign_id || null,
      content_item_id: item.id,
      content_version_id: versionId,
      platform: config.platform,
      format: config.format,
      dimensions: config.dimensions,
      caption: caption || '',
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      cta: cta || '',
      scene_mappings: mediaPlan.scenePlans,
    };

    const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
      adaptation: rawAdaptation,
      scenes: mediaPlan.scenePlans,
      brandName,
      brandAvatarUrl: brandAvatar,
      versionNumber,
      campaignId: item.campaign_id,
    });

    rawAdaptation.render_status = 'rendered';
    rawAdaptation.render_output = renderOutput;
    rawAdaptation.validation_status = validation.isValid ? 'valid' : 'blocked';
    rawAdaptation.validation_errors = validation.errors;
    rawAdaptation.validation_warnings = validation.warnings;
    rawAdaptation.readiness_status = publicationPackage.readiness_status;
    rawAdaptation.publication_package = publicationPackage;

    const saved = await savePlatformAdaptation(rawAdaptation);
    adaptations.push(saved);
  }

  return adaptations;
}

/**
 * Aprobación Humana Explícita de una Adaptación (VALID -> APPROVED).
 */
export async function approvePlatformAdaptation(
  adaptationId: string,
  userId?: string,
  _renderJob?: RenderJob | null
): Promise<PlatformAdaptation> {
  const { data, error } = await supabase
    .from('platform_adaptations')
    .select('*')
    .eq('id', adaptationId)
    .single();

  if (error || !data) {
    throw new Error(`Adaptación ${adaptationId} no encontrada: ${error?.message}`);
  }

  const adaptation = data as PlatformAdaptation;

  // Comprobar si hay errores bloqueantes en el Quality Gate / Validación
  if (adaptation.validation_status === 'blocked' || (adaptation.validation_errors && adaptation.validation_errors.length > 0)) {
    const errorMsg = adaptation.validation_errors?.map(e => e.message).join(', ') || 'Errores de validación bloqueantes';
    throw new Error(`No se puede aprobar la adaptación debido a errores de Quality Gate: ${errorMsg}`);
  }

  const approvedAt = new Date().toISOString();
  let approvedBy: string | null = userId || null;
  if (!approvedBy) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      approvedBy = authData?.user?.id || null;
    } catch {
      approvedBy = null;
    }
  }

  const updatedPackage = typeof adaptation.publication_package === 'object' && adaptation.publication_package !== null
    ? {
        ...adaptation.publication_package,
        readiness_status: 'approved',
        approved_at: approvedAt,
        approved_by: approvedBy,
      }
    : adaptation.publication_package;

  const { data: updated, error: updateError } = await supabase
    .from('platform_adaptations')
    .update({
      readiness_status: 'approved',
      approved_at: approvedAt,
      approved_by: approvedBy,
      publication_package: updatedPackage,
      updated_at: approvedAt,
    })
    .eq('id', adaptationId)
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new Error(`Error al persistir aprobación de la adaptación: ${updateError?.message}`);
  }

  return updated as PlatformAdaptation;
}

/**
 * Rechazo Humano de una Adaptación (-> REJECTED).
 */
export async function rejectPlatformAdaptation(
  adaptationId: string,
  reason?: string,
  _userId?: string
): Promise<PlatformAdaptation> {
  const rejectedAt = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('platform_adaptations')
    .update({
      readiness_status: 'blocked',
      validation_status: 'blocked',
      approved_at: null,
      approved_by: null,
      validation_warnings: reason ? [{ code: 'HUMAN_REJECTED', field: 'readiness_status', message: reason }] : [],
      updated_at: rejectedAt,
    })
    .eq('id', adaptationId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(`Error al rechazar adaptación: ${error?.message}`);
  }

  return updated as PlatformAdaptation;
}

/**
 * Invalida una aprobación previa tras edición de textos o render.
 */
export async function invalidatePlatformApproval(
  adaptationId: string
): Promise<PlatformAdaptation> {
  const current = await getPlatformAdaptation(adaptationId);
  if (!current) {
    throw new Error(`Adaptación con ID ${adaptationId} no encontrada.`);
  }

  const { data: updated, error } = await supabase
    .from('platform_adaptations')
    .update({
      readiness_status: current.validation_status === 'blocked' ? 'blocked' : 'valid',
      approved_at: null,
      approved_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adaptationId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(`Error al invalidar aprobación: ${error?.message}`);
  }

  return updated as PlatformAdaptation;
}

/**
 * Genera un ID de escena único y determinista si no existe.
 */
function ensureSceneId(scene: Partial<SceneMediaPlan>, index: number): string {
  if (scene.scene_id && typeof scene.scene_id === 'string' && scene.scene_id.trim()) {
    return scene.scene_id;
  }
  return `sc_${index + 1}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Reemplaza o asigna un asset específico a una escena en una adaptación dada.
 * Conserva la identidad estable (scene_id) y distingue asset_duration_seconds de duration_seconds.
 */
export async function updateAdaptationSceneAsset(
  adaptation: PlatformAdaptation,
  sceneNumberOrId: number | string,
  asset: ContentAsset,
  brandName: string
): Promise<PlatformAdaptation> {
  let assetUrl = asset.signed_url || (asset as any).public_url || (asset as any).url;
  if (!assetUrl && asset.storage_path) {
    try {
      assetUrl = await getSignedAssetUrl(asset.storage_path);
    } catch {
      assetUrl = getB2CdnUrl(asset.storage_path);
    }
  }

  const rawAssetDuration = typeof asset.duration_seconds === 'number' && asset.duration_seconds > 0
    ? asset.duration_seconds
    : null;

  const updatedScenes = adaptation.scene_mappings.map((s, idx) => {
    const isMatch = typeof sceneNumberOrId === 'string'
      ? s.scene_id === sceneNumberOrId
      : s.scene_number === sceneNumberOrId;

    if (isMatch) {
      let newSceneDuration = s.duration_seconds;
      if (rawAssetDuration !== null) {
        newSceneDuration = Math.round(rawAssetDuration);
      }

      return {
        ...s,
        scene_id: ensureSceneId(s, idx),
        asset_type: asset.asset_type === 'image' ? ('image' as const) : ('video' as const),
        source: 'real_asset' as const,
        asset_id: asset.id,
        asset_name: asset.name,
        storage_path: asset.storage_path,
        mime_type: asset.mime_type,
        asset_url: assetUrl,
        asset_duration_seconds: rawAssetDuration,
        duration_seconds: newSceneDuration,
        status: 'resolved' as const,
      };
    }
    return {
      ...s,
      scene_id: ensureSceneId(s, idx),
    };
  });

  const totalDuration = updatedScenes.reduce((acc, s) => acc + (s.duration_seconds || 4), 0);

  const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
    adaptation: { ...adaptation, scene_mappings: updatedScenes, target_duration_seconds: totalDuration },
    scenes: updatedScenes,
    brandName,
    campaignId: adaptation.campaign_id,
  });

  return savePlatformAdaptation({
    ...adaptation,
    scene_mappings: updatedScenes,
    target_duration_seconds: totalDuration,
    render_status: 'rendered',
    render_output: renderOutput,
    validation_status: validation.isValid ? 'valid' : 'blocked',
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    readiness_status: publicationPackage.readiness_status,
    publication_package: publicationPackage,
  });
}

/**
 * Desvincula el asset de una escena devolviéndola al estado 'needs_asset' sin perder textos ni directivas.
 */
export async function removeAdaptationSceneAsset(
  adaptation: PlatformAdaptation,
  sceneNumberOrId: number | string,
  brandName: string
): Promise<PlatformAdaptation> {
  const updatedScenes = adaptation.scene_mappings.map((s, idx) => {
    const isMatch = typeof sceneNumberOrId === 'string'
      ? s.scene_id === sceneNumberOrId
      : s.scene_number === sceneNumberOrId;

    if (isMatch) {
      return {
        ...s,
        scene_id: ensureSceneId(s, idx),
        source: 'needs_asset' as const,
        asset_id: null,
        asset_name: null,
        storage_path: null,
        mime_type: null,
        asset_url: null,
        asset_duration_seconds: null,
        status: 'needs_asset' as const,
      };
    }
    return {
      ...s,
      scene_id: ensureSceneId(s, idx),
    };
  });

  const totalDuration = updatedScenes.reduce((acc, s) => acc + (s.duration_seconds || 4), 0);

  const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
    adaptation: { ...adaptation, scene_mappings: updatedScenes, target_duration_seconds: totalDuration },
    scenes: updatedScenes,
    brandName,
    campaignId: adaptation.campaign_id,
  });

  return savePlatformAdaptation({
    ...adaptation,
    scene_mappings: updatedScenes,
    target_duration_seconds: totalDuration,
    render_status: 'rendered',
    render_output: renderOutput,
    validation_status: validation.isValid ? 'valid' : 'blocked',
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    readiness_status: publicationPackage.readiness_status,
    publication_package: publicationPackage,
  });
}

/**
 * Reordena las escenas finales conservando el scene_id estable y re-indexando scene_number.
 */
export async function reorderAdaptationScenes(
  adaptation: PlatformAdaptation,
  newOrderedScenes: SceneMediaPlan[],
  brandName: string
): Promise<PlatformAdaptation> {
  const reindexedScenes = newOrderedScenes.map((s, idx) => ({
    ...s,
    scene_id: ensureSceneId(s, idx),
    scene_number: idx + 1,
  }));

  const totalDuration = reindexedScenes.reduce((acc, s) => acc + (s.duration_seconds || 4), 0);

  const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
    adaptation: { ...adaptation, scene_mappings: reindexedScenes, target_duration_seconds: totalDuration },
    scenes: reindexedScenes,
    brandName,
    campaignId: adaptation.campaign_id,
  });

  return savePlatformAdaptation({
    ...adaptation,
    scene_mappings: reindexedScenes,
    target_duration_seconds: totalDuration,
    render_output: renderOutput,
    validation_status: validation.isValid ? 'valid' : 'blocked',
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    readiness_status: publicationPackage.readiness_status,
    publication_package: publicationPackage,
  });
}

/**
 * Agrega una escena final adicional al timeline de la adaptación.
 */
export async function addAdaptationScene(
  adaptation: PlatformAdaptation,
  brandName: string
): Promise<PlatformAdaptation> {
  const currentScenes = Array.isArray(adaptation.scene_mappings) ? adaptation.scene_mappings : [];
  const nextNum = currentScenes.length + 1;

  const newScene: SceneMediaPlan = {
    scene_id: `sc_${nextNum}_${Math.random().toString(36).substring(2, 9)}`,
    scene_number: nextNum,
    asset_type: 'video',
    description: `Escena adicional #${nextNum}`,
    visual_direction: 'Toma complementaria de producción',
    duration_seconds: 5,
    asset_duration_seconds: null,
    on_screen_text: '',
    transition: 'fade',
    layout: 'full_screen',
    text_position: 'middle',
    text_alignment: 'center',
    source: 'needs_asset',
    asset_id: null,
    asset_name: null,
    storage_path: null,
    mime_type: null,
    asset_url: null,
    safe_area_valid: true,
    safe_area_warning: null,
    status: 'needs_asset',
  };

  const updatedScenes = [...currentScenes, newScene].map((s, idx) => ({
    ...s,
    scene_id: ensureSceneId(s, idx),
    scene_number: idx + 1,
  }));

  const totalDuration = updatedScenes.reduce((acc, s) => acc + (s.duration_seconds || 4), 0);

  const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
    adaptation: { ...adaptation, scene_mappings: updatedScenes, target_duration_seconds: totalDuration },
    scenes: updatedScenes,
    brandName,
    campaignId: adaptation.campaign_id,
  });

  return savePlatformAdaptation({
    ...adaptation,
    scene_mappings: updatedScenes,
    target_duration_seconds: totalDuration,
    render_output: renderOutput,
    validation_status: validation.isValid ? 'valid' : 'blocked',
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    readiness_status: publicationPackage.readiness_status,
    publication_package: publicationPackage,
  });
}

/**
 * Elimina una escena final del timeline (mínimo 1 escena requerida).
 */
export async function removeAdaptationScene(
  adaptation: PlatformAdaptation,
  sceneNumberOrId: number | string,
  brandName: string
): Promise<PlatformAdaptation> {
  const currentScenes = Array.isArray(adaptation.scene_mappings) ? adaptation.scene_mappings : [];
  if (currentScenes.length <= 1) {
    throw new Error('La producción debe contener al menos 1 escena.');
  }

  const filteredScenes = currentScenes.filter((s) => {
    return typeof sceneNumberOrId === 'string'
      ? s.scene_id !== sceneNumberOrId
      : s.scene_number !== sceneNumberOrId;
  });

  const reindexedScenes = filteredScenes.map((s, idx) => ({
    ...s,
    scene_id: ensureSceneId(s, idx),
    scene_number: idx + 1,
  }));

  const totalDuration = reindexedScenes.reduce((acc, s) => acc + (s.duration_seconds || 4), 0);

  const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
    adaptation: { ...adaptation, scene_mappings: reindexedScenes, target_duration_seconds: totalDuration },
    scenes: reindexedScenes,
    brandName,
    campaignId: adaptation.campaign_id,
  });

  return savePlatformAdaptation({
    ...adaptation,
    scene_mappings: reindexedScenes,
    target_duration_seconds: totalDuration,
    render_output: renderOutput,
    validation_status: validation.isValid ? 'valid' : 'blocked',
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    readiness_status: publicationPackage.readiness_status,
    publication_package: publicationPackage,
  });
}

/**
 * Actualiza la duración de una escena individual validando contra la duración física del asset.
 */
export async function updateAdaptationSceneDuration(
  adaptation: PlatformAdaptation,
  sceneNumberOrId: number | string,
  durationSeconds: number,
  brandName: string
): Promise<PlatformAdaptation> {
  if (isNaN(durationSeconds) || durationSeconds <= 0) {
    throw new Error('La duración de la escena debe ser mayor a 0 segundos.');
  }

  const updatedScenes = adaptation.scene_mappings.map((s, idx) => {
    const isMatch = typeof sceneNumberOrId === 'string'
      ? s.scene_id === sceneNumberOrId
      : s.scene_number === sceneNumberOrId;

    if (isMatch) {
      return {
        ...s,
        scene_id: ensureSceneId(s, idx),
        duration_seconds: durationSeconds,
      };
    }
    return {
      ...s,
      scene_id: ensureSceneId(s, idx),
    };
  });

  const totalDuration = updatedScenes.reduce((acc, s) => acc + (s.duration_seconds || 4), 0);

  const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
    adaptation: { ...adaptation, scene_mappings: updatedScenes, target_duration_seconds: totalDuration },
    scenes: updatedScenes,
    brandName,
    campaignId: adaptation.campaign_id,
  });

  return savePlatformAdaptation({
    ...adaptation,
    scene_mappings: updatedScenes,
    target_duration_seconds: totalDuration,
    render_output: renderOutput,
    validation_status: validation.isValid ? 'valid' : 'blocked',
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    readiness_status: publicationPackage.readiness_status,
    publication_package: publicationPackage,
  });
}

/**
 * Actualiza campos específicos de una PlatformAdaptation existente re-evaluando validaciones.
 * Si se modifican textos en una adaptación que ya estaba aprobada, invalida la aprobación automáticamente.
 */
export async function updatePlatformAdaptation(
  id: string,
  updates: Partial<PlatformAdaptation>,
  contentItem?: ContentItem
): Promise<PlatformAdaptation> {
  const current = await getPlatformAdaptation(id);
  if (!current) {
    throw new Error(`Adaptación con ID ${id} no encontrada.`);
  }

  // Detectar si se modificaron copys
  const hasCopyChanges = 
    (updates.caption !== undefined && updates.caption !== current.caption) ||
    (updates.title !== undefined && updates.title !== current.title) ||
    (updates.hook !== undefined && updates.hook !== current.hook) ||
    (updates.cta !== undefined && updates.cta !== current.cta) ||
    (updates.hashtags !== undefined && JSON.stringify(updates.hashtags) !== JSON.stringify(current.hashtags));

  const merged = { ...current, ...updates, updated_at: new Date().toISOString() };
  const readiness = calculatePlatformReadiness(merged, contentItem);

  merged.validation_status = readiness.textReady ? 'valid' : 'blocked';
  merged.validation_errors = readiness.errors;
  merged.validation_warnings = readiness.warnings;

  // Regla FASE 11: Si hubo cambios de copy y estaba aprobada, invalidar aprobación
  if (hasCopyChanges && current.readiness_status === 'approved') {
    merged.readiness_status = readiness.isReady ? 'valid' : readiness.status === 'blocked' ? 'blocked' : 'needs_assets';
    merged.approved_at = null;
    merged.approved_by = null;
  } else if (!updates.readiness_status) {
    merged.readiness_status = readiness.isReady 
      ? (current.readiness_status === 'approved' ? 'approved' : 'valid')
      : readiness.status === 'blocked' ? 'blocked' : 'needs_assets';
  }

  const { data, error } = await supabase
    .from('platform_adaptations')
    .update({
      title: merged.title,
      hook: merged.hook,
      caption: merged.caption,
      hashtags: merged.hashtags,
      cta: merged.cta,
      scene_mappings: merged.scene_mappings,
      dimensions: merged.dimensions,
      target_duration_seconds: merged.target_duration_seconds,
      safe_area: merged.safe_area,
      platform_rules: merged.platform_rules,
      thumbnail_strategy: merged.thumbnail_strategy,
      validation_status: merged.validation_status,
      validation_errors: merged.validation_errors,
      validation_warnings: merged.validation_warnings,
      readiness_status: merged.readiness_status,
      approved_at: merged.approved_at,
      approved_by: merged.approved_by,
      updated_at: merged.updated_at,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    console.error(`Error al actualizar platform_adaptation ${id}:`, error);
    throw new Error(`Error al actualizar adaptación: ${error?.message}`);
  }

  return data as PlatformAdaptation;
}

/**
 * Calcula el estado global de aprobación y readiness de publicación para un conjunto de adaptaciones.
 */
export function calculateGlobalPublicationReadiness(
  adaptations: PlatformAdaptation[],
  renderJobsMap: Record<string, RenderJob>,
  supportedPlatforms: Array<{ key: string; label: string }> = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'youtube_shorts', label: 'YouTube Shorts' },
  ]
) {
  const platformStatuses: Record<string, {
    status: 'ready_to_publish' | 'in_review' | 'not_adapted' | 'rejected' | 'blocked';
    label: string;
    badgeColor: string;
  }> = {};

  let approvedCount = 0;
  let inReviewCount = 0;
  let notAdaptedCount = 0;
  let rejectedCount = 0;
  let blockedCount = 0;

  for (const sp of supportedPlatforms) {
    const adapt = adaptations.find(
      (a) => a.platform === sp.key || (sp.key === 'youtube_shorts' && a.platform === 'youtube')
    );

    if (!adapt) {
      notAdaptedCount++;
      platformStatuses[sp.key] = {
        status: 'not_adapted',
        label: 'No adaptada',
        badgeColor: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      };
      continue;
    }

    const job = renderJobsMap[adapt.id];
    const hasCompletedRender = job && job.status === 'completed';
    const isApproved = adapt.readiness_status === 'approved';
    const isRejected = adapt.readiness_status === 'rejected';
    const isBlocked = adapt.validation_status === 'blocked' || adapt.readiness_status === 'blocked';

    if (isApproved && hasCompletedRender) {
      approvedCount++;
      platformStatuses[sp.key] = {
        status: 'ready_to_publish',
        label: 'Listo para publicar',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    } else if (isRejected) {
      rejectedCount++;
      platformStatuses[sp.key] = {
        status: 'rejected',
        label: 'Rechazado',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    } else if (isBlocked) {
      blockedCount++;
      platformStatuses[sp.key] = {
        status: 'blocked',
        label: 'Bloqueado',
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
      };
    } else {
      inReviewCount++;
      platformStatuses[sp.key] = {
        status: 'in_review',
        label: 'Requiere revisión',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
  }

  return {
    totalSupported: supportedPlatforms.length,
    adaptedCount: adaptations.length,
    approvedCount,
    inReviewCount,
    notAdaptedCount,
    rejectedCount,
    blockedCount,
    isAllApproved: approvedCount > 0 && approvedCount === adaptations.length,
    platformStatuses,
  };
}

/**
 * Construye el RenderPackage estructurado que consumirá el motor de render deterministic (Fase 9D).
 */
export function buildRenderPackage(adaptation: PlatformAdaptation): RenderPackage {
  const scenes = Array.isArray(adaptation.scene_mappings) ? adaptation.scene_mappings : [];
  const safeArea = adaptation.safe_area || { top: 10, bottom: 20, left: 6, right: 18 };

  const packageScenes = scenes.map((s) => ({
    scene_number: s.scene_number,
    duration_seconds: s.duration_seconds,
    visual_direction: s.visual_direction,
    transition: s.transition || 'fade',
    layout: s.layout || 'full_screen',
    fit_mode: s.fit_mode || 'cover',
    crop: s.crop || { mode: 'cover' },
    asset: s.asset_id
      ? {
          asset_id: s.asset_id,
          storage_path: s.storage_path || undefined,
          mime_type: s.mime_type || undefined,
          asset_name: s.asset_name || undefined,
        }
      : null,
    text_overlay: s.on_screen_text
      ? {
          text: s.on_screen_text,
          position: s.text_position || 'middle',
          alignment: s.text_alignment || 'center',
          safe_area_valid: s.safe_area_valid !== false,
        }
      : null,
    voiceover: s.voiceover || null,
  }));

  const mediaAssets = scenes
    .filter((s) => s.asset_id)
    .map((s) => ({
      scene_number: s.scene_number,
      asset_id: s.asset_id!,
      storage_path: s.storage_path || undefined,
      mime_type: s.mime_type || undefined,
    }));

  const textLayers = scenes
    .filter((s) => s.on_screen_text)
    .map((s) => ({
      scene_number: s.scene_number,
      text: s.on_screen_text!,
      position: s.text_position || 'middle',
      alignment: s.text_alignment || 'center',
    }));

  const audioLayers = scenes
    .filter((s) => s.voiceover)
    .map((s) => ({
      scene_number: s.scene_number,
      voiceover: s.voiceover,
    }));

  const totalDuration = scenes.reduce((acc, s) => acc + s.duration_seconds, 0);

  return {
    platform: adaptation.platform,
    format: adaptation.format,
    resolution: {
      width: adaptation.dimensions?.width || 1080,
      height: adaptation.dimensions?.height || 1920,
    },
    aspect_ratio: adaptation.dimensions?.aspect_ratio || '9:16',
    duration_seconds: totalDuration,
    scenes: packageScenes,
    media_assets: mediaAssets,
    text_layers: textLayers,
    audio_layers: audioLayers,
    safe_area: safeArea,
    thumbnail_strategy: adaptation.thumbnail_strategy || { mode: 'first_frame' },
  };
}

/**
 * Sincroniza selectivamente los recursos multimedia (assets) a las demás adaptaciones
 * respetando las personalizaciones de layout, texto, duraciones y safe area propias de cada plataforma.
 */
export async function syncScenesToAllAdaptations(
  contentItemId: string,
  sourceScenes: SceneMediaPlan[],
  brandName: string,
  contentVersionId?: string | null
): Promise<PlatformAdaptation[]> {
  if (!contentItemId) return [];

  const adaptations = await getPlatformAdaptations(contentItemId, contentVersionId);
  const updatedList: PlatformAdaptation[] = [];

  for (const adaptation of adaptations) {
    const existingTargetScenes = Array.isArray(adaptation.scene_mappings) ? adaptation.scene_mappings : [];

    const updatedScenes: SceneMediaPlan[] = sourceScenes.map((source, idx) => {
      const matchingTarget = existingTargetScenes.find(
        (t) => (t.scene_id && t.scene_id === source.scene_id) || t.scene_number === source.scene_number
      );

      return {
        ...source,
        scene_id: source.scene_id || ensureSceneId(source, idx),
        scene_number: idx + 1,
        on_screen_text: matchingTarget?.on_screen_text !== undefined ? matchingTarget.on_screen_text : source.on_screen_text,
        text_position: matchingTarget?.text_position || source.text_position || 'middle',
        text_alignment: matchingTarget?.text_alignment || source.text_alignment || 'center',
        fit_mode: adaptation.format === 'post' ? 'contain' : (matchingTarget?.fit_mode || source.fit_mode || 'cover'),
      };
    });

    const totalDuration = updatedScenes.reduce((acc, s) => acc + (s.duration_seconds || 4), 0);

    const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
      adaptation: { ...adaptation, scene_mappings: updatedScenes, target_duration_seconds: totalDuration },
      scenes: updatedScenes,
      brandName,
      campaignId: adaptation.campaign_id,
    });

    const saved = await savePlatformAdaptation({
      ...adaptation,
      scene_mappings: updatedScenes,
      target_duration_seconds: totalDuration,
      render_status: 'rendered',
      render_output: renderOutput,
      validation_status: validation.isValid ? 'valid' : 'blocked',
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      readiness_status: publicationPackage.readiness_status,
      publication_package: publicationPackage,
    });

    updatedList.push(saved);
  }

  return updatedList;
}

