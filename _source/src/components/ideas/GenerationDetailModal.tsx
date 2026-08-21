import { 
  Sparkles, 
  X, 
  Calendar, 
  Clock, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Tag, 
  Target, 
  Video, 
  Layers
} from 'lucide-react';
import { GenerationRun } from '../../types/generationRun';
import { formatInArgentina } from '../../lib/dateUtils';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';

interface GenerationDetailModalProps {
  run: GenerationRun | null;
  isOpen: boolean;
  onClose: () => void;
  onViewIdeas?: (run: GenerationRun) => void;
}

export function GenerationDetailModal({
  run,
  isOpen,
  onClose,
  onViewIdeas,
}: GenerationDetailModalProps) {
  if (!isOpen || !run) return null;

  const ctx = run.generation_context;
  const topic = ctx?.topic || 'Estrategia abierta basada en pilares generales de la marca';
  const keywords = ctx?.keywords || [];
  const objective = ctx?.objective || 'Aumentar engagement, interacción y reconocimiento de marca';
  const format = ctx?.preferred_format || 'any';
  const hasWebResearch = ctx?.web_research ?? true;

  const getFormatLabel = (fmt: string) => {
    switch (fmt?.toLowerCase()) {
      case 'tiktok': return 'TikTok';
      case 'reel': return 'Instagram Reel';
      case 'video': return 'Video';
      case 'carousel': return 'Carrusel';
      case 'post': return 'Post / Imagen';
      case 'any':
      default:
        return 'Cualquier formato';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completada con éxito
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25">
            <XCircle className="w-3.5 h-3.5" />
            Fallida
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/25 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            En ejecución
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
            <Clock className="w-3.5 h-3.5" />
            En cola
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-800 bg-dark-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Detalle de la Generación
              </h3>
              <p className="text-xs text-slate-400">
                Contexto estratégico e insumos utilizados por la IA (WF01)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status & Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-dark-950/80 border border-dark-800">
            <div className="flex items-center gap-2">
              {getStatusBadge(run.status)}
              <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-dark-900 border border-dark-800">
                {run.ideas_created || 5} ideas creadas
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatInArgentina(run.created_at)}</span>
            </div>
          </div>

          {/* Topic / Campaign */}
          <div className="space-y-1.5 bg-dark-950/60 border border-dark-800/80 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-aura-400" />
              Tema o Campaña Solicitada
            </span>
            <p className="text-sm font-semibold text-white leading-relaxed">
              {topic}
            </p>
          </div>

          {/* Keywords */}
          <div className="space-y-2 bg-dark-950/60 border border-dark-800/80 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              Palabras Clave ({keywords.length})
            </span>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-medium"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">No se especificaron palabras clave (generación abierta)</p>
            )}
          </div>

          {/* Objective */}
          <div className="space-y-1.5 bg-dark-950/60 border border-dark-800/80 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-pink-400" />
              Objetivo Específico
            </span>
            <p className="text-slate-300 leading-relaxed">
              {objective}
            </p>
          </div>

          {/* Format & Web Research Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-dark-950/60 border border-dark-800/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-amber-400" />
                Formato Solicitado
              </span>
              <div className="text-xs font-semibold text-white">
                {getFormatLabel(format)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-950/60 border border-dark-800/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                Investigación Web
              </span>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    hasWebResearch ? 'bg-sky-400' : 'bg-slate-500'
                  )}
                />
                {hasWebResearch ? 'Activada (Tavily Trends)' : 'Desactivada'}
              </div>
            </div>
          </div>

          {/* Error message if failed */}
          {run.error_message && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Error de Ejecución:
              </div>
              <p className="text-xs">{run.error_message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/60 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>

          {onViewIdeas && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onViewIdeas(run);
                onClose();
              }}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              Ver {run.ideas_created || 5} Ideas de esta Generación
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
