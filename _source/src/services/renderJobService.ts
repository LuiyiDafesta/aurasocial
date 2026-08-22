import { supabase } from '../lib/supabase';
import { RenderJob, RenderJobStatus } from '../types/renderJob';
import { PlatformAdaptation } from '../types/platformAdaptation';
import { getPlatformAdaptation, buildRenderPackage } from './platformAdaptationService';
import { getB2SignedUrl } from '../lib/b2Storage';

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
 */
export async function createRenderJob(
  adaptationId: string,
  _userId?: string
): Promise<RenderJob> {
  const adaptation = await getPlatformAdaptation(adaptationId);
  if (!adaptation) {
    throw new Error(`Adaptación ${adaptationId} no encontrada.`);
  }

  // 1. Verificar idempotencia: buscar si ya hay un job en curso
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

  // 2. Snapshot inmutable del RenderPackage (Fase 9C Contract)
  const renderPackageSnapshot = buildRenderPackage(adaptation);

  // 3. Crear registro de Render Job
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
  const approvedBy = userId || '00000000-0000-0000-0000-000000000000';

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
