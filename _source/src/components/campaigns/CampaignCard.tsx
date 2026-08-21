import { Campaign, CampaignStatus } from '../../types/campaign';
import { 
  Calendar, 
  Layers, 
  Lightbulb, 
  Zap, 
  Users, 
  Radio, 
  ArrowRight
} from 'lucide-react';

interface CampaignCardProps {
  campaign: Campaign;
  onSelect: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onSelect }: CampaignCardProps) {
  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Activa
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Borrador
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            Pausada
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            Completada
          </span>
        );
      case 'archived':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Archivada
          </span>
        );
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
      onClick={() => onSelect(campaign)}
      className="group relative bg-dark-900/90 hover:bg-dark-850 border border-dark-800 hover:border-aura-500/40 rounded-2xl p-5.5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg shadow-black/20 hover:shadow-aura-500/5 overflow-hidden"
    >
      {/* Top ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-aura-500/5 rounded-full blur-2xl group-hover:bg-aura-500/10 transition-all pointer-events-none"></div>

      <div>
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-aura-400/80 bg-aura-500/10 px-2 py-0.5 rounded-md border border-aura-500/20">
                /{campaign.slug}
              </span>
              {campaign.strategic_theme && (
                <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  • {campaign.strategic_theme}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-aura-300 transition-colors line-clamp-1">
              {campaign.name}
            </h3>
          </div>
          <div className="shrink-0">
            {getStatusBadge(campaign.status)}
          </div>
        </div>

        {/* Strategic Objective */}
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
          {campaign.strategic_objective}
        </p>

        {/* Tags / Metadata Context */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {campaign.target_audience && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-dark-950/60 px-2.5 py-1 rounded-lg border border-dark-800">
              <Users className="w-3 h-3 text-indigo-400" />
              <span className="truncate max-w-[140px]">{campaign.target_audience}</span>
            </span>
          )}
          {campaign.primary_channel && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-dark-950/60 px-2.5 py-1 rounded-lg border border-dark-800">
              <Radio className="w-3 h-3 text-pink-400" />
              <span className="capitalize">{campaign.primary_channel}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-dark-950/60 px-2.5 py-1 rounded-lg border border-dark-800">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span>{formatDateRange(campaign.start_date, campaign.end_date)}</span>
          </span>
        </div>
      </div>

      {/* Footer Counters */}
      <div className="pt-3 border-t border-dark-800/80 flex items-center justify-between mt-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-300" title="Sesiones creativas">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">{campaign.total_generations || 0}</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">sesiones</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-300" title="Ideas estratégicas">
            <Lightbulb className="w-3.5 h-3.5 text-aura-400" />
            <span className="font-semibold">{campaign.total_ideas || 0}</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">ideas</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-300" title="Contenidos producidos">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">{campaign.total_contents || 0}</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">contenidos</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-aura-400 group-hover:translate-x-0.5 transition-transform">
          <span>Abrir</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
