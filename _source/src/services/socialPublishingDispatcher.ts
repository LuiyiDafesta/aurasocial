import { supabase } from '../lib/supabase';
import { 
  PublishingOutboxEntry, 
  PublishPackage, 
  SocialConnection, 
  SocialPlatform 
} from '../types/publishing';
import { MetaPublishDetailedResult } from './publishers/MetaPublisher';
import { getMediaDownloadUrl } from './publishingOutboxService';
import { validatePublishPackage } from './publishingValidationService';
import { socialProviderRegistry } from './socialProviders/socialProviderRegistry';

export interface DispatchOutboxOptions {
  forceMock?: boolean;
}

/**
 * Servicio centralizado de despacho asíncrono e idempotente de publicaciones en redes sociales.
 * 
 * Reglas de Arquitectura:
 * 1. Atomic Claim: Previene ejecuciones concurrentes del mismo outbox entry.
 * 2. Snapshot Immutability: Opera estrictamente sobre el publish_package serializado.
 * 3. Pre-Publish Quality Gate: Re-valida el paquete antes de cualquier llamada externa.
 * 4. Clasificación de Retries: Reintenta errores transitorios y detiene errores permanentes.
 */
export async function dispatchOutboxEntry(
  outboxId: string,
  options: DispatchOutboxOptions = {}
): Promise<PublishingOutboxEntry> {
  const { forceMock = false } = options;

  // 1. ATOMIC CLAIM: Consultar y transicionar a estado 'processing'
  const { data: currentEntry, error: fetchError } = await supabase
    .from('publishing_outbox')
    .select('*')
    .eq('id', outboxId)
    .single();

  if (fetchError || !currentEntry) {
    throw new Error(`Publicación Outbox ${outboxId} no encontrada.`);
  }

  const outbox = currentEntry as PublishingOutboxEntry;

  if (outbox.status === 'published') {
    return outbox; // Idempotencia: Ya publicado con éxito
  }

  if (outbox.status === 'processing') {
    // Si ya está en procesamiento activo hace menos de 2 minutos, evitar colisión concurrente
    const startedAt = outbox.started_at ? new Date(outbox.started_at).getTime() : 0;
    if (Date.now() - startedAt < 120000) {
      return outbox;
    }
  }

  const nextAttemptCount = (outbox.attempt_count || 0) + 1;
  const nowIso = new Date().toISOString();

  // Marcar atómicamente como processing
  const { data: claimed, error: claimError } = await supabase
    .from('publishing_outbox')
    .update({
      status: 'processing',
      started_at: nowIso,
      attempt_count: nextAttemptCount,
      last_attempt_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', outboxId)
    .select('*')
    .single();

  if (claimError || !claimed) {
    throw new Error(`Error en Atomic Claim de outbox ${outboxId}: ${claimError?.message}`);
  }

  const activeOutbox = claimed as PublishingOutboxEntry;
  const pkg: PublishPackage = typeof activeOutbox.publish_package === 'string'
    ? JSON.parse(activeOutbox.publish_package)
    : activeOutbox.publish_package;

  try {
    // 2. PRE-PUBLISH QUALITY GATE REVALIDATION
    const validation = validatePublishPackage(pkg);
    if (!validation.isValid) {
      const errorMsg = validation.errors.map(e => e.message).join(' | ');
      return await markOutboxFailed(outboxId, 'QUALITY_GATE_REJECTED', errorMsg);
    }

    // 3. CARGAR Y VALIDAR SOCIAL CONNECTION SI APLICA
    let connection: SocialConnection | null = null;
    if (activeOutbox.social_connection_id) {
      const { data: connData } = await supabase
        .from('social_connections')
        .select('*')
        .eq('id', activeOutbox.social_connection_id)
        .single();
      
      connection = connData as SocialConnection | null;

      if (!connection) {
        return await markOutboxFailed(outboxId, 'CONNECTION_NOT_FOUND', 'La cuenta social configurada ya no existe.');
      }

      if (connection.status === 'disconnected' || connection.status === 'revoked') {
        return await markOutboxFailed(outboxId, 'CONNECTION_INACTIVE', `La cuenta de ${connection.platform} fue desconectada o revocada.`);
      }

      if (connection.status === 'expired') {
        return await markOutboxFailed(outboxId, 'TOKEN_EXPIRED', 'El token de la cuenta social expiró. Se requiere re-conectar.');
      }

      // Validar aprobación humana obligatoria para publicación real
      const isMockMode = forceMock || connection.status === 'mock_connected';
      if (!isMockMode && connection.status === 'connected') {
        const { data: adaptData } = await supabase
          .from('platform_adaptations')
          .select('approved_at, approved_by, readiness_status')
          .eq('id', activeOutbox.platform_adaptation_id)
          .single();

        if (!adaptData || !adaptData.approved_at || !adaptData.approved_by || adaptData.readiness_status === 'rejected') {
          return await markOutboxFailed(outboxId, 'NOT_APPROVED', 'La publicación real requiere aprobación humana explícita previa (approved_at, approved_by).');
        }
      }
    }

    // 4. RESOLVER SIGNED URL DE BACKBLAZE B2 PARA INGESTA EXTERNA
    const storagePath = pkg.media.storage_path;
    if (!storagePath) {
      return await markOutboxFailed(outboxId, 'MISSING_MEDIA_PATH', 'Falta la ruta del archivo de video renderizado.');
    }

    let videoSignedUrl = pkg.media.signed_url;
    if (!videoSignedUrl || !videoSignedUrl.startsWith('http')) {
      videoSignedUrl = await getMediaDownloadUrl(storagePath, 7200); // 2 horas de validez para Meta
    }

    // 5. EJECUCIÓN DE PUBLICACIÓN A TRAVÉS DE LA CAPA ABSTRACTA DE PROVEEDORES
    // Resuelve deterministamente el proveedor (Socialit PRIMARY -> Robin Research SECONDARY -> Otros)
    const platform = activeOutbox.platform as SocialPlatform;
    const isMockMode = forceMock || connection?.status === 'mock_connected' || !connection;

    const resolved = socialProviderRegistry.resolveProvider({
      platform,
      preferredProvider: connection?.provider,
    });
    const provider = resolved.provider;

    const providerResult = await provider.publish({
      connection: connection || {
        id: 'mock',
        workspace_id: activeOutbox.workspace_id,
        brand_id: activeOutbox.brand_id,
        platform,
        account_id: `mock_${platform}`,
        account_name: `Mock ${platform}`,
        status: 'mock_connected',
        scopes: [],
        metadata: {},
        created_at: nowIso,
        updated_at: nowIso,
      },
      publishPackage: pkg,
      videoUrl: videoSignedUrl,
      isMock: isMockMode,
    });

    const publishResult: MetaPublishDetailedResult = {
      success: providerResult.success,
      externalPostId: providerResult.externalPostId,
      externalPostUrl: providerResult.externalPostUrl,
      publishedAt: providerResult.publishedAt,
      errorCode: providerResult.errorCode,
      errorMessage: providerResult.errorMessage,
      errorType: providerResult.errorType,
      retryAfterSeconds: providerResult.retryAfterSeconds,
    };

    // 6. PROCESAMIENTO DEL RESULTADO Y POLÍTICA DE RETRIES
    if (publishResult.success && publishResult.externalPostId) {
      return await markOutboxPublished(outboxId, activeOutbox.platform_adaptation_id, publishResult);
    }

    // Manejo de Fallo
    const errType = publishResult.errorType || 'permanent';
    if ((errType === 'transient' || errType === 'rate_limit') && nextAttemptCount < 3) {
      return await markOutboxRetrying(
        outboxId,
        publishResult.errorCode || 'TRANSIENT_ERROR',
        publishResult.errorMessage || 'Error temporal de red en Meta'
      );
    } else {
      return await markOutboxFailed(
        outboxId,
        publishResult.errorCode || 'PUBLISH_FAILED',
        publishResult.errorMessage || 'Error definitivo al publicar en la red social'
      );
    }

  } catch (err: any) {
    console.error(`Excepción no controlada en dispatch de outbox ${outboxId}:`, err);
    if (nextAttemptCount < 3) {
      return await markOutboxRetrying(outboxId, 'UNCAUGHT_EXCEPTION', err.message);
    } else {
      return await markOutboxFailed(outboxId, 'UNCAUGHT_EXCEPTION', err.message);
    }
  }
}

/**
 * Marca la entrada en estado 'published' y actualiza la adaptación asociada.
 */
async function markOutboxPublished(
  outboxId: string,
  adaptationId: string,
  result: MetaPublishDetailedResult
): Promise<PublishingOutboxEntry> {
  const now = result.publishedAt || new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('publishing_outbox')
    .update({
      status: 'published',
      published_at: now,
      external_post_id: result.externalPostId,
      external_post_url: result.externalPostUrl,
      error_code: null,
      error_message: null,
      updated_at: now,
    })
    .eq('id', outboxId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(`Error al actualizar outbox a publicado: ${error?.message}`);
  }

  // Actualizar platform_adaptations
  await supabase
    .from('platform_adaptations')
    .update({
      readiness_status: 'published',
      updated_at: now,
    })
    .eq('id', adaptationId);

  return updated as PublishingOutboxEntry;
}

/**
 * Marca la entrada en estado 'retrying'.
 */
async function markOutboxRetrying(
  outboxId: string,
  errorCode: string,
  errorMessage: string
): Promise<PublishingOutboxEntry> {
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('publishing_outbox')
    .update({
      status: 'retrying',
      error_code: errorCode,
      error_message: errorMessage,
      updated_at: now,
    })
    .eq('id', outboxId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(`Error al actualizar outbox a retrying: ${error?.message}`);
  }

  return updated as PublishingOutboxEntry;
}

/**
 * Marca la entrada en estado 'failed'.
 */
async function markOutboxFailed(
  outboxId: string,
  errorCode: string,
  errorMessage: string
): Promise<PublishingOutboxEntry> {
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('publishing_outbox')
    .update({
      status: 'failed',
      error_code: errorCode,
      error_message: errorMessage,
      updated_at: now,
    })
    .eq('id', outboxId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(`Error al actualizar outbox a failed: ${error?.message}`);
  }

  return updated as PublishingOutboxEntry;
}
