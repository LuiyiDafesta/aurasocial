import { supabase } from '../lib/supabase';
import { ContentItem, ContentItemUpdateInput, ContentFilterOptions, ProductionBrief } from '../types/contentItem';

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
 * Actualiza los campos editables de un contenido (title, hook, script, caption, hashtags, cta, creative_direction, scenes).
 */
export async function updateContent(
  id: string,
  input: ContentItemUpdateInput
): Promise<ContentItem> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) payload.title = input.title;
  if (input.hook !== undefined) payload.hook = input.hook;
  if (input.script !== undefined) payload.script = input.script;
  if (input.caption !== undefined) payload.caption = input.caption;
  if (input.hashtags !== undefined) payload.hashtags = input.hashtags;
  if (input.cta !== undefined) payload.cta = input.cta;
  if (input.creative_direction !== undefined) payload.creative_direction = input.creative_direction;
  if (input.scenes !== undefined) payload.scenes = input.scenes;

  const { data, error } = await supabase
    .from('content_items')
    .update(payload)
    .eq('id', id)
    .select(CONTENT_ITEM_SELECT)
    .single();

  if (error) {
    console.error(`Error en updateContent (${id}):`, error);
    throw new Error(`Error al guardar cambios: ${error.message}`);
  }

  return data as unknown as ContentItem;
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
