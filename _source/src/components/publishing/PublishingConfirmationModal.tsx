import { useState } from 'react';
import { SocialPlatform } from '../../types/publishing';
import { Button } from '../common/Button';
import { isRealPublishingEnabled } from '../../config/publishingConfig';
import { 
  CheckCircle2, 
  X,
  Instagram,
  Facebook,
  Video,
  Youtube,
  Linkedin,
  ClipboardList,
  Bot,
  AlertTriangle,
  Rocket,
  Lock
} from 'lucide-react';

export type PublishingExecutionMode = 'manual' | 'mock' | 'real';

interface PublishingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: PublishingExecutionMode) => Promise<void>;
  platforms: SocialPlatform[];
  contentTitle: string;
  renderJobId?: string;
  isPublishing: boolean;
  initialMode?: PublishingExecutionMode;
  connectedAccountName?: string;
  hasValidConnection?: boolean;
}

const PLATFORM_ICONS: Record<SocialPlatform, { name: string; icon: React.ReactNode }> = {
  instagram: { name: 'Instagram', icon: <Instagram className="w-4 h-4 text-pink-400" /> },
  tiktok: { name: 'TikTok', icon: <Video className="w-4 h-4 text-teal-400" /> },
  facebook: { name: 'Facebook', icon: <Facebook className="w-4 h-4 text-blue-400" /> },
  youtube: { name: 'YouTube', icon: <Youtube className="w-4 h-4 text-red-400" /> },
  linkedin: { name: 'LinkedIn', icon: <Linkedin className="w-4 h-4 text-sky-400" /> },
};

export function PublishingConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  platforms,
  contentTitle,
  renderJobId,
  isPublishing,
  initialMode = 'manual',
  connectedAccountName,
  hasValidConnection = true,
}: PublishingConfirmationModalProps) {
  const [selectedMode, setSelectedMode] = useState<PublishingExecutionMode>(initialMode);
  const [realDoubleConfirmed, setRealDoubleConfirmed] = useState<boolean>(false);

  if (!isOpen) return null;

  const isRealKillSwitchActive = !isRealPublishingEnabled();
  const isSinglePlatform = platforms.length === 1;
  const singlePlatform = isSinglePlatform ? platforms[0] : null;

  const getRealButtonText = () => {
    if (isRealKillSwitchActive) return '🔒 REAL BLOQUEADO EN ENTORNO';
    if (singlePlatform === 'instagram') return '🚀 PUBLICAR EN INSTAGRAM';
    if (singlePlatform === 'facebook') return '🚀 PUBLICAR EN FACEBOOK';
    return '🚀 PUBLICAR EN REDES SOCIALES';
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-dark-950 border border-dark-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col space-y-4 p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              selectedMode === 'real'
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : selectedMode === 'mock'
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
            }`}>
              {selectedMode === 'real' ? <Rocket className="w-4 h-4" /> : selectedMode === 'mock' ? <Bot className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Método de Publicación
              </h3>
              <p className="text-[11px] text-slate-400">
                Seleccioná cómo deseás despachar este contenido
              </p>
            </div>
          </div>

          <button onClick={onClose} disabled={isPublishing} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Modo de Ejecución:
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            {/* 1. MODO MANUAL */}
            <div
              onClick={() => setSelectedMode('manual')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                selectedMode === 'manual'
                  ? 'bg-purple-500/10 border-purple-500 text-white shadow-lg ring-1 ring-purple-500/50'
                  : 'bg-dark-900 border-dark-800 text-slate-400 hover:border-dark-700'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${selectedMode === 'manual' ? 'bg-purple-500 text-white' : 'bg-dark-800 text-slate-400'}`}>
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">📋 Publicación Manual</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono">Recomendado</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Genera el paquete completo (copy, hashtags, video MP4 y thumbnail) para publicar manualmente a tu ritmo sin requerir API.
                </p>
              </div>
            </div>

            {/* 2. MODO MOCK */}
            <div
              onClick={() => setSelectedMode('mock')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                selectedMode === 'mock'
                  ? 'bg-blue-500/10 border-blue-500 text-white shadow-lg ring-1 ring-blue-500/50'
                  : 'bg-dark-900 border-dark-800 text-slate-400 hover:border-dark-700'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${selectedMode === 'mock' ? 'bg-blue-500 text-white' : 'bg-dark-800 text-slate-400'}`}>
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">🤖 Simulación Automática (Mock)</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">Costo $0</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Simula la publicación automática mediante outbox y genera IDs de prueba sin enviar peticiones reales a redes sociales.
                </p>
              </div>
            </div>

            {/* 3. MODO REAL */}
            <div
              onClick={() => setSelectedMode('real')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                selectedMode === 'real'
                  ? 'bg-rose-500/10 border-rose-500 text-white shadow-lg ring-1 ring-rose-500/50'
                  : 'bg-dark-900 border-dark-800 text-slate-400 hover:border-dark-700'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${selectedMode === 'real' ? 'bg-rose-500 text-white' : 'bg-dark-800 text-slate-400'}`}>
                <Rocket className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">🚀 Publicación Real (Meta API)</span>
                  {isRealKillSwitchActive ? (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Kill Switch Activo
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono">Producción</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Despacha el video real a través de Meta Graph API v19.0 (Instagram Reels / Facebook Page Video) utilizando la cuenta conectada.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Real Mode Notice / Warning & Checklist */}
        {selectedMode === 'real' && (
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isRealKillSwitchActive 
              ? 'bg-amber-950/30 border-amber-500/40' 
              : 'bg-rose-950/40 border-rose-500/40'
          }`}>
            <div className="flex items-center gap-2 font-bold text-xs">
              {isRealKillSwitchActive ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-300">🔒 PUBLICACIÓN REAL BLOQUEADA EN ESTE ENTORNO</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-rose-300">⚠️ ATENCIÓN: ESTO PUBLICARÁ CONTENIDO REAL EN LA RED SOCIAL</span>
                </>
              )}
            </div>

            {isRealKillSwitchActive ? (
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Por seguridad y protección contra publicaciones accidentales, el Kill Switch de producción está activo (<code className="font-mono text-amber-300">REAL_PUBLISHING_ENABLED=false</code>). Podés probar todo el flujo utilizando el <strong>Modo Mock</strong> o activar el switch mediante el Piloto Controlado.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-200">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Render aprobado</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Quality Gate superado</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Copy y Safe Areas OK</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{connectedAccountName ? `Cuenta: ${connectedAccountName}` : 'Cuenta conectada'}</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-2 border-t border-rose-500/30 text-xs text-rose-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={realDoubleConfirmed}
                    onChange={(e) => setRealDoubleConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded border-rose-500 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Confirmo que revisé el contenido y autorizo la publicación real.</span>
                </label>
              </>
            )}
          </div>
        )}

        {/* Publication Summary */}
        <div className="p-3.5 rounded-2xl bg-dark-900 border border-dark-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Contenido:</span>
            <span className="font-semibold text-white truncate max-w-[240px]">{contentTitle}</span>
          </div>

          {renderJobId && (
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-400">Render Job:</span>
              <span className="text-slate-300">{renderJobId.slice(0, 13)}...</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Destinos ({platforms.length}):</span>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((p) => {
                const meta = PLATFORM_ICONS[p] || { name: p, icon: null };
                return (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-dark-950 border border-dark-700 text-slate-200 text-[11px] font-semibold"
                  >
                    {meta.icon}
                    {meta.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isPublishing}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="sm"
            isLoading={isPublishing}
            disabled={
              selectedMode === 'real' && (isRealKillSwitchActive || !realDoubleConfirmed || !hasValidConnection)
            }
            onClick={() => onConfirm(selectedMode)}
            leftIcon={
              selectedMode === 'real' ? (isRealKillSwitchActive ? <Lock className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />) :
              selectedMode === 'mock' ? <Bot className="w-3.5 h-3.5" /> :
              <ClipboardList className="w-3.5 h-3.5" />
            }
            className={`text-xs font-bold shadow-lg ${
              selectedMode === 'real'
                ? isRealKillSwitchActive
                  ? 'bg-amber-700 text-amber-200 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white'
                : selectedMode === 'mock'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
            }`}
          >
            {selectedMode === 'real' ? getRealButtonText() : selectedMode === 'mock' ? 'Confirmar Publicación (Mock)' : 'Preparar Publicación Manual'}
          </Button>
        </div>

      </div>
    </div>
  );
}
