import { Search, Filter, X } from 'lucide-react';
import { ContentStatus, SocialPlatform } from '../../types/contentItem';
import { cn } from '../../lib/utils';

interface ContentFilterBarProps {
  currentStatus: ContentStatus | 'all';
  onSelectStatus: (status: ContentStatus | 'all') => void;
  currentPlatform: SocialPlatform | 'all';
  onSelectPlatform: (platform: SocialPlatform | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount?: number;
}

export function ContentFilterBar({
  currentStatus,
  onSelectStatus,
  currentPlatform,
  onSelectPlatform,
  searchQuery,
  onSearchChange,
  totalCount,
}: ContentFilterBarProps) {
  const statusTabs: Array<{ id: ContentStatus | 'all'; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'draft', label: 'Borradores' },
    { id: 'scheduled', label: 'Programados' },
    { id: 'approved', label: 'Aprobados' },
    { id: 'rejected', label: 'Rechazados' },
    { id: 'published', label: 'Publicados' },
  ];

  const platforms: Array<{ id: SocialPlatform | 'all'; label: string }> = [
    { id: 'all', label: 'Todas las Redes' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'linkedin', label: 'LinkedIn' },
  ];

  return (
    <div className="space-y-4">
      {/* Upper bar: Status Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-dark-900 border border-dark-800/80 rounded-2xl overflow-x-auto scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectStatus(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none',
                  isActive
                    ? 'bg-aura-600 text-white shadow-md shadow-aura-600/25 border border-aura-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800/60'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título, gancho o copy..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-aura-500 focus:ring-1 focus:ring-aura-500/30 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Lower bar: Platform Pills & Counter */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3 h-3" />
            Red:
          </span>
          {platforms.map((p) => {
            const isActive = currentPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPlatform(p.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all select-none whitespace-nowrap',
                  isActive
                    ? 'bg-dark-800 text-white border border-dark-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-dark-900/60'
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {totalCount !== undefined && (
          <span className="text-xs text-slate-400 font-medium shrink-0">
            Mostrando <strong className="text-white">{totalCount}</strong> contenidos
          </span>
        )}
      </div>
    </div>
  );
}
