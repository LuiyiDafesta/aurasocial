import { 
  Sparkles, 
  Calendar, 
  Layers, 
  Tag, 
  Globe, 
  ChevronRight, 
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Target
} from 'lucide-react';
import { GenerationRun } from '../../types/generationRun';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';

interface GenerationCardProps {
  run: GenerationRun;
  indexNumber?: number;
  onOpenGeneration: (run: GenerationRun) => void;
  onViewContext: (run: GenerationRun) => void;
}

export function GenerationCard({
  run,
  indexNumber,
  onOpenGeneration,
  onViewContext,
}: GenerationCardProps) {
  const ctx = run.generation_context;
  const topic = ctx?.topic || 'Estrategia Abierta de Marca';
  const keywords = ctx?.keywords || [];
  const objective = ctx?.objective || 'Detectar oportunidades y conceptos de alto impacto para la audiencia';
  const format = ctx?.preferred_format || 'any';
  const hasWebResearch = ctx?.web_research ?? true;
  const ideasCount = run.ideas_created || 5;

  const getFormatBadge = (fmt: string) => {
    switch (fmt?.toLowerCase()) {
      case 'tiktok': return 'TikTok';
      case 'reel': return 'Reel';
      case 'video': return 'Video';
      case 'carousel': return 'Carrusel';
      case 'post': return 'Post';
      default: return 'Cualquier Formato';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" />
            Completada
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/25">
            <XCircle className="w-3 h-3" />
            Fallida
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-aura-500/10 text-aura-300 border border-aura-500/25 animate-pulse">
            <Sparkles className="w-3 h-3" />
            En curso
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/25">
            <Clock className="w-3 h-3" />
            En cola
          </span>
        );
    }
  };

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5 hover:border-aura-500/40 hover:bg-dark-900/90 transition-all group">
      {/* Top Meta Bar */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-aura-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            {indexNumber !== undefined && (
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-dark-950 text-slate-300 border border-dark-800">
                GENERACIÓN #{indexNumber}
              </span>
            )}
            {getStatusBadge(run.status)}
          </div>

          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatInArgentina(run.created_at)}
          </span>
        </div>

        {/* Topic Title */}
        <h3 className="text-lg font-bold text-white tracking-tight leading-snug group-hover:text-aura-300 transition-colors">
          ✨ {topic}
        </h3>

        {/* Objective Preview */}
        {objective && (
          <div className="flex items-start gap-1.5 text-xs text-slate-300 line-clamp-2">
            <Target className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-normal">{objective}</span>
          </div>
        )}

        {/* Format, Research, and Ideas Count Tags */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-dark-950 border border-dark-800 text-slate-300 font-medium text-[11px]">
            <Layers className="w-3 h-3 text-aura-400" />
            {getFormatBadge(format)}
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-dark-950 border border-dark-800 text-slate-300 font-medium text-[11px]">
            <Globe className="w-3 h-3 text-sky-400" />
            {hasWebResearch ? 'Investigación Web' : 'Sin Búsqueda Web'}
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-dark-950 border border-dark-800 text-slate-300 font-medium text-[11px]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {ideasCount} ideas generadas
          </span>
        </div>

        {/* Keywords Preview */}
        {keywords.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <Tag className="w-3 h-3 text-slate-400 shrink-0" />
            {keywords.slice(0, 4).map((kw, i) => (
              <span
                key={i}
                className="text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20"
              >
                #{kw}
              </span>
            ))}
            {keywords.length > 4 && (
              <span className="text-[10px] text-slate-500 font-mono">
                +{keywords.length - 4} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-dark-800/80 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewContext(run)}
          leftIcon={<Info className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          Ver Contexto y Fuentes
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpenGeneration(run)}
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          className="text-xs shadow-aura-500/20"
        >
          Abrir Generación ({ideasCount})
        </Button>
      </div>
    </div>
  );
}
