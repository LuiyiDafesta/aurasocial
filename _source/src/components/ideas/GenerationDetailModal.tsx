import { 
  Sparkles, 
  X, 
  Calendar, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Target, 
  Layers,
  Building2,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { GenerationRun } from '../../types/generationRun';
import { Brand } from '../../types/database';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';

interface GenerationDetailModalProps {
  run: GenerationRun | null;
  brand?: Brand | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenGeneration?: (run: GenerationRun) => void;
}

export function GenerationDetailModal({
  run,
  brand,
  isOpen,
  onClose,
  onOpenGeneration,
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
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-aura-500/10 text-aura-300 border border-aura-500/25 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            En ejecución
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800 bg-dark-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-aura-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Auditoría Estratégica de la Sesión
              </h3>
              <p className="text-xs text-slate-400">
                Insumos, parámetros y contexto utilizados por la IA (WF01)
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
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Status & Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-dark-950 border border-dark-800">
            <div className="flex items-center gap-2">
              {getStatusBadge(run.status)}
              <span className="text-[11px] font-mono text-slate-300 px-2.5 py-0.5 rounded-lg bg-dark-900 border border-dark-800">
                {run.ideas_created || 5} ideas generadas
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatInArgentina(run.created_at)}</span>
            </div>
          </div>

          {/* 1. PEDIDO DEL USUARIO */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-aura-400" />
              1. Pedido del Usuario
            </div>

            <div className="space-y-3 bg-dark-950/70 border border-dark-800/80 rounded-2xl p-4">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Tema o Campaña:</span>
                <p className="text-sm font-bold text-white mt-0.5">✨ {topic}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Objetivo Solicitado:</span>
                <p className="text-xs text-slate-200 mt-0.5 font-medium">{objective}</p>
              </div>

              {keywords.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1.5">Keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-mono font-medium"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dark-800/60">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Formato:</span>
                  <p className="text-xs font-semibold text-white mt-0.5">{getFormatLabel(format)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Búsqueda Web:</span>
                  <p className="text-xs font-semibold text-sky-300 mt-0.5 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    {hasWebResearch ? 'Activa (Tavily Trends)' : 'Inactiva'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. MARCA / BRAND BRAIN UTILIZADO */}
          {brand && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-pink-400" />
                2. Contexto de Marca (Brand Brain)
              </div>

              <div className="space-y-2.5 bg-dark-950/70 border border-dark-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{brand.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-900 border border-dark-800 text-slate-400">
                    {brand.industry || 'General'}
                  </span>
                </div>

                {brand.tone && (
                  <div className="text-slate-300 flex items-start gap-1.5 pt-1">
                    <MessageSquare className="w-3.5 h-3.5 text-aura-400 shrink-0 mt-0.5" />
                    <span><strong>Tono:</strong> {brand.tone}</span>
                  </div>
                )}

                {brand.audience && (
                  <div className="text-slate-300 flex items-start gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Audiencia:</strong> {brand.audience}</span>
                  </div>
                )}

                {Array.isArray(brand.rules) && brand.rules.length > 0 && (
                  <div className="text-slate-400 flex items-start gap-1.5 pt-1 border-t border-dark-800/60 text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Reglas activas:</strong> {brand.rules.length} límites de comunicación aplicados</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error if run failed */}
          {run.error_message && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Error de Ejecución:
              </div>
              <p className="text-xs">{run.error_message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-dark-800 bg-dark-900/80 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>

          {onOpenGeneration && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onOpenGeneration(run);
                onClose();
              }}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              Abrir Generación ({run.ideas_created || 5})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
