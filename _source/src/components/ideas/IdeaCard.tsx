import { ContentIdea, IdeaPriority, IdeaStatus } from '../../types/contentIdea';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { 
  Lightbulb, 
  Target, 
  Quote, 
  Sparkles, 
  Clock, 
  Layers, 
  Flame, 
  ArrowRight,
  FolderTree,
  FolderPlus,
  Trash2,
  Check
} from 'lucide-react';

interface IdeaCardProps {
  idea: ContentIdea;
  onProduceContent?: (idea: ContentIdea) => void;
  onNavigateToGeneration?: (generationRunId: string) => void;
  onAssignCampaign?: (idea: ContentIdea) => void;
  onDelete?: (idea: ContentIdea) => void;
  isSelected?: boolean;
  onToggleSelect?: (idea: ContentIdea) => void;
}

export function IdeaCard({ 
  idea, 
  onProduceContent,
  onNavigateToGeneration,
  onAssignCampaign,
  onDelete,
  isSelected = false,
  onToggleSelect,
}: IdeaCardProps) {
  const getPriorityBadge = (priority: IdeaPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Flame className="w-3 h-3 text-rose-400" />
            Alta Prioridad
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
            Prioridad Media
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-500/15 text-slate-400 border border-slate-500/30">
            Baja Prioridad
          </span>
        );
    }
  };

  const getStatusBadge = (status: IdeaStatus) => {
    switch (status) {
      case 'in_production':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
            En Producción
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Aprobada
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Rechazada
          </span>
        );
      case 'proposed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Propuesta
          </span>
        );
    }
  };

  return (
    <div className={`relative bg-dark-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all duration-200 group ${
      isSelected
        ? 'border-aura-500 ring-2 ring-aura-500/30 bg-aura-500/5'
        : 'border-dark-800 hover:border-aura-500/30'
    }`}>
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(idea);
          }}
          className={`absolute top-4 left-4 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-md ${
            isSelected
              ? 'bg-aura-600 text-white ring-2 ring-aura-400 border border-aura-400 scale-105'
              : 'bg-dark-950/80 border border-dark-600/80 text-transparent hover:border-aura-400 hover:text-slate-400/60 hover:bg-dark-900'
          }`}
          title={isSelected ? 'Deseleccionar idea' : 'Seleccionar idea'}
        >
          <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100 text-white' : 'opacity-0 hover:opacity-100 text-slate-300'}`} />
        </button>
      )}

      {/* Header: Badges */}
      <div className="space-y-3">
        <div className={`flex items-center justify-between gap-2 flex-wrap ${onToggleSelect ? 'pl-8' : ''}`}>
          <div className="flex items-center gap-2">
            {getPriorityBadge(idea.priority)}
            {getStatusBadge(idea.status)}
          </div>

          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatInArgentina(idea.created_at)}
          </span>
        </div>

        {/* Origin Generation Chip */}
        <div className="pt-0.5">
          {idea.generation_run_id ? (
            <button
              onClick={() => onNavigateToGeneration?.(idea.generation_run_id!)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-aura-500/10 hover:bg-aura-500/20 border border-aura-500/20 text-aura-300 text-[10px] font-semibold transition-colors"
            >
              <FolderTree className="w-3 h-3" />
              <span>Ver Sesión de Generación ➔</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-dark-950 border border-dark-800 text-slate-500 text-[10px]">
              Generación histórica no vinculada
            </span>
          )}
        </div>

        {/* Pillar & Format */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-950 border border-dark-800 text-slate-300 font-medium">
            <Layers className="w-3.5 h-3.5 text-aura-400" />
            Pilar: {idea.pillar}
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-dark-950/60 border border-dark-800/80 text-slate-400 text-[11px]">
            {idea.format}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white tracking-tight leading-snug">
          {idea.title}
        </h3>

        {/* Concept */}
        <p className="text-xs text-slate-300 leading-relaxed bg-dark-950/60 p-3 rounded-xl border border-dark-800/60">
          {idea.concept}
        </p>

        {/* Objective */}
        {idea.objective && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Objetivo Estratégico
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              {idea.objective}
            </p>
          </div>
        )}

        {/* Hook */}
        {idea.hook && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
              <Quote className="w-3.5 h-3.5 text-amber-400" />
              Hook Inicial
            </span>
            <div className="text-xs italic text-amber-200/90 bg-amber-500/5 border border-amber-500/15 p-2.5 rounded-lg">
              "{idea.hook}"
            </div>
          </div>
        )}

        {/* CTA */}
        {idea.cta && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              Llamado a la Acción (CTA)
            </span>
            <p className="text-xs text-slate-400">
              {idea.cta}
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-dark-800/80 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-aura-400" />
          {idea.source === 'ai' ? 'Estrategia IA' : 'Manual'}
        </span>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idea);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Eliminar idea"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onAssignCampaign && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAssignCampaign(idea)}
              leftIcon={<FolderPlus className="w-3.5 h-3.5 text-aura-400" />}
              className="text-xs text-slate-300 hover:text-white px-2.5 h-8"
              title={idea.campaign_id ? 'Mover o quitar de campaña' : 'Asignar a campaña'}
            >
              {idea.campaign_id ? 'Mover' : 'Asignar'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onProduceContent?.(idea)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="hover:border-aura-500/40 hover:bg-aura-500/10 text-xs h-8"
          >
            Producir
          </Button>
        </div>
      </div>
    </div>
  );
}
