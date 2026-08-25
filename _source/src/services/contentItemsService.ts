import { supabase } from '../lib/supabase';
import { ContentItem, ContentItemUpdateInput, ContentFilterOptions, ProductionBrief } from '../types/contentItem';
import { createContentVersion } from './contentVersionService';
import { deleteFromB2 } from '../lib/b2Storage';

const CONTENT_ITEM_SELECT = `
  *,
  social_accounts (
    id,
    workspace_id,
    brand_id,
    platform,
    account_name,
    username,
    external_account_id,
    is_connected,
    is_enabled,
    publishing_enabled,
    metadata,
    created_at,
    updated_at
  ),
  brands (
    id,
    name
  ),
  content_ideas (
    id,
    title,
    pillar
  )
`;

export interface ProduceContentParams {
  requestId: string;
  workspaceId: string;
  brandId: string;
  ideaId: string;
  generationRunId?: string | null;
  platform: string;
  contentType: string;
  brief: ProductionBrief;
}

export interface ProduceContentResult {
  content_item_id: string;
  outbox_event_id: string;
  is_new: boolean;
  status: string;
}

/**
 * Solicita de forma transaccional e idempotente la producción de contenido para una idea.
 * Inserta en content_items + production_outbox y dispara el Fast Path hacia WF02.
 */
export async function produceContentFromIdea(
  params: ProduceContentParams
): Promise<ProduceContentResult> {
  const { data, error } = await supabase.rpc('create_content_production_request', {
    p_request_id: params.requestId,
    p_workspace_id: params.workspaceId,
    p_brand_id: params.brandId,
    p_idea_id: params.ideaId,
    p_generation_run_id: params.generationRunId || null,
    p_platform: params.platform,
    p_content_type: params.contentType,
    p_production_brief: params.brief,
  });

  if (error) {
    console.error('Error en create_content_production_request:', error);
    throw new Error(`Error al solicitar producción: ${error.message}`);
  }

  const result = data as ProduceContentResult;

  // Fast Path: Dispatch asíncrono hacia WF02
  const webhookUrl = 'https://flow1.lsnetinformatica.com.ar/webhook/produce-content';
  const { data: userData } = await supabase.auth.getUser();

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: result.outbox_event_id,
      request_id: params.requestId,
      content_item_id: result.content_item_id,
      workspace_id: params.workspaceId,
      brand_id: params.brandId,
      user_id: userData.user?.id,
      idea_id: params.ideaId,
      generation_run_id: params.generationRunId,
      production_brief: params.brief,
    }),
  }).catch((err) => {
    console.warn('Fast Path webhook warning (outbox retry will handle if needed):', err);
  });

  return result;
}

/**
 * Obtiene la lista de contenidos con filtros opcionales por estado y plataforma.
 */
export async function getContentItems(
  filters?: ContentFilterOptions & { workspaceId?: string; brandId?: string }
): Promise<ContentItem[]> {
  let query = supabase
    .from('content_items')
    .select(CONTENT_ITEM_SELECT)
    .order('created_at', { ascending: false });

  if (filters?.workspaceId) {
    query = query.eq('workspace_id', filters.workspaceId);
  }

  if (filters?.brandId) {
    query = query.eq('brand_id', filters.brandId);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.platform && filters.platform !== 'all') {
    query = query.eq('platform', filters.platform);
  }

  if (filters?.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }

  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const search = `%${filters.searchQuery.trim()}%`;
    query = query.or(`title.ilike.${search},caption.ilike.${search},hook.ilike.${search}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error en getContentItems:', error);
    throw new Error(`Error al obtener contenidos: ${error.message}`);
  }

  return (data as unknown as ContentItem[]) || [];
}

/**
 * Obtiene un contenido individual por su ID.
 */
export async function getContentItemById(id: string): Promise<ContentItem> {
  const { data, error } = await supabase
    .from('content_items')
    .select(CONTENT_ITEM_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error en getContentItemById (${id}):`, error);
    throw new Error(`Error al obtener el contenido: ${error.message}`);
  }

  return data as unknown as ContentItem;
}

/**
 * Actualiza los campos de un contenido creando una nueva versión inmutable (human_edit)
 * vía la RPC transaccional create_content_version().
 */
export async function updateContent(
  id: string,
  input: ContentItemUpdateInput
): Promise<ContentItem> {
  const current = await getContentItemById(id);

  const newTitle = input.title !== undefined ? input.title : current.title;
  if (!newTitle) throw new Error('El título del contenido no puede estar vacío');

  await createContentVersion({
    content_item_id: id,
    version_type: 'human_edit',
    title: newTitle,
    hook: input.hook !== undefined ? input.hook : current.hook,
    script: input.script !== undefined ? input.script : current.script,
    caption: input.caption !== undefined ? input.caption : current.caption,
    hashtags: input.hashtags !== undefined ? (input.hashtags || []) : (current.hashtags || []),
    cta: input.cta !== undefined ? input.cta : current.cta,
    creative_direction: input.creative_direction !== undefined ? input.creative_direction : current.creative_direction,
    media_requirements: input.media_requirements !== undefined ? (input.media_requirements || []) : (current.media_requirements || []),
    scenes: input.scenes !== undefined ? (input.scenes || []) : (current.scenes || []),
    production_brief_snapshot: current.production_brief || {},
    platform: current.platform,
    content_type: current.content_type,
    status: current.status,
    change_summary: input.change_summary || 'Edición manual de contenido',
  });

  return getContentItemById(id);
}

/**
 * Aprueba un contenido invocando la función RPC existente manage_content_item.
 */
export async function approveContent(id: string): Promise<void> {
  const { error } = await supabase.rpc('manage_content_item', {
    p_content_id: id,
    p_action: 'approve',
    p_scheduled_at: null,
  });

  if (error) {
    console.error(`Error al aprobar contenido (${id}):`, error);
    throw new Error(`Error al aprobar contenido: ${error.message}`);
  }
}

/**
 * Rechaza un contenido invocando la función RPC existente manage_content_item.
 */
export async function rejectContent(id: string): Promise<void> {
  const { error } = await supabase.rpc('manage_content_item', {
    p_content_id: id,
    p_action: 'reject',
    p_scheduled_at: null,
  });

  if (error) {
    console.error(`Error al rechazar contenido (${id}):`, error);
    throw new Error(`Error al rechazar contenido: ${error.message}`);
  }
}

/**
 * Programa un contenido invocando la función RPC existente manage_content_item.
 * @param scheduledAtIso Timestamp en formato ISO-8601 UTC
 */
export async function scheduleContent(id: string, scheduledAtIso: string): Promise<void> {
  const { error } = await supabase.rpc('manage_content_item', {
    p_content_id: id,
    p_action: 'schedule',
    p_scheduled_at: scheduledAtIso,
  });

  if (error) {
    console.error(`Error al programar contenido (${id}):`, error);
    throw new Error(`Error al programar contenido: ${error.message}`);
  }
}

/**
 * Elimina un contenido individual y sus assets físicos en Backblaze B2 de forma coordinada.
 */
export async function deleteContentItem(id: string): Promise<void> {
  if (!id) throw new Error('id de contenido es requerido');

  try {
    const res = await fetch('/api/content/items/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Error al eliminar contenido');
    }
  } catch (err: any) {
    // 1. Obtener y eliminar assets físicos asociados específicamente a esta pieza de contenido
    const { data: assets } = await supabase
      .from('content_assets')
      .select('storage_path')
      .eq('content_item_id', id);

    if (assets && assets.length > 0) {
      await Promise.allSettled(
        assets.map(async (a) => {
          if (a.storage_path) {
            try {
              await deleteFromB2(a.storage_path);
            } catch (b2Err) {
              console.warn(`Aviso B2 al eliminar asset (${a.storage_path}):`, b2Err);
            }
          }
        })
      );
    }

    // 2. Limpiar tablas hijas dependientes en orden seguro
    await Promise.allSettled([
      supabase.from('publishing_outbox').delete().eq('content_item_id', id),
      supabase.from('render_jobs').delete().eq('content_item_id', id),
      supabase.from('platform_adaptations').delete().eq('content_item_id', id),
      supabase.from('content_versions').delete().eq('content_item_id', id),
      supabase.from('content_assets').delete().eq('content_item_id', id),
    ]);

    // 3. Eliminar fila principal de content_items
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error al eliminar contenido (${id}):`, error);
      throw new Error(`Error al eliminar contenido: ${error.message}`);
    }
  }
}

/**
 * Elimina múltiples piezas de contenido en lote (Bulk Delete) con borrado coordinado en Backblaze B2.
 */
export async function deleteContentItemsBulk(ids: string[]): Promise<{ deletedCount: number }> {
  if (!ids || ids.length === 0) {
    return { deletedCount: 0 };
  }

  try {
    const res = await fetch('/api/content/items/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
    if (json.success) {
      return { deletedCount: json.deletedCount || ids.length };
    }
    throw new Error(json.error || 'Error al eliminar contenidos');
  } catch (err: any) {
    // 1. Obtener y eliminar assets físicos asociados a estos contenidos
    const { data: assets } = await supabase
      .from('content_assets')
      .select('storage_path')
      .in('content_item_id', ids);

    if (assets && assets.length > 0) {
      await Promise.allSettled(
        assets.map(async (a) => {
          if (a.storage_path) {
            try {
              await deleteFromB2(a.storage_path);
            } catch (b2Err) {
              console.warn(`Aviso B2 al eliminar asset (${a.storage_path}):`, b2Err);
            }
          }
        })
      );
    }

    // 2. Limpiar tablas hijas dependientes en lote
    await Promise.allSettled([
      supabase.from('publishing_outbox').delete().in('content_item_id', ids),
      supabase.from('render_jobs').delete().in('content_item_id', ids),
      supabase.from('platform_adaptations').delete().in('content_item_id', ids),
      supabase.from('content_versions').delete().in('content_item_id', ids),
      supabase.from('content_assets').delete().in('content_item_id', ids),
    ]);

    // 3. Eliminar registros de content_items
    const { error } = await supabase
      .from('content_items')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error al eliminar contenidos en lote:', error);
      throw new Error(`Error al eliminar contenidos: ${error.message}`);
    }

    return { deletedCount: ids.length };
  }
}
