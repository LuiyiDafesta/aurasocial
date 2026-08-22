import { supabase } from '../lib/supabase';
import { ContentItem } from '../types/contentItem';
import { ContentVersion } from '../types/contentVersion';
import { ContentAsset } from '../types/contentAsset';
import {
  PlatformAdaptation,
  TargetPlatform,
  TargetFormat,
  PlatformDimensions,
  PublicationPackage,
} from '../types/platformAdaptation';
import { planMediaForContent } from './mediaPlannerService';
import { composeAndRenderAdaptation } from './renderService';

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
 * Consulta todas las adaptaciones asociadas a un content_item (y opcionalmente a una versión).
 */
export async function getPlatformAdaptations(
  contentItemId: string,
  contentVersionId?: string | null
): Promise<PlatformAdaptation[]> {
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
 * Guarda o actualiza una adaptación de plataforma en Supabase.
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
    dimensions: adaptation.dimensions || { width: 1080, height: 1920, aspect_ratio: '9:16' },
    target_duration_seconds: adaptation.target_duration_seconds,
    caption: adaptation.caption,
    hashtags: adaptation.hashtags || [],
    cta: adaptation.cta,
    scene_mappings: adaptation.scene_mappings || [],
    render_status: adaptation.render_status || 'not_started',
    render_output: adaptation.render_output || {},
    validation_status: adaptation.validation_status || 'pending',
    validation_errors: adaptation.validation_errors || [],
    validation_warnings: adaptation.validation_warnings || [],
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
      .upsert(payload, { onConflict: 'content_version_id, platform, format' })
      .select('*')
      .single();
  }

  if (res.error) {
    console.error('Error al guardar platform_adaptation:', res.error);
    throw new Error(`Error al guardar adaptación: ${res.error.message}`);
  }

  return res.data as PlatformAdaptation;
}

/**
 * Genera de forma automatizada las 4 adaptaciones estándar (Instagram, TikTok, Facebook, LinkedIn)
 * a partir de un content_item y su versión activa.
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

  // 1. Ejecutar Media Planner
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

    // 2. Ejecutar render determinista y validación
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
    rawAdaptation.readiness_status = publicationPackage.readiness_status; // 'valid' o 'needs_assets' o 'blocked'
    rawAdaptation.publication_package = publicationPackage;

    const saved = await savePlatformAdaptation(rawAdaptation);
    adaptations.push(saved);
  }

  return adaptations;
}

/**
 * Aprobación Humana Explícita de una Adaptación (Fase 9A.4)
 * Pasa el estado exclusivamente de VALID -> APPROVED.
 */
export async function approvePlatformAdaptation(
  adaptationId: string,
  userId?: string
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

  if (adaptation.readiness_status !== 'valid') {
    throw new Error(
      `Solo las adaptaciones en estado 'VALID' pueden ser aprobadas (Estado actual: '${adaptation.readiness_status}'). Corrija las validaciones primero.`
    );
  }

  const approvedAt = new Date().toISOString();
  const approvedBy = userId || '00000000-0000-0000-0000-000000000000';

  const updatedPackage: PublicationPackage = {
    ...(adaptation.publication_package as PublicationPackage),
    readiness_status: 'approved',
    approved_at: approvedAt,
    approved_by: approvedBy,
  };

  return savePlatformAdaptation({
    ...adaptation,
    readiness_status: 'approved',
    approved_at: approvedAt,
    approved_by: approvedBy,
    publication_package: updatedPackage,
  });
}

/**
 * Reemplaza o asigna un asset específico a una escena en una adaptación dada.
 */
export async function updateAdaptationSceneAsset(
  adaptation: PlatformAdaptation,
  sceneNumber: number,
  asset: ContentAsset,
  brandName: string
): Promise<PlatformAdaptation> {
  const updatedScenes = adaptation.scene_mappings.map((s) => {
    if (s.scene_number === sceneNumber) {
      return {
        ...s,
        source: 'real_asset' as const,
        asset_id: asset.id,
        asset_name: asset.name,
        storage_path: asset.storage_path,
        mime_type: asset.mime_type,
        asset_url: asset.signed_url || (asset as any).public_url || s.asset_url,
        status: 'resolved' as const,
      };
    }
    return s;
  });

  const { renderOutput, publicationPackage, validation } = await composeAndRenderAdaptation({
    adaptation: { ...adaptation, scene_mappings: updatedScenes },
    scenes: updatedScenes,
    brandName,
    campaignId: adaptation.campaign_id,
  });

  return savePlatformAdaptation({
    ...adaptation,
    scene_mappings: updatedScenes,
    render_status: 'rendered',
    render_output: renderOutput,
    validation_status: validation.isValid ? 'valid' : 'blocked',
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    readiness_status: publicationPackage.readiness_status,
    publication_package: publicationPackage,
  });
}
