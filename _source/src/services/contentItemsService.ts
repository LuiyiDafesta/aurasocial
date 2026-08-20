import { supabase } from '../lib/supabase';
import { ContentItem, ContentItemUpdateInput, ContentFilterOptions } from '../types/contentItem';

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
  )
`;

/**
 * Obtiene la lista de contenidos con filtros opcionales por estado y plataforma.
 */
export async function getContentItems(filters?: ContentFilterOptions): Promise<ContentItem[]> {
  let query = supabase
    .from('content_items')
    .select(CONTENT_ITEM_SELECT)
    .order('created_at', { ascending: false });

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
 * Actualiza los campos editables de un contenido (title, hook, script, caption, hashtags, cta, creative_direction).
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
