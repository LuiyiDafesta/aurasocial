import { supabase } from '../lib/supabase';
import { 
  PublishPackage, 
  PublishingOutboxEntry, 
  SocialPlatform 
} from '../types/publishing';
import { PlatformAdaptation } from '../types/platformAdaptation';
import { RenderJob } from '../types/renderJob';
import { 
  validatePublishPackage, 
  validateAdaptationAndRenderForPublishing 
} from './publishingValidationService';
import { getPublisherAdapter } from './publishers/socialPublisherAdapter';
import { getSocialConnection, getOrCreateMockConnection } from './socialConnectionService';

/**
 * Ensambla el snapshot inmutable del PublishPackage a partir de la adaptación aprobada y el Render Job completado.
 */
export function buildPublishPackage(
  adaptation: PlatformAdaptation,
  renderJob: RenderJob,
  brandName?: string,
  campaignName?: string,
  publishingOptions: Record<string, any> = {}
): PublishPackage {
  const meta = renderJob.output_metadata || {};

  return {
    platform: adaptation.platform as SocialPlatform,
    platform_adaptation_id: adaptation.id,
    media: {
      render_job_id: renderJob.id,
      storage_bucket: meta.storage_bucket || 'AuraSocial',
      storage_path: renderJob.output_storage_path || '',
      thumbnail_storage_path: meta.thumbnail_storage_path,
      thumbnail_url: meta.thumbnail_url,
      signed_url: meta.signed_url,
      mime_type: meta.mime_type || 'video/mp4',
      width: meta.width || adaptation.dimensions?.width || 1080,
      height: meta.height || adaptation.dimensions?.height || 1920,
      duration_seconds: meta.duration_seconds || adaptation.target_duration_seconds || 15,
      sha256: meta.sha256,
    },
    copy: {
      caption: adaptation.caption || '',
      title: adaptation.title || null,
      description: adaptation.hook || null,
      hashtags: Array.isArray(adaptation.hashtags) ? adaptation.hashtags : [],
      cta: adaptation.cta || null,
    },
    publishing_options: publishingOptions,
    campaign_context: {
      campaign_id: adaptation.campaign_id || null,
      campaign_name: campaignName || null,
    },
    source_snapshot: {
      content_item_id: adaptation.content_item_id,
      content_version_id: adaptation.content_version_id || null,
      brand_id: adaptation.brand_id,
      brand_name: brandName,
    },
    created_at: new Date().toISOString(),
  };
}

/**
 * Crea una entrada en publishing_outbox con control estricto de idempotencia y validación de calidad.
 */
export async function createOutboxEntry(params: {
  adaptation: PlatformAdaptation;
  renderJob: RenderJob;
  socialConnectionId?: string | null;
  scheduledAt?: string | null;
  brandName?: string;
  campaignName?: string;
  publishingOptions?: Record<string, any>;
}): Promise<PublishingOutboxEntry> {
  const { adaptation, renderJob, socialConnectionId, scheduledAt, brandName, campaignName, publishingOptions } = params;

  // 1. Quality Gate previo
  const preValidation = validateAdaptationAndRenderForPublishing(adaptation, renderJob);
  if (!preValidation.isValid) {
    throw new Error(`Quality Gate rechazó el paquete: ${preValidation.errors.map(e => e.message).join(' | ')}`);
  }

  // 2. Construir PublishPackage snapshot
  const publishPackage = buildPublishPackage(adaptation, renderJob, brandName, campaignName, publishingOptions);

  // 3. Validar PublishPackage con reglas de plataforma
  const packageValidation = validatePublishPackage(publishPackage);
  if (!packageValidation.isValid) {
    throw new Error(`Validación de plataforma falló: ${packageValidation.errors.map(e => e.message).join(' | ')}`);
  }

  // 4. Asegurar conexión social mock si no fue pasada
  let connId = socialConnectionId;
  if (!connId) {
    try {
      const conn = await getOrCreateMockConnection(
        adaptation.brand_id,
        adaptation.workspace_id,
        adaptation.platform as SocialPlatform,
        brandName
      );
      connId = conn.id;
    } catch (e) {
      console.warn('No se pudo asociar conexión social mock automática:', e);
    }
  }

  // 5. Control de Idempotencia: Verificar si ya existe una entrada activa
  const { data: existing } = await supabase
    .from('publishing_outbox')
    .select('*')
    .eq('platform_adaptation_id', adaptation.id)
    .eq('render_job_id', renderJob.id)
    .eq('platform', adaptation.platform)
    .not('status', 'in', '("cancelled","failed")')
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0] as PublishingOutboxEntry;
  }

  // 6. Insertar registro en Outbox
  const payload = {
    workspace_id: adaptation.workspace_id,
    brand_id: adaptation.brand_id,
    campaign_id: adaptation.campaign_id || null,
    content_item_id: adaptation.content_item_id,
    platform_adaptation_id: adaptation.id,
    render_job_id: renderJob.id,
    social_connection_id: connId || null,
    platform: adaptation.platform,
    status: scheduledAt ? 'ready' : 'ready',
    publish_package: publishPackage,
    scheduled_at: scheduledAt || null,
    queued_at: null,
    started_at: null,
    published_at: null,
    external_post_id: null,
    external_post_url: null,
    attempt_count: 0,
    last_attempt_at: null,
    error_code: null,
    error_message: null,
  };

  const { data, error } = await supabase
    .from('publishing_outbox')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    // Si hubo colisión por race condition concurrente, recuperar la existente
    if (error?.code === '23505') {
      const { data: col } = await supabase
        .from('publishing_outbox')
        .select('*')
        .eq('platform_adaptation_id', adaptation.id)
        .eq('render_job_id', renderJob.id)
        .eq('platform', adaptation.platform)
        .not('status', 'in', '("cancelled","failed")')
        .single();
      if (col) return col as PublishingOutboxEntry;
    }
    throw new Error(`Error al registrar en Publishing Outbox: ${error?.message}`);
  }

  return data as PublishingOutboxEntry;
}

/**
 * Despacha un elemento del Outbox ejecutando el Publisher Adapter correspondiente (MOCK en Fase 9E).
 */
export async function dispatchOutbox(outboxId: string): Promise<PublishingOutboxEntry> {
  const { data: outbox, error: fetchErr } = await supabase
    .from('publishing_outbox')
    .select('*')
    .eq('id', outboxId)
    .single();

  if (fetchErr || !outbox) {
    throw new Error(`Outbox entry ${outboxId} no encontrada.`);
  }

  const entry = outbox as PublishingOutboxEntry;

  if (entry.status === 'published') {
    return entry;
  }

  // 1. Actualizar a 'queued' y luego 'publishing'
  const nowIso = new Date().toISOString();
  await supabase
    .from('publishing_outbox')
    .update({
      status: 'publishing',
      queued_at: entry.queued_at || nowIso,
      started_at: nowIso,
      attempt_count: (entry.attempt_count || 0) + 1,
      last_attempt_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', outboxId);

  // 2. Obtener conexión social si existe
  let connection = null;
  if (entry.social_connection_id) {
    connection = await getSocialConnection(entry.social_connection_id);
  }

  // 3. Ejecutar Mock Publisher
  const adapter = getPublisherAdapter(entry.platform);
  const result = await adapter.publish(entry.publish_package, connection);

  if (result.success) {
    const { data: updated, error: updErr } = await supabase
      .from('publishing_outbox')
      .update({
        status: 'published',
        published_at: result.publishedAt || new Date().toISOString(),
        external_post_id: result.externalPostId,
        external_post_url: result.externalPostUrl,
        error_code: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outboxId)
      .select('*')
      .single();

    if (updErr || !updated) {
      throw new Error(`Error al actualizar outbox a publicado: ${updErr?.message}`);
    }

    return updated as PublishingOutboxEntry;
  } else {
    // Fallo de publicación
    const { data: updated, error: updErr } = await supabase
      .from('publishing_outbox')
      .update({
        status: 'failed',
        error_code: result.errorCode || 'PUBLISH_ERROR',
        error_message: result.errorMessage || 'Fallo desconocido al publicar',
        updated_at: new Date().toISOString(),
      })
      .eq('id', outboxId)
      .select('*')
      .single();

    if (updErr || !updated) {
      throw new Error(`Error al registrar fallo de publicación: ${updErr?.message}`);
    }

    return updated as PublishingOutboxEntry;
  }
}

/**
 * Publicación multi-plataforma simultánea e independiente para varias adaptaciones.
 */
export async function publishMultiPlatform(params: {
  adaptations: PlatformAdaptation[];
  renderJobsMap: Record<string, RenderJob>;
  brandName?: string;
  campaignName?: string;
  scheduledAt?: string | null;
}): Promise<PublishingOutboxEntry[]> {
  const { adaptations, renderJobsMap, brandName, campaignName, scheduledAt } = params;
  const results: PublishingOutboxEntry[] = [];

  for (const adapt of adaptations) {
    const job = renderJobsMap[adapt.id];
    if (!job) {
      console.warn(`No hay RenderJob completado para la adaptación ${adapt.platform} (${adapt.id}). Omitiendo.`);
      continue;
    }

    const outboxEntry = await createOutboxEntry({
      adaptation: adapt,
      renderJob: job,
      brandName,
      campaignName,
      scheduledAt,
    });

    if (!scheduledAt) {
      const dispatched = await dispatchOutbox(outboxEntry.id);
      results.push(dispatched);
    } else {
      results.push(outboxEntry);
    }
  }

  return results;
}

/**
 * Consulta el historial de publicaciones para una adaptación específica.
 */
export async function getOutboxForAdaptation(adaptationId: string): Promise<PublishingOutboxEntry[]> {
  if (!adaptationId) return [];

  const { data, error } = await supabase
    .from('publishing_outbox')
    .select('*')
    .eq('platform_adaptation_id', adaptationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error al consultar outbox para adaptación ${adaptationId}:`, error);
    return [];
  }

  return (data as PublishingOutboxEntry[]) || [];
}

/**
 * Consulta el historial de publicaciones para una marca entera.
 */
export async function getOutboxHistoryForBrand(brandId: string): Promise<PublishingOutboxEntry[]> {
  if (!brandId) return [];

  const { data, error } = await supabase
    .from('publishing_outbox')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error al consultar historial de publicaciones para marca ${brandId}:`, error);
    return [];
  }

  return (data as PublishingOutboxEntry[]) || [];
}

/**
 * Cancela una entrada de Outbox en estado pendiente o fallido.
 */
export async function cancelOutboxEntry(outboxId: string): Promise<boolean> {
  const { error } = await supabase
    .from('publishing_outbox')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', outboxId)
    .in('status', ['ready', 'queued', 'failed']);

  if (error) {
    console.error(`Error al cancelar outbox ${outboxId}:`, error);
    return false;
  }

  return true;
}

/**
 * Reintenta una publicación fallida.
 */
export async function retryOutboxEntry(outboxId: string): Promise<PublishingOutboxEntry> {
  await supabase
    .from('publishing_outbox')
    .update({
      status: 'ready',
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', outboxId);

  return dispatchOutbox(outboxId);
}
