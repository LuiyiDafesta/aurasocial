import { GenerationStatus } from '../../types/generationRun';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '../common/Button';

interface GenerationBannerProps {
  isGenerating: boolean;
  status: GenerationStatus | null;
  brandName?: string;
  ideasCreated?: number;
  errorMessage?: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function GenerationBanner({
  isGenerating,
  status,
  brandName,
  ideasCreated = 5,
  errorMessage,
  onDismiss,
  onRetry,
}: GenerationBannerProps) {
  if (!isGenerating && !errorMessage && status !== 'completed') {
    return null;
  }

  return (
    <div className="rounded-2xl border p-4 shadow-xl animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Estado: Generando (Pending / Running) */}
      {isGenerating && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-aura-300 bg-aura-500/10 border-aura-500/30 p-2 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-aura-500/20 border border-aura-500/30 flex items-center justify-center text-aura-400 shrink-0">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-aura-400" />
                {status === 'running' ? 'Generando 5 nuevas ideas con IA...' : 'Iniciando agente de estrategia (WF01)...'}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Diseñando conceptos y ganchos estratégicos para <strong className="text-white">{brandName || 'la marca activa'}</strong>. Esto suele tardar entre 15 y 20 segundos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md bg-dark-900 border border-dark-700 text-aura-300">
              {status === 'running' ? 'IA en proceso' : 'En cola'}
            </span>
          </div>
        </div>
      )}

      {/* Estado: Éxito (Completed) */}
      {!isGenerating && status === 'completed' && (
        <div className="flex items-center justify-between gap-3 text-emerald-300 bg-emerald-500/10 border-emerald-500/30 p-2 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                ¡Generación completada con éxito!
              </h4>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Se agregaron {ideasCreated} nuevas ideas estratégicas a tu banco de contenidos.
              </p>
            </div>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Estado: Error (Failed) */}
      {!isGenerating && (status === 'failed' || errorMessage) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-300 bg-rose-500/10 border-rose-500/30 p-2 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                No se pudieron generar las ideas
              </h4>
              <p className="text-xs text-rose-200/90 mt-0.5">
                {errorMessage || 'Ocurrió un error en el servicio de generación.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onRetry && (
              <Button variant="danger" size="sm" onClick={onRetry}>
                Reintentar
              </Button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
