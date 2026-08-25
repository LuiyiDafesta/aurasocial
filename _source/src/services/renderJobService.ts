import { supabase } from '../lib/supabase';
import { 
  RenderJob, 
  RenderJobStatus, 
  RenderMediaValidationResult, 
  MissingMediaDetail 
} from '../types/renderJob';
import { PlatformAdaptation } from '../types/platformAdaptation';
import { getPlatformAdaptation, buildRenderPackage } from './platformAdaptationService';
import { getB2SignedUrl } from '../lib/b2Storage';

/**
 * Quality Guard para Render Jobs (Fase 12E.1 / Fase 16.1):
 * Valida de forma estricta que la adaptación contenga escenas y que cada slot/escena requerida
 * tenga un asset asignado con una ruta de almacenamiento (storage_path) válida en Backblaze B2.
 */
export function validateMediaForRender(
  adaptation: PlatformAdaptation | null | undefined
): RenderMediaValidationResult {
  if (!adaptation) {
    return {
      can_render: false,
      code: 'RENDER_MEDIA_REQUIRED',
      errors: ['La adaptación no existe o es inválida.'],
      missing_slots: [{ scene_number: 1, reason: 'missing_asset', message: 'Adaptación inexistente o inválida.' }],
      summary_message: 'Faltan medios para renderizar: Adaptación inexistente.',
    };
  }

  const scenes = Array.isArray(adaptation.scene_mappings) ? adaptation.scene_mappings : [];
  const errors: string[] = [];
  const missing_slots: MissingMediaDetail[] = [];

  // A. Validar existencia de al menos una escena
  if (scenes.length === 0) {
    errors.push('snapshot has no scenes');
    missing_slots.push({
      scene_number: 1,
      reason: 'missing_asset',
      message: 'Sin escenas configuradas: La adaptación no tiene slots multimedia mapeados.',
    });
    return {
      can_render: false,
      code: 'RENDER_MEDIA_REQUIRED',
      errors,
      missing_slots,
      summary_message: 'Faltan medios para renderizar: La adaptación no contiene escenas configuradas.',
    };
  }

  // B, C, D. Validar cada escena y slot multimedia requerido
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneNum = scene.scene_number || i + 1;
    const slotId = (scene as any).slot_id || `slot_sc${sceneNum}_01`;

    // D. Estado needs_asset explícito
    if (scene.status === 'needs_asset' || (scene.source as string) === 'needs_asset') {
      errors.push(`scene ${sceneNum} has status needs_asset`);
      missing_slots.push({
        scene_number: sceneNum,
        slot_id: slotId,
        reason: 'missing_asset',
        message: `scene ${sceneNum} tiene estado needs_asset (requiere asignación multimedia).`,
      });
    }

    // B. Validar asignación de asset_id
    if (!scene.asset_id || typeof scene.asset_id !== 'string' || !scene.asset_id.trim()) {
      errors.push(`scene ${sceneNum} has no asset_id`);
      missing_slots.push({
        scene_number: sceneNum,
        slot_id: slotId,
        reason: 'missing_asset',
        message: `scene ${sceneNum} no tiene asset_id asignado.`,
      });
    }

    // B. Validar storage_path
    if (!scene.storage_path || typeof scene.storage_path !== 'string' || !scene.storage_path.trim()) {
      errors.push(`scene ${sceneNum} has no storage_path`);
      missing_slots.push({
        scene_number: sceneNum,
        slot_id: slotId,
        reason: 'empty_storage_path',
        message: `scene ${sceneNum} no tiene storage_path válido en Backblaze B2.`,
      });
    }

    // C. Validar duración mayor a 0
    const duration = Number(scene.duration_seconds);
    if (isNaN(duration) || duration <= 0) {
      errors.push(`scene ${sceneNum} has invalid duration (${scene.duration_seconds}s)`);
      missing_slots.push({
        scene_number: sceneNum,
        slot_id: slotId,
        reason: 'invalid_duration',
        message: `scene ${sceneNum} debe tener duración mayor a 0 segundos.`,
      });
    }

    // D. Validar rangos de recorte si existen
    if (scene.source_start_seconds !== undefined && scene.source_start_seconds !== null) {
      if (isNaN(scene.source_start_seconds) || scene.source_start_seconds < 0) {
        errors.push(`scene ${sceneNum} has invalid source_start_seconds (${scene.source_start_seconds}s)`);
        missing_slots.push({
          scene_number: sceneNum,
          slot_id: slotId,
          reason: 'invalid_duration',
          message: `scene ${sceneNum} tiene un inicio de fragmento inválido (${scene.source_start_seconds}s < 0).`,
        });
      }
    }

    if (scene.source_end_seconds !== undefined && scene.source_end_seconds !== null) {
      const start = scene.source_start_seconds || 0;
      if (isNaN(scene.source_end_seconds) || scene.source_end_seconds <= start) {
        errors.push(`scene ${sceneNum} has invalid source_end_seconds (${scene.source_end_seconds}s <= ${start}s)`);
        missing_slots.push({
          scene_number: sceneNum,
          slot_id: slotId,
          reason: 'invalid_duration',
          message: `scene ${sceneNum} tiene fin de fragmento (${scene.source_end_seconds}s) menor o igual al inicio (${start}s).`,
        });
      }

      if (scene.asset_duration_seconds && scene.source_end_seconds > scene.asset_duration_seconds + 0.1) {
        errors.push(`scene ${sceneNum} source_end_seconds (${scene.source_end_seconds}s) exceeds asset_duration (${scene.asset_duration_seconds}s)`);
        missing_slots.push({
          scene_number: sceneNum,
          slot_id: slotId,
          reason: 'invalid_duration',
          message: `scene ${sceneNum} excede la duración física del video (${scene.source_end_seconds}s > ${scene.asset_duration_seconds}s).`,
        });
      }
    }
  }

  // E, F. Validar RenderPackage Snapshot
  const renderPackage = buildRenderPackage(adaptation);
  if (!renderPackage.scenes || renderPackage.scenes.length === 0) {
    if (errors.length === 0) {
      errors.push('snapshot has no scenes');
      missing_slots.push({
        scene_number: 1,
        reason: 'missing_asset',
        message: 'Paquete de render sin escenas estructuradas.',
      });
    }
  }

  if (!renderPackage.media_assets || renderPackage.media_assets.length === 0) {
    if (errors.length === 0) {
      errors.push('snapshot has no media_assets');
      missing_slots.push({
        scene_number: 1,
        reason: 'missing_asset',
        message: 'Paquete de render sin media assets válidos.',
      });
    }
  } else if (renderPackage.media_assets.length !== renderPackage.scenes.length) {
    errors.push(`snapshot media_assets count (${renderPackage.media_assets.length}) does not match scenes count (${renderPackage.scenes.length})`);
    missing_slots.push({
      scene_number: renderPackage.scenes.length,
      reason: 'missing_asset',
      message: `Solo ${renderPackage.media_assets.length} de ${renderPackage.scenes.length} escenas tienen medios asignados.`,
    });
  }

  if (renderPackage.duration_seconds <= 0) {
    if (errors.length === 0) {
      errors.push('snapshot duration_seconds is 0');
    }
  }

  const canRender = errors.length === 0 && missing_slots.length === 0;

  return {
    can_render: canRender,
    code: canRender ? 'RENDER_MEDIA_VALID' : 'RENDER_MEDIA_REQUIRED',
    errors,
    missing_slots,
    summary_message: canRender
      ? 'Todos los assets y slots multimedia están correctamente configurados.'
      : `Faltan medios para renderizar (${missing_slots.length} observación/es): ${errors.join('; ')}`,
  };
}

/**
 * Consulta un Render Job por su ID y actualiza URLs firmadas si está completado.
 */
export async function getRenderJob(jobId: string): Promise<RenderJob | null> {
  if (!jobId) return null;

  const { data, error } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    console.error(`Error al obtener render_job ${jobId}:`, error);
    return null;
  }

  const job = data as RenderJob;

  // Si está completado y tiene storage path, regenerar Signed URL fresca
  if (job.status === 'completed' && job.output_storage_path) {
    try {
      const freshSignedUrl = await getB2SignedUrl(job.output_storage_path, 3600);
      let thumbFreshUrl = job.output_metadata?.thumbnail_url;
      if (job.output_metadata?.thumbnail_storage_path) {
        thumbFreshUrl = await getB2SignedUrl(job.output_metadata.thumbnail_storage_path, 3600);
      }

      job.output_metadata = {
        ...job.output_metadata,
        signed_url: freshSignedUrl,
        thumbnail_url: thumbFreshUrl,
      };
    } catch (urlErr) {
      console.warn('No se pudo regenerar signed URL para render job:', urlErr);
    }
  }

  return job;
}

/**
 * Consulta el historial de todos los Render Jobs para una adaptación dada.
 */
export async function getRenderJobsForAdaptation(adaptationId: string): Promise<RenderJob[]> {
  if (!adaptationId) return [];

  const { data, error } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('platform_adaptation_id', adaptationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al listar render_jobs:', error);
    return [];
  }

  return (data as RenderJob[]) || [];
}

/**
 * Crea o recupera un Render Job con snapshot inmutable y despacha el worker determinista.
 * Quality Guard Fase 12E.1 / 16.1: Impide estrictamente la creación de jobs sin media válido.
 */
export async function createRenderJob(
  adaptationId: string,
  _userId?: string
): Promise<RenderJob> {
  const adaptation = await getPlatformAdaptation(adaptationId);
  if (!adaptation) {
    throw new Error(`Adaptación ${adaptationId} no encontrada.`);
  }

  // 1. QUALITY GUARD OBLIGATORIO: Validar que todos los slots requeridos tengan media con storage_path
  const mediaValidation = validateMediaForRender(adaptation);
  if (!mediaValidation.can_render) {
    const err: any = new Error(
      `RENDER_MEDIA_REQUIRED: No se puede crear el Render Job. ${mediaValidation.summary_message}`
    );
    err.code = 'RENDER_MEDIA_REQUIRED';
    err.details = mediaValidation;
    throw err;
  }

  // 2. Verificar idempotencia: buscar si ya hay un job en curso
  const activeStatuses: RenderJobStatus[] = ['queued', 'preparing', 'rendering', 'validating', 'uploading'];
  const { data: existingActive } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('platform_adaptation_id', adaptationId)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingActive && existingActive.length > 0) {
    return existingActive[0] as RenderJob;
  }

  // 3. Snapshot inmutable del RenderPackage (Fase 9C Contract)
  const renderPackageSnapshot = buildRenderPackage(adaptation);

  // 4. Guardia Final antes de Insertar: Verificar integridad estricta del snapshot
  if (
    !renderPackageSnapshot.scenes ||
    renderPackageSnapshot.scenes.length === 0 ||
    !renderPackageSnapshot.media_assets ||
    renderPackageSnapshot.media_assets.length === 0 ||
    renderPackageSnapshot.media_assets.length !== renderPackageSnapshot.scenes.length ||
    renderPackageSnapshot.scenes.some((s) => !s.asset?.storage_path || !s.asset?.asset_id)
  ) {
    const err: any = new Error(
      'RENDER_MEDIA_REQUIRED: Fallo de verificación final del snapshot de render antes de insertar en base de datos.'
    );
    err.code = 'RENDER_MEDIA_REQUIRED';
    throw err;
  }

  // 5. Crear registro de Render Job
  const payload = {
    workspace_id: adaptation.workspace_id,
    brand_id: adaptation.brand_id,
    campaign_id: adaptation.campaign_id || null,
    content_item_id: adaptation.content_item_id,
    platform_adaptation_id: adaptation.id,
    content_version_id: adaptation.content_version_id || null,
    status: 'queued',
    progress: 5,
    current_step: 'queued',
    render_package_snapshot: renderPackageSnapshot,
    output_storage_path: null,
    output_metadata: {},
    error_message: null,
  };

  const { data, error } = await supabase
    .from('render_jobs')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error al crear render_job:', error);
    throw new Error(`Error al iniciar Render Job: ${error?.message}`);
  }

  const createdJob = data as RenderJob;

  // Actualizar estado de adaptación a rendering
  await supabase
    .from('platform_adaptations')
    .update({ render_status: 'rendering', updated_at: new Date().toISOString() })
    .eq('id', adaptationId);

  return createdJob;
}

/**
 * Aprobación humana explícita del render MP4 generado.
 */
export async function approveRender(
  adaptationId: string,
  _jobId?: string,
  userId?: string
): Promise<PlatformAdaptation> {
  const adaptation = await getPlatformAdaptation(adaptationId);
  if (!adaptation) {
    throw new Error(`Adaptación ${adaptationId} no encontrada.`);
  }

  if (adaptation.render_status !== 'rendered') {
    throw new Error('Solo se pueden aprobar adaptaciones con renderizado completado.');
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

  const { data, error } = await supabase
    .from('platform_adaptations')
    .update({
      readiness_status: 'approved',
      approved_at: approvedAt,
      approved_by: approvedBy,
      updated_at: approvedAt,
    })
    .eq('id', adaptationId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Error al aprobar adaptación: ${error?.message}`);
  }

  return data as PlatformAdaptation;
}
