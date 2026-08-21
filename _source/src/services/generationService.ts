import { supabase } from '../lib/supabase';
import { GenerationRun, GenerationContext } from '../types/generationRun';

interface TriggerGenerationResponse {
  run_id: string;
  status: string;
  message?: string;
}

/**
 * Dispara la generación de nuevas ideas invocando la Supabase Edge Function 'generate-ideas'.
 */
export async function triggerIdeaGeneration(
  workspaceId: string,
  brandId: string,
  context?: GenerationContext
): Promise<TriggerGenerationResponse> {
  const { data, error } = await supabase.functions.invoke('generate-ideas', {
    body: {
      workspace_id: workspaceId,
      brand_id: brandId,
      generation_context: context || {
        topic: null,
        keywords: [],
        objective: null,
        preferred_format: 'any',
        web_research: true,
        ideas_count: 5,
      },
    },
  });

  if (error) {
    console.error('Error al invocar Edge Function generate-ideas:', error);
    let errorDetail = error.message;
    try {
      if (error.context && typeof error.context.json === 'function') {
        const errJson = await error.context.json();
        if (errJson?.error) {
          errorDetail = errJson.error;
        }
      }
    } catch (_) {}
    throw new Error(errorDetail || 'Error al iniciar la generación de ideas');
  }

  if (!data?.run_id) {
    throw new Error(data?.error || 'No se recibió el identificador de la ejecución');
  }

  return data as TriggerGenerationResponse;
}

/**
 * Obtiene el estado actual de una ejecución en la tabla generation_runs.
 */
export async function getGenerationRunStatus(runId: string): Promise<GenerationRun> {
  const { data, error } = await supabase
    .from('generation_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) {
    console.error(`Error al consultar generation_runs (${runId}):`, error);
    throw new Error(`Error al verificar estado de generación: ${error.message}`);
  }

  return data as GenerationRun;
}

/**
 * Comprueba si existe alguna ejecución en curso (pending o running) para el workspace y brand.
 */
export async function getActiveGenerationRun(
  workspaceId: string,
  brandId: string
): Promise<GenerationRun | null> {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('generation_runs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('brand_id', brandId)
    .eq('workflow_name', 'WF01')
    .in('status', ['pending', 'running'])
    .gte('created_at', twoMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error al verificar active generation run:', error);
    return null;
  }

  return data as GenerationRun | null;
}

/**
 * Obtiene el historial de ejecuciones (generation_runs) paginado para la marca activa.
 */
export async function getWorkspaceGenerationRuns(
  workspaceId: string,
  brandId: string,
  page: number = 1,
  pageSize: number = 12
): Promise<{ runs: GenerationRun[]; totalCount: number; totalPages: number }> {
  if (!workspaceId || !brandId) {
    return { runs: [], totalCount: 0, totalPages: 1 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from('generation_runs')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('brand_id', brandId)
    .eq('workflow_name', 'WF01')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error al obtener generation_runs:', error);
    throw new Error(`Error al obtener historial de generaciones: ${error.message}`);
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    runs: (data as GenerationRun[]) || [],
    totalCount,
    totalPages,
  };
}

