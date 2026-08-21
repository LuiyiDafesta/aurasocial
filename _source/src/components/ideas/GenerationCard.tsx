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
  Lightbulb
} from 'lucide-react';
import { GenerationRun } from '../../types/generationRun';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';

interface GenerationCardProps {
  run: GenerationRun;
  indexNumber?: number;
  onViewIdeas: (run: GenerationRun) => void;
  onViewDetails: (run: GenerationRun) => void;
}

export function GenerationCard({
  run,
  indexNumber,
  onViewIdeas,
  onViewDetails,
}: GenerationCardProps) {
  const ctx = run.generation_context;
  const sampleIdeas = run.sample_ideas || [];
  
  // Determinamos el título principal distintivo
  let mainTitle = '';
  if (ctx?.topic && ctx.topic.trim()) {
    mainTitle = ctx.topic.trim();
  } else if (sampleIdeas.length > 0) {
    mainTitle = `Lote: "${sampleIdeas[0].title}"`;
  } else {
    mainTitle = `Estrategia Abierta (Pilares de Marca)`;
  }

  const keywords = ctx?.keywords || [];
  const format = ctx?.preferred_format || (sampleIdeas.length > 0 ? sampleIdeas[0].format : 'any');
  const hasWebResearch = ctx?.web_research ?? true;

  // Extraer pilares cubiertos en este lote
  const coveredPillars = Array.from(
    new Set(sampleIdeas.map((i) => i.pillar).filter(Boolean))
  );

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
    <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-aura-500/50 hover:bg-dark-900 transition-all group">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-aura-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center font-black text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            {getStatusBadge(run.status)}
            {indexNumber !== undefined && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-dark-950 text-slate-400 border border-dark-800">
                #{indexNumber}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatInArgentina(run.created_at)}
          </span>
        </div>

        {/* Dynamic Distinct Main Title */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white tracking-tight leading-snug line-clamp-2 group-hover:text-aura-300 transition-colors">
            {mainTitle}
          </h3>
          {ctx?.objective && (
            <p className="text-xs text-slate-400 line-clamp-1 italic">
              🎯 {ctx.objective}
            </p>
          )}
        </div>

        {/* Preview of Sample Ideas in this batch */}
        {sampleIdeas.length > 0 && (
          <div className="space-y-1.5 p-3 rounded-xl bg-dark-950/70 border border-dark-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400" />
                Ideas Generadas ({sampleIdeas.length}):
              </span>
            </div>
            <ul className="space-y-1">
              {sampleIdeas.slice(0, 3).map((idea, idx) => (
                <li key={idea.id || idx} className="text-xs text-slate-300 flex items-start gap-1.5 line-clamp-1">
                  <span className="text-aura-400 font-mono font-bold text-[10px] mt-0.5">•</span>
                  <span className="truncate font-medium">{idea.title}</span>
                  {idea.pillar && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-dark-900 border border-dark-800 text-slate-400 shrink-0 ml-auto">
                      {idea.pillar}
                    </span>
                  )}
                </li>
              ))}
              {sampleIdeas.length > 3 && (
                <li className="text-[10px] text-slate-400 font-mono pl-3">
                  +{sampleIdeas.length - 3} ideas adicionales en este lote
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Tags row: Format, Web Research, Covered Pillars */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 font-medium text-[11px]">
            <Layers className="w-3 h-3 text-aura-400" />
            {getFormatBadge(format)}
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 font-medium text-[11px]">
            <Globe className="w-3 h-3 text-sky-400" />
            {hasWebResearch ? 'Investigación Web' : 'Sin Búsqueda Web'}
          </span>

          {coveredPillars.slice(0, 2).map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-aura-500/10 border border-aura-500/25 text-aura-300 font-mono text-[10px]">
              #{p}
            </span>
          ))}
        </div>

        {/* Keywords Preview if present */}
        {keywords.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <Tag className="w-3 h-3 text-slate-400 shrink-0" />
            {keywords.slice(0, 4).map((kw, i) => (
              <span
                key={i}
                className="text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
              >
                #{kw}
              </span>
            ))}
            {keywords.length > 4 && (
              <span className="text-[10px] text-slate-400 font-mono">
                +{keywords.length - 4} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-dark-800/80 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(run)}
          leftIcon={<Info className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          Ver Contexto
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onViewIdeas(run)}
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          className="text-xs shadow-aura-500/20"
        >
          Ver Ideas ({sampleIdeas.length || run.ideas_created || 5})
        </Button>
      </div>
    </div>
  );
}
