import { Campaign, CampaignStatus } from '../../types/campaign';
import { 
  Calendar, 
  Layers, 
  Lightbulb, 
  Zap, 
  Users, 
  Radio, 
  ArrowRight,
  Sparkles,
  Edit2,
  Target
} from 'lucide-react';
import { Button } from '../common/Button';

interface CampaignCardProps {
  campaign: Campaign;
  onSelect: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onSelect, onEdit }: CampaignCardProps) {
  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Activa
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Borrador
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            Pausada
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            Completada
          </span>
        );
      case 'archived':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Archivada
          </span>
        );
    }
  };

  const getTopGradient = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return 'from-emerald-500 via-teal-500 to-aura-500';
      case 'draft':
        return 'from-amber-500 via-yellow-500 to-amber-600';
      case 'paused':
        return 'from-orange-500 to-amber-600';
      case 'completed':
        return 'from-indigo-500 to-purple-500';
      case 'archived':
      default:
        return 'from-slate-600 to-slate-700';
    }
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return 'Fechas abiertas';
    if (start && !end) return `Desde ${new Date(start + 'T00:00:00').toLocaleDateString()}`;
    if (!start && end) return `Hasta ${new Date(end + 'T00:00:00').toLocaleDateString()}`;
    return `${new Date(start + 'T00:00:00').toLocaleDateString()} - ${new Date(end + 'T00:00:00').toLocaleDateString()}`;
  };

  return (
    <div 
      className="group relative bg-dark-900/90 hover:bg-dark-850 border border-dark-800 hover:border-aura-500/50 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-aura-500/10 overflow-hidden"
    >
      {/* Top Status Gradient Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getTopGradient(campaign.status)}`} />

      {/* Ambient background glow on hover */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-aura-500/5 rounded-full blur-3xl group-hover:bg-aura-500/10 transition-all pointer-events-none" />

      <div>
        {/* Top Header Row: Slug + Status + Edit Action */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono font-semibold text-aura-400 bg-aura-500/10 px-2.5 py-0.5 rounded-lg border border-aura-500/20 truncate">
              /{campaign.slug}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(campaign.status)}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(campaign);
                }}
                className="w-7 h-7 rounded-lg bg-dark-950/80 hover:bg-dark-800 text-slate-400 hover:text-white flex items-center justify-center border border-dark-800 transition-colors"
                title="Editar configuración de campaña"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Campaign Title & Theme */}
        <div className="space-y-1.5 mb-3.5">
          <h3 
            onClick={() => onSelect(campaign)}
            className="text-lg font-bold text-white group-hover:text-aura-300 transition-colors line-clamp-1 cursor-pointer"
          >
            {campaign.name}
          </h3>

          {campaign.strategic_theme && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">"{campaign.strategic_theme}"</span>
            </div>
          )}
        </div>

        {/* Strategic Objective Quote Box */}
        <div className="bg-dark-950/70 rounded-xl p-3.5 border border-dark-800/80 mb-4 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <Target className="w-3 h-3 text-aura-400" />
            <span>Objetivo Estratégico</span>
          </div>
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-medium">
            {campaign.strategic_objective}
          </p>
        </div>

        {/* Tags / Metadata Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {campaign.target_audience && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-dark-950/80 px-2.5 py-1 rounded-lg border border-dark-800">
              <Users className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[150px]">{campaign.target_audience}</span>
            </span>
          )}

          {campaign.primary_channel && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-dark-950/80 px-2.5 py-1 rounded-lg border border-dark-800">
              <Radio className="w-3 h-3 text-pink-400 shrink-0" />
              <span className="capitalize">{campaign.primary_channel}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-dark-950/80 px-2.5 py-1 rounded-lg border border-dark-800">
            <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{formatDateRange(campaign.start_date, campaign.end_date)}</span>
          </span>
        </div>
      </div>

      {/* Metrics Row & Open Workspace Button */}
      <div className="pt-4 border-t border-dark-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Real Metric Counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="px-2.5 py-1.5 rounded-xl bg-dark-950/80 border border-dark-800 flex items-center gap-1.5" title="Sesiones creativas">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="text-left leading-none">
              <span className="text-xs font-bold text-white">{campaign.total_generations || 0}</span>
              <span className="text-[10px] text-slate-400 block font-normal">sesiones</span>
            </div>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-dark-950/80 border border-dark-800 flex items-center gap-1.5" title="Ideas estratégicas">
            <Lightbulb className="w-3.5 h-3.5 text-aura-400 shrink-0" />
            <div className="text-left leading-none">
              <span className="text-xs font-bold text-white">{campaign.total_ideas || 0}</span>
              <span className="text-[10px] text-slate-400 block font-normal">ideas</span>
            </div>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-dark-950/80 border border-dark-800 flex items-center gap-1.5" title="Contenidos producidos">
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div className="text-left leading-none">
              <span className="text-xs font-bold text-white">{campaign.total_contents || 0}</span>
              <span className="text-[10px] text-slate-400 block font-normal">contenidos</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelect(campaign)}
          className="text-xs bg-dark-950 hover:bg-aura-500 hover:text-white border-dark-700 hover:border-aura-400 transition-all font-semibold flex items-center justify-center gap-1.5 group/btn"
        >
          <span>Abrir Workspace</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
