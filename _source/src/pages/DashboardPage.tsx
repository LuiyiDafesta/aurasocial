import { Brand, StatusCounts } from '../types/database';
import { SocialAccount } from '../types/socialAccount';
import { 
  Sparkles, 
  Lightbulb, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Activity,
  Zap
} from 'lucide-react';
import { Button } from '../components/common/Button';

interface DashboardPageProps {
  currentBrand: Brand | null;
  stats?: StatusCounts;
  socialAccounts?: SocialAccount[];
  onNavigate: (tab: any) => void;
}

export function DashboardPage({
  currentBrand,
  stats = { all: 0, draft: 0, approved: 0, scheduled: 0, published: 0, rejected: 0 },
  socialAccounts = [],
  onNavigate,
}: DashboardPageProps) {
  const connectedAccounts = socialAccounts.filter((a) => a.is_connected && a.is_enabled);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-dark-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-aura-600 to-indigo-600 p-[2px] shadow-lg shadow-aura-950/40">
              <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center text-aura-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Centro Operativo — {currentBrand?.name || 'Aura Social'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Estado general del pipeline de contenido, canales sociales y producción activa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('ideas')}
            leftIcon={<Lightbulb className="w-3.5 h-3.5 text-aura-400" />}
            className="bg-dark-950 border-dark-800 text-slate-200"
          >
            Banco de Ideas
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('contenidos')}
            leftIcon={<Layers className="w-3.5 h-3.5" />}
            className="bg-aura-600 hover:bg-aura-500 text-white font-semibold"
          >
            Ver Pipeline de Contenidos
          </Button>
        </div>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contenidos */}
        <div 
          onClick={() => onNavigate('contenidos')}
          className="p-5 rounded-3xl bg-dark-900/80 border border-dark-800 hover:border-aura-500/40 transition-all cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Contenidos</span>
            <Layers className="w-4 h-4 text-aura-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.all}</div>
          <p className="text-[11px] text-slate-500 mt-1">Piezas registradas en la marca</p>
        </div>

        {/* Borradores */}
        <div 
          onClick={() => onNavigate('contenidos')}
          className="p-5 rounded-3xl bg-dark-900/80 border border-dark-800 hover:border-amber-500/40 transition-all cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Borradores</span>
            <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">{stats.draft}</div>
          <p className="text-[11px] text-slate-500 mt-1">En redacción o guión</p>
        </div>

        {/* Listos para Publicar */}
        <div 
          onClick={() => onNavigate('contenidos')}
          className="p-5 rounded-3xl bg-dark-900/80 border border-dark-800 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Listos / Aprobados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">{stats.approved}</div>
          <p className="text-[11px] text-slate-500 mt-1">Quality Gate 100% verificado</p>
        </div>

        {/* Canales Conectados */}
        <div 
          onClick={() => onNavigate('settings')}
          className="p-5 rounded-3xl bg-dark-900/80 border border-dark-800 hover:border-sky-500/40 transition-all cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Canales Sociales</span>
            <Activity className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-sky-400 tracking-tight">{connectedAccounts.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Cuentas activas en Socialit</p>
        </div>
      </div>

      {/* Two Column Section: Quick Tasks + Social Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Tasks (7 cols) */}
        <div className="lg:col-span-7 bg-dark-900/80 border border-dark-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-800">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-aura-400" /> Acciones Rápidas
            </h2>
            <span className="text-[11px] text-slate-400">Flujo continuo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onNavigate('ideas')}
              className="p-4 rounded-2xl bg-dark-950/80 border border-dark-800/80 hover:border-aura-500/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-aura-500/10 text-aura-400 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-aura-300 transition-colors">
                Generar Ideas con IA
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ejecuta el generador basado en el Brand Brain de la marca para obtener nuevos ganchos virales.
              </p>
            </div>

            <div
              onClick={() => onNavigate('contenidos')}
              className="p-4 rounded-2xl bg-dark-950/80 border border-dark-800/80 hover:border-sky-500/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                Producir en Workspace
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Asigna videos MP4, edita textos en pantalla y previsualiza en vivo para Instagram y TikTok.
              </p>
            </div>

            <div
              onClick={() => onNavigate('assets')}
              className="p-4 rounded-2xl bg-dark-950/80 border border-dark-800/80 hover:border-pink-500/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                Biblioteca de Medios
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Explora los videos y fotos almacenados en Backblaze B2 servidos mediante Cloudflare CDN ($0 egress).
              </p>
            </div>

            <div
              onClick={() => onNavigate('campaigns')}
              className="p-4 rounded-2xl bg-dark-950/80 border border-dark-800/80 hover:border-emerald-500/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Estrategia y Campañas
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Agrupa contenidos bajo objetivos estratégicos y cronogramas de lanzamiento.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Social Channels Health (5 cols) */}
        <div className="lg:col-span-5 bg-dark-900/80 border border-dark-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-800">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" /> Canales Sociales Conectados
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-[11px] text-aura-400 hover:underline font-semibold"
            >
              Gestionar
            </button>
          </div>

          <div className="space-y-2.5">
            {connectedAccounts.length > 0 ? (
              connectedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-2xl bg-dark-950/80 border border-dark-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {acc.metadata?.avatar_url ? (
                      <img src={acc.metadata.avatar_url} alt={acc.account_name} className="w-8 h-8 rounded-xl object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-dark-900 flex items-center justify-center text-xs font-bold text-slate-300">
                        {acc.platform[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white capitalize">{acc.platform}</div>
                      <div className="text-[11px] text-slate-400">{acc.account_name || acc.username}</div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Activo
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 border border-dashed border-dark-800 rounded-2xl bg-dark-950/40">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No hay canales sociales conectados todavía.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('settings')}
                  className="mt-3 text-xs bg-dark-900 border-dark-700 text-white"
                >
                  Conectar en Socialit
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
