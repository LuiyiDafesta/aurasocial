import { ContentItem } from '../../types/contentItem';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { Eye, Clock, Calendar, UserCheck, Film, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ContentCardProps {
  item: ContentItem;
  onReview: (item: ContentItem) => void;
}

export function ContentCard({ item, onReview }: ContentCardProps) {
  const accountName = item.social_accounts?.account_name || 'Cuenta vinculada';
  const avatarUrl = item.social_accounts?.metadata?.avatar_url;
  const isVideo = item.content_type?.toLowerCase().includes('video') || item.content_type?.toLowerCase().includes('reel');

  return (
    <div className="bg-dark-900/90 border border-dark-800/90 hover:border-dark-700/90 rounded-2xl p-5 shadow-lg shadow-black/20 flex flex-col justify-between gap-4 transition-all duration-200 group hover:shadow-xl hover:shadow-aura-950/10">
      {/* Top Header: Platform, Type, Account and Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <PlatformBadge platform={item.platform} size="sm" />
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 border border-dark-700">
              {isVideo ? <Film className="w-3 h-3 text-aura-400" /> : <ImageIcon className="w-3 h-3 text-slate-400" />}
              {item.content_type || 'Post'}
            </span>
          </div>
          <StatusBadge status={item.status} size="sm" />
        </div>

        {/* Read-only Connected Social Account */}
        <div className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-dark-950/60 border border-dark-800/80 text-xs text-slate-300">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={accountName}
              className="w-4 h-4 rounded-full object-cover shrink-0"
              onError={(e) => {
                // Fallback si falla la imagen
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

      {/* Footer: Argentina Timestamps & Review Button */}
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => onReview(item)}
          rightIcon={<Eye className="w-3.5 h-3.5 text-aura-400" />}
          className="hover:border-aura-500/50 hover:bg-aura-500/10 hover:text-white shrink-0"
        >
          Revisar
        </Button>
      </div>
    </div>
  );
}
