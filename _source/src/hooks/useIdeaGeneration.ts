import { useState, useEffect, useRef, useCallback } from 'react';
import { GenerationStatus, GenerationRun, GenerationContext } from '../types/generationRun';
import { 
  triggerIdeaGeneration, 
  getGenerationRunStatus, 
  getActiveGenerationRun 
} from '../services/generationService';

interface UseIdeaGenerationOptions {
  workspaceId?: string | null;
  brandId?: string | null;
  onGenerationCompleted?: () => void;
}

export function useIdeaGeneration({
  workspaceId,
  brandId,
  onGenerationCompleted,
}: UseIdeaGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<GenerationStatus | null>(null);
  const [ideasCreated, setIdeasCreated] = useState<number>(0);
  const [currentContext, setCurrentContext] = useState<GenerationContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Comprobar al montar si ya existía una ejecución activa reciente
  useEffect(() => {
    let isMounted = true;

    async function checkExisting() {
      if (!workspaceId || !brandId) return;

      try {
        const existing = await getActiveGenerationRun(workspaceId, brandId);
        if (existing && isMounted) {
          setActiveRunId(existing.id);
          setRunStatus(existing.status);
          setCurrentContext(existing.generation_context || null);
          setIsGenerating(true);
        }
      } catch (err) {
        console.error('Error al chequear run activo previo:', err);
      }
    }

    checkExisting();

    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [workspaceId, brandId, stopPolling]);

  // Polling del estado de la ejecución
  useEffect(() => {
    if (!activeRunId || !isGenerating) {
      stopPolling();
      return;
    }

    const pollStatus = async () => {
      pollCountRef.current += 1;

      try {
        const run: GenerationRun = await getGenerationRunStatus(activeRunId);
        setRunStatus(run.status);

        if (run.generation_context && !currentContext) {
          setCurrentContext(run.generation_context);
        }

        if (run.status === 'completed') {
          setIsGenerating(false);
          setIdeasCreated(run.ideas_created || 5);
          stopPolling();
          onGenerationCompleted?.();
          return;
        }

        if (run.status === 'failed') {
          setIsGenerating(false);
          setError(run.error_message || 'No se pudieron generar las ideas con IA.');
          stopPolling();
          return;
        }

        // Timeout preventivo en cliente (90 segundos): no marca FAILED en BD, solo detiene el polling
        if (pollCountRef.current > 36) {
          setIsGenerating(false);
          setError('La generación está tardando más de lo habitual. Podés actualizar la lista en unos momentos.');
          stopPolling();
          return;
        }

        // Frecuencia: 2.5s los primeros 60s (24 intentos), luego 5s
        const interval = pollCountRef.current <= 24 ? 2500 : 5000;
        pollTimerRef.current = setTimeout(pollStatus, interval);
      } catch (err: any) {
        console.error('Error durante el polling de generation_run:', err);
        // Si hay un error temporal de red, reintentar
        pollTimerRef.current = setTimeout(pollStatus, 3000);
      }
    };

    // Iniciar primer tick de polling tras 1.5s
    pollTimerRef.current = setTimeout(pollStatus, 1500);

    return () => {
      stopPolling();
    };
  }, [activeRunId, isGenerating, onGenerationCompleted, stopPolling, currentContext]);

  // Disparar generación con contexto opcional
  const startGeneration = async (context?: GenerationContext) => {
    if (!workspaceId || !brandId || isGenerating) return;

    try {
      setIsGenerating(true);
      setError(null);
      setRunStatus('pending');
      setIdeasCreated(0);
      setCurrentContext(context || null);
      pollCountRef.current = 0;

      const response = await triggerIdeaGeneration(workspaceId, brandId, context);
      setActiveRunId(response.run_id);
    } catch (err: any) {
      console.error('Error al iniciar generación de ideas:', err);
      setIsGenerating(false);
      setRunStatus('failed');
      setError(err.message || 'No se pudo iniciar la generación de ideas.');
    }
  };

  const clearStatus = () => {
    setError(null);
    setRunStatus(null);
    setCurrentContext(null);
  };

  return {
    isGenerating,
    runStatus,
    activeRunId,
    ideasCreated,
    currentContext,
    error,
    startGeneration,
    clearStatus,
  };
}
