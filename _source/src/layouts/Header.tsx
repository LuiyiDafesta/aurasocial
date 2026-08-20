import { Clock, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User | null;
  onSignOut: () => void;
  title?: string;
}

export function Header({ user, onSignOut, title = 'Gestión de Contenidos' }: HeaderProps) {
  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-xl border-b border-dark-800/80 px-6 flex items-center justify-between shrink-0 z-20">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
      </div>

      {/* Right Actions & Badges */}
      <div className="flex items-center gap-3">
        {/* Timezone Badge (Strict Argentina UTC-3) */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-950/80 border border-dark-800 text-xs font-medium text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Hora Oficial: <strong className="text-white font-semibold">Argentina (UTC-3)</strong></span>
        </div>

        {/* User / Workspace profile */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-dark-800">
            <div className="w-8 h-8 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-white leading-tight truncate max-w-[150px]">
                {user.email || 'Usuario'}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3" />
                Autenticado
              </div>
            </div>

            <button
              onClick={onSignOut}
              title="Cerrar sesión"
              className="ml-1 p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
