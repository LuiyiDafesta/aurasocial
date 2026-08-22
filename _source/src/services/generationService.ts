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
  context?: GenerationContext,
  campaignId?: string | null
): Promise<TriggerGenerationResponse> {
  const { data, error } = await supabase.functions.invoke('generate-ideas', {
    body: {
      workspace_id: workspaceId,
      brand_id: brandId,
      campaign_id: campaignId || null,
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
 * Obtiene el historial de ejecuciones (generation_runs) paginado para la marca activa
 * enriquecido con las ideas creadas en cada lote para identificación instantánea.
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

  const runs = (data as GenerationRun[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (runs.length === 0) {
    return { runs: [], totalCount: 0, totalPages: 1 };
  }

  // Enriquecer cada run con sus ideas reales para identificar temática de inmediato
  try {
    const runIds = runs.map((r) => r.id);
    const { data: linkedIdeas } = await supabase
      .from('content_ideas')
      .select('id, title, pillar, format, created_at, generation_run_id')
      .eq('workspace_id', workspaceId)
      .eq('brand_id', brandId)
      .in('generation_run_id', runIds);

    const ideasByRunId = new Map<string, { id: string; title: string; pillar: string; format: string }[]>();
    for (const idea of linkedIdeas || []) {
      if (idea.generation_run_id) {
        if (!ideasByRunId.has(idea.generation_run_id)) {
          ideasByRunId.set(idea.generation_run_id, []);
        }
        ideasByRunId.get(idea.generation_run_id)!.push({
          id: idea.id,
          title: idea.title,
          pillar: idea.pillar,
          format: idea.format,
        });
      }
    }

    // Para corridas históricas donde generation_run_id era null, buscar por cercanía de timestamp
    const { data: allRecentIdeas } = await supabase
      .from('content_ideas')
      .select('id, title, pillar, format, created_at, generation_run_id')
      .eq('workspace_id', workspaceId)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(100);

    for (const r of runs) {
      if (ideasByRunId.has(r.id) && ideasByRunId.get(r.id)!.length > 0) {
        r.sample_ideas = ideasByRunId.get(r.id)!;
      } else {
        // Fallback por proximidad de timestamp
        const runTime = new Date(r.created_at).getTime();
        const matches = (allRecentIdeas || []).filter((i) => {
          const ideaTime = new Date(i.created_at).getTime();
          return Math.abs(ideaTime - runTime) < 60000;
        });
        r.sample_ideas = matches.map((m) => ({
          id: m.id,
          title: m.title,
          pillar: m.pillar,
          format: m.format,
        }));
      }
    }
  } catch (err) {
    console.warn('Error al enriquecer runs con sample_ideas:', err);
  }

  return {
    runs,
    totalCount,
    totalPages,
  };
}


