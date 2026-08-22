import { supabase } from '../lib/supabase';
import { ContentItem, ContentScene } from '../types/contentItem';
import { SceneMediaPlan, AssetResolutionSource } from '../types/platformAdaptation';
import { defaultMockMediaProvider } from './mediaProviders/mockMediaProvider';

export interface MediaPlanningOptions {
  allowPlaceholders?: boolean;
  aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5';
}

export interface MediaPlanResult {
  scenePlans: SceneMediaPlan[];
  isFullyResolved: boolean;
  needsAssetsCount: number;
  unresolvedScenes: number[];
}

/**
 * Servicio Media Planner (Fase 9A)
 * Convierte los media_requirements y scenes del brief en necesidades
 * reales de producción, resolviendo en orden estricto de prioridad:
 * 1. Asset real asignado al contenido (content_item_id)
 * 2. Asset reutilizable de campaña (campaign_id)
 * 3. Asset de marca (brand_id)
 * 4. Stock / Placeholder determinista
 * Si falta un recurso y no hay placeholder, marca explícitamente NEEDS_ASSET.
 */
export async function planMediaForContent(
  item: ContentItem,
  options: MediaPlanningOptions = { allowPlaceholders: true, aspectRatio: '9:16' }
): Promise<MediaPlanResult> {
  const scenes: ContentScene[] = Array.isArray(item.scenes) && item.scenes.length > 0
    ? item.scenes
    : [
        {
          scene_number: 1,
          visual_direction: item.creative_direction || 'Composición principal de la publicación',
          duration_seconds: 5,
          on_screen_text: item.hook || item.title || '',
          voiceover: item.script || '',
        },
      ];

  // 1. Buscar assets disponibles en la base de datos (con orden jerárquico de prioridad)
  let availableAssets: any[] = [];
  try {
    const { data } = await supabase
      .from('content_assets')
      .select('*')
      .eq('brand_id', item.brand_id);
    availableAssets = data || [];
  } catch (err) {
    console.warn('Advertencia al consultar biblioteca de assets en MediaPlanner:', err);
  }

  // Filtrar por pertenencia
  const contentAssets = availableAssets.filter((a) => a.content_item_id === item.id);
  const campaignAssets = item.campaign_id
    ? availableAssets.filter((a) => a.campaign_id === item.campaign_id && !a.content_item_id)
    : [];
  const brandAssets = availableAssets.filter(
    (a) => !a.content_item_id && !a.campaign_id && a.brand_id === item.brand_id
  );

  const scenePlans: SceneMediaPlan[] = [];
  let needsAssetsCount = 0;
  const unresolvedScenes: number[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneNum = scene.scene_number || i + 1;
    const isVideo = item.content_type?.toLowerCase().includes('reel') ||
                    item.content_type?.toLowerCase().includes('video') ||
                    item.content_type?.toLowerCase().includes('tiktok');
    const assetType: 'video' | 'image' | 'audio' = isVideo ? 'video' : 'image';

    // Prioridad 1: Asset real asignado al contenido en este índice
    const assignedDirect = contentAssets[i];
    // Prioridad 2: Asset de campaña disponible
    const assignedCampaign = campaignAssets[i];
    // Prioridad 3: Asset general de la marca
    const assignedBrand = brandAssets[i];

    let resolvedSource: AssetResolutionSource = 'needs_asset';
    let assetId: string | null = null;
    let assetName: string | null = null;
    let assetUrl: string | null = null;
    let storagePath: string | null = null;
    let mimeType: string | null = null;

    if (assignedDirect) {
      resolvedSource = 'real_asset';
      assetId = assignedDirect.id;
      assetName = assignedDirect.name;
      storagePath = assignedDirect.storage_path;
      mimeType = assignedDirect.mime_type;
      assetUrl = assignedDirect.public_url || null;
    } else if (assignedCampaign) {
      resolvedSource = 'campaign_asset';
      assetId = assignedCampaign.id;
      assetName = assignedCampaign.name;
      storagePath = assignedCampaign.storage_path;
      mimeType = assignedCampaign.mime_type;
      assetUrl = assignedCampaign.public_url || null;
    } else if (assignedBrand) {
      resolvedSource = 'brand_asset';
      assetId = assignedBrand.id;
      assetName = assignedBrand.name;
      storagePath = assignedBrand.storage_path;
      mimeType = assignedBrand.mime_type;
      assetUrl = assignedBrand.public_url || null;
    } else if (options.allowPlaceholders) {
      // Prioridad 4: Placeholder determinista seguro a costo $0.00
      resolvedSource = 'placeholder';
      const prompt = scene.visual_direction || `Escena ${sceneNum} para ${item.title}`;
      if (assetType === 'video') {
        const mockVideo = await defaultMockMediaProvider.generateVideo({
          prompt,
          mediaType: 'video',
          aspectRatio: options.aspectRatio || '9:16',
          durationSeconds: scene.duration_seconds || 5,
        });
        assetUrl = mockVideo.mediaUrl;
        mimeType = 'video/mp4';
      } else {
        const mockImg = await defaultMockMediaProvider.generateImage({
          prompt,
          mediaType: 'image',
          aspectRatio: options.aspectRatio || '9:16',
        });
        assetUrl = mockImg.mediaUrl;
        mimeType = 'image/svg+xml';
      }
      assetName = `Placeholder Escena ${sceneNum}`;
    }

    const isResolved = resolvedSource !== 'needs_asset';
    if (!isResolved) {
      needsAssetsCount++;
      unresolvedScenes.push(sceneNum);
    }

    // Validación preliminar de Safe Text
    const onScreenText = scene.on_screen_text || '';
    const isSafeText = onScreenText.length < 120 && (onScreenText.match(/\n/g) || []).length < 4;

    scenePlans.push({
      scene_number: sceneNum,
      asset_type: assetType,
      description: scene.visual_direction || `Requerimiento visual de la Escena ${sceneNum}`,
      visual_direction: scene.visual_direction,
      camera_direction: scene.camera_direction,
      duration_seconds: scene.duration_seconds || 5,
      on_screen_text: onScreenText,
      voiceover: scene.voiceover,
      transition: scene.transition,
      source: resolvedSource,
      asset_id: assetId,
      asset_name: assetName,
      asset_url: assetUrl,
      storage_path: storagePath,
      mime_type: mimeType,
      safe_area_valid: isSafeText,
      safe_area_warning: isSafeText ? null : 'El texto supera el tamaño seguro recomendado para móvil',
      status: isResolved ? 'resolved' : 'needs_asset',
    });
  }

  return {
    scenePlans,
    isFullyResolved: needsAssetsCount === 0,
    needsAssetsCount,
    unresolvedScenes,
  };
}
