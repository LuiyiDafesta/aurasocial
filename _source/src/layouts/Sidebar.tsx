import { 
  LayoutDashboard, 
  Lightbulb, 
  Layers, 
  Calendar, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  FileText, 
  XCircle, 
  Facebook,
  Instagram,
  Video,
  Youtube,
  Linkedin,
  Globe,
  Radio
} from 'lucide-react';
import { SocialAccount } from '../types/socialAccount';
import { StatusCounts } from '../types/database';
import { cn } from '../lib/utils';

export type NavigationTab = 'dashboard' | 'ideas' | 'contenidos' | 'calendario' | 'analytics';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  workspaceName?: string;
  brandName?: string;
  socialAccounts?: SocialAccount[];
  stats?: StatusCounts;
  isStatsLoading?: boolean;
  isAccountsLoading?: boolean;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  workspaceName,
  brandName,
  socialAccounts = [],
  stats = { all: 0, draft: 0, approved: 0, scheduled: 0, published: 0, rejected: 0 },
  isStatsLoading = false,
  isAccountsLoading = false,
}: SidebarProps) {
  const displayName = brandName || workspaceName || 'Cargando...';
  
  // Calcular iniciales dinámicas (ej. "TravelRockChannel" -> "TR")
  const initials = displayName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AS';

  const activeAccountsCount = socialAccounts.filter((a) => a.is_connected && a.is_enabled).length;

  const navItems = [
    { id: 'dashboard' as NavigationTab, label: 'Dashboard', icon: LayoutDashboard, isPlaceholder: true },
    { id: 'ideas' as NavigationTab, label: 'Ideas', icon: Lightbulb, isPlaceholder: true },
    { id: 'contenidos' as NavigationTab, label: 'Contenidos', icon: Layers, isPlaceholder: false, isPrimary: true },
    { id: 'calendario' as NavigationTab, label: 'Calendario', icon: Calendar, isPlaceholder: true },
    { id: 'analytics' as NavigationTab, label: 'Analytics', icon: BarChart3, isPlaceholder: true },
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'facebook':
        return <Facebook className="w-3.5 h-3.5 text-blue-400" />;
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-400" />;
      case 'tiktok':
        return <Video className="w-3.5 h-3.5 text-cyan-400" />;
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5 text-red-400" />;
      case 'linkedin':
        return <Linkedin className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <aside className="w-72 bg-dark-900 border-r border-dark-800/80 flex flex-col h-screen select-none shrink-0">
      {/* Brand & Workspace Header */}
      <div className="p-5 border-b border-dark-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[2px] shadow-lg shadow-rose-950/30">
            <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center font-black text-xs tracking-wider text-white">
              {initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight truncate">
              {displayName}
            </h2>
            {workspaceName && brandName && workspaceName !== brandName ? (
              <span className="text-[10px] text-slate-400 truncate block">
                Workspace: {workspaceName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Workspace Conectado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Status Counters */}
      <div className="p-4 border-b border-dark-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Estado de Contenidos
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Draft */}
          <div className="bg-dark-950/70 border border-dark-800 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white leading-none">
                {isStatsLoading ? '-' : stats.draft}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Borradores</div>
            </div>
          </div>

          {/* Scheduled */}
          <div className="bg-dark-950/70 border border-dark-800 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white leading-none">
                {isStatsLoading ? '-' : stats.scheduled}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Programados</div>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-dark-950/70 border border-dark-800 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white leading-none">
                {isStatsLoading ? '-' : stats.approved}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Aprobados</div>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-dark-950/70 border border-dark-800 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white leading-none">
                {isStatsLoading ? '-' : stats.rejected}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Rechazados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Connected Accounts Section */}
      <div className="px-4 py-3 border-b border-dark-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Cuentas Conectadas
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {isAccountsLoading ? '...' : `${activeAccountsCount} activa${activeAccountsCount === 1 ? '' : 's'}`}
          </span>
        </div>

        {isAccountsLoading ? (
          <div className="flex items-center gap-2 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-dark-800"></div>
            <div className="w-8 h-8 rounded-lg bg-dark-800"></div>
          </div>
        ) : socialAccounts.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {socialAccounts.map((acc) => {
              const avatarUrl = acc.metadata?.avatar_url;
              return (
                <div
                  key={acc.id}
                  title={`${acc.account_name} (${acc.platform})`}
                  className={cn(
                    'relative w-8 h-8 rounded-lg border flex items-center justify-center transition-transform hover:scale-105',
                    acc.is_connected && acc.is_enabled
                      ? 'bg-dark-950 border-dark-700/80 shadow-sm'
                      : 'bg-dark-950/40 border-dark-800/40 opacity-50'
                  )}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={acc.account_name}
                      className="w-full h-full rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    getPlatformIcon(acc.platform)
                  )}

                  {/* Dot de conexión */}
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-dark-900',
                      acc.is_connected && acc.is_enabled ? 'bg-emerald-400' : 'bg-slate-500'
                    )}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5">
            <Radio className="w-3 h-3" />
            Sin cuentas vinculadas
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-3 flex-1 overflow-y-auto space-y-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5 block">
          Navegación
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-aura-600/15 text-aura-300 border border-aura-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800/60'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-aura-400' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.isPrimary && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-aura-500/20 text-aura-300 border border-aura-500/30">
                  MVP
                </span>
              )}
              {item.isPlaceholder && (
                <span className="text-[10px] text-slate-400 group-hover:text-slate-400">
                  Pronto
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-800/80 text-[11px] text-slate-400 text-center">
        Aura Social v1.0 · Fase 4.1
      </div>
    </aside>
  );
}
