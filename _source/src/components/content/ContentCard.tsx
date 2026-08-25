import { ContentItem } from '../../types/contentItem';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { 
  Eye, 
  Clock, 
  Calendar, 
  UserCheck, 
  Film, 
  Image as ImageIcon, 
  Clapperboard, 
  Layers, 
  FolderPlus, 
  Target,
  Trash2,
  Check
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ContentCardProps {
  item: ContentItem;
  onReview: (item: ContentItem) => void;
  onAssignCampaign?: (item: ContentItem) => void;
  onDelete?: (item: ContentItem) => void;
  isSelected?: boolean;
  onToggleSelect?: (item: ContentItem) => void;
}

export function ContentCard({ 
  item, 
  onReview, 
  onAssignCampaign,
  onDelete,
  isSelected = false,
  onToggleSelect,
}: ContentCardProps) {
  const accountName = item.social_accounts?.account_name || 'Cuenta vinculada';
  const avatarUrl = item.social_accounts?.metadata?.avatar_url;
  const isVideo = item.content_type?.toLowerCase().includes('video') || item.content_type?.toLowerCase().includes('reel');
  const scenesCount = Array.isArray(item.scenes) ? item.scenes.length : 0;

  return (
    <div className={cn(
      "relative bg-dark-900/90 border rounded-2xl p-5 shadow-lg shadow-black/20 flex flex-col justify-between gap-4 transition-all duration-200 group hover:shadow-xl hover:shadow-aura-950/10",
      isSelected
        ? "border-aura-500 ring-2 ring-aura-500/30 bg-aura-500/5"
        : "border-dark-800/90 hover:border-dark-700/90"
    )}>
      {/* Selection Checkbox */}
      {onToggleSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item);
          }}
          className={cn(
            "absolute top-4 left-4 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-md",
            isSelected
              ? "bg-aura-600 text-white ring-2 ring-aura-400 border border-aura-400 scale-105"
              : "bg-dark-950/80 border border-dark-600/80 text-transparent hover:border-aura-400 hover:text-slate-400/60 hover:bg-dark-900"
          )}
          title={isSelected ? "Deseleccionar contenido" : "Seleccionar contenido"}
        >
          <Check className={cn("w-3.5 h-3.5 stroke-[3]", isSelected ? "opacity-100 text-white" : "opacity-0 hover:opacity-100 text-slate-300")} />
        </button>
      )}

      {/* Top Header: Platform, Type, Account and Status */}
      <div className="space-y-3">
        <div className={cn("flex items-center justify-between gap-2", onToggleSelect && "pl-8")}>
          <div className="flex items-center gap-2 flex-wrap">
            <PlatformBadge platform={item.platform} size="sm" />
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 border border-dark-700">
              {isVideo ? <Film className="w-3 h-3 text-aura-400" /> : <ImageIcon className="w-3 h-3 text-slate-400" />}
              {item.content_type || 'Post'}
            </span>
            {scenesCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <Clapperboard className="w-3 h-3 text-purple-400" />
                {scenesCount} Escenas
              </span>
            )}
          </div>
          <StatusBadge status={item.status} size="sm" />
        </div>

        {/* Origin Idea Badge if generated from idea */}
        {item.content_ideas?.title && (
          <div className="flex items-center gap-1.5 text-[11px] text-purple-300 bg-purple-950/30 px-2.5 py-1 rounded-lg border border-purple-900/40 truncate">
            <Layers className="w-3 h-3 text-purple-400 shrink-0" />
            <span className="truncate">Idea: {item.content_ideas.title}</span>
          </div>
        )}

        {/* Campaign Badge if assigned to a campaign */}
        {item.campaigns?.name && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-900/40 truncate">
            <Target className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">Campaña: {item.campaigns.name}</span>
          </div>
        )}

        {/* Read-only Connected Social Account */}
        <div className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-dark-950/60 border border-dark-800/80 text-xs text-slate-300">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={accountName}
              className="w-4 h-4 rounded-full object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <UserCheck className="w-3.5 h-3.5 text-aura-400 shrink-0" />
          )}
          <span className="truncate font-medium text-slate-200">
            {accountName}
          </span>
          <span className="text-[10px] text-slate-400 ml-auto font-mono uppercase">
            Solo Lectura
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white tracking-tight leading-snug group-hover:text-aura-300 transition-colors line-clamp-2">
          {item.title || 'Sin título'}
        </h3>

        {/* Hook preview */}
        {item.hook && (
          <div className="text-xs text-slate-300 italic bg-dark-950/40 p-2.5 rounded-xl border border-dark-800/50 line-clamp-2 leading-relaxed">
            "{item.hook}"
          </div>
        )}

        {/* Caption snippet */}
        {item.caption && !item.hook && (
          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
            {item.caption}
          </p>
        )}
      </div>

      {/* Footer: Argentina Timestamps & Actions */}
      <div className="pt-3 border-t border-dark-800/80 flex items-center justify-between gap-3">
        <div className="space-y-0.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Creado: <strong className="text-slate-300 font-medium">{formatInArgentina(item.created_at, 'dd/MM/yyyy HH:mm')}</strong></span>
          </div>

          {item.scheduled_at && (
            <div className={cn(
              "flex items-center gap-1.5 font-medium",
              item.status === 'scheduled' ? "text-sky-400" : "text-slate-400"
            )}>
              <Clock className="w-3 h-3 shrink-0 text-sky-400" />
              <span>Programado: {formatInArgentina(item.scheduled_at, 'dd/MM/yyyy HH:mm')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Eliminar contenido"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onAssignCampaign && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAssignCampaign(item)}
              leftIcon={<FolderPlus className="w-3.5 h-3.5 text-aura-400" />}
              className="text-xs text-slate-300 hover:text-white px-2.5 h-8"
              title={item.campaign_id ? 'Mover o quitar de campaña' : 'Asignar a campaña'}
            >
              {item.campaign_id ? 'Mover' : 'Asignar'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onReview(item)}
            rightIcon={<Eye className="w-3.5 h-3.5 text-aura-400" />}
            className="hover:border-aura-500/50 hover:bg-aura-500/10 hover:text-white shrink-0 text-xs h-8"
          >
            Revisar
          </Button>
        </div>
      </div>
    </div>
  );
}
