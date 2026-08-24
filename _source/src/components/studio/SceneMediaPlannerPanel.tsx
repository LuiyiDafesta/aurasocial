import { useState } from 'react';
import { SceneMediaPlan, AssetResolutionSource } from '../../types/platformAdaptation';
import { Button } from '../common/Button';
import { 
  Film, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Type, 
  ShieldCheck, 
  ShieldAlert,
  FolderOpen
} from 'lucide-react';

interface SceneMediaPlannerPanelProps {
  scenes: SceneMediaPlan[];
  activeSceneNumber?: number;
  onSelectActiveScene?: (sceneNumber: number) => void;
  onSelectSceneForAsset: (sceneNumber: number) => void;
  onUpdateSceneText: (sceneNumber: number, text: string) => void;
  onUsePlaceholder: (sceneNumber: number) => void;
  isReadOnly?: boolean;
}

export function SceneMediaPlannerPanel({
  scenes,
  activeSceneNumber,
  onSelectActiveScene,
  onSelectSceneForAsset,
  onUpdateSceneText,
  onUsePlaceholder,
  isReadOnly = false,
}: SceneMediaPlannerPanelProps) {
  const [internalSceneIndex, setInternalSceneIndex] = useState<number>(0);

  const activeSceneIndex = activeSceneNumber !== undefined
    ? Math.max(0, scenes.findIndex((s) => s.scene_number === activeSceneNumber))
    : internalSceneIndex;

  const getSourceBadge = (source: AssetResolutionSource, status: string) => {
    if (status === 'needs_asset' || source === 'needs_asset') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3 h-3" />
          Needs Asset
        </span>
      );
    }
    if (source === 'real_asset') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          Real Asset
        </span>
      );
    }
    if (source === 'campaign_asset') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <Layers className="w-3 h-3" />
          Campaña
        </span>
      );
    }
    if (source === 'brand_asset') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30">
          <Sparkles className="w-3 h-3" />
          Marca
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/30">
        <Sparkles className="w-3 h-3" />
        Placeholder
      </span>
    );
  };

  const currentScene = scenes[activeSceneIndex] || scenes[0];

  return (
    <div className="flex flex-col h-full bg-dark-900/90 border border-dark-800 rounded-3xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-800">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-aura-400 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            Media Planner & Escenas
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {scenes.length} escenas planificadas para producción
          </p>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-dark-950 border border-dark-800 text-slate-300">
          Total: {scenes.reduce((a, s) => a + (s.duration_seconds || 5), 0)}s
        </span>
      </div>

      {/* Scene Pills List */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {scenes.map((scene, idx) => {
          const isSelected = idx === activeSceneIndex;
          const isResolved = scene.status === 'resolved';

          return (
            <button
              key={scene.scene_number}
              onClick={() => {
                setInternalSceneIndex(idx);
                if (onSelectActiveScene) {
                  onSelectActiveScene(scene.scene_number);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-aura-600 text-white shadow-md shadow-aura-950/40'
                  : 'bg-dark-950/80 border border-dark-800/80 text-slate-300 hover:bg-dark-800'
              }`}
            >
              <span>E{scene.scene_number}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isResolved ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
            </button>
          );
        })}
      </div>

      {/* Selected Scene Detail Card */}
      {currentScene && (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Card Title & Badges */}
          <div className="p-3.5 rounded-2xl bg-dark-950/70 border border-dark-800 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                Escena #{currentScene.scene_number}
                <span className="text-[11px] text-slate-400 font-normal font-mono">
                  ({currentScene.duration_seconds}s)
                </span>
              </span>
              {getSourceBadge(currentScene.source, currentScene.status)}
            </div>

            {/* Asset Status & Action */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-dark-900 border border-dark-800/80 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {currentScene.asset_type === 'video' ? (
                  <Film className="w-4 h-4 text-pink-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span className="text-slate-200 truncate font-medium">
                  {currentScene.asset_name || 'Sin recurso asignado'}
                </span>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectSceneForAsset(currentScene.scene_number)}
                    leftIcon={<FolderOpen className="w-3 h-3" />}
                    className="text-[11px] h-7 px-2.5 hover:border-aura-500/50"
                  >
                    Asignar
                  </Button>
                  {currentScene.status === 'needs_asset' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUsePlaceholder(currentScene.scene_number)}
                      className="text-[11px] h-7 px-2 text-slate-400 hover:text-sky-300"
                      title="Usar placeholder determinista sin costo"
                    >
                      Mock
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Visual & Camera Directions */}
          <div className="space-y-3">
            {currentScene.visual_direction && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Dirección Visual:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-dark-950/40 p-3 rounded-xl border border-dark-800/60">
                  {currentScene.visual_direction}
                </p>
              </div>
            )}

            {currentScene.camera_direction && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Cámara & Encuadre:
                </span>
                <p className="text-xs text-slate-400 italic bg-dark-950/40 p-2.5 rounded-xl border border-dark-800/60">
                  {currentScene.camera_direction}
                </p>
              </div>
            )}

            {/* Voiceover / Diálogo */}
            {currentScene.voiceover && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-pink-400 tracking-wider block">
                  Locución / Voiceover:
                </span>
                <p className="text-xs text-pink-100/90 italic bg-pink-950/20 p-3 rounded-xl border border-pink-800/30">
                  "{currentScene.voiceover}"
                </p>
              </div>
            )}

            {/* Deterministic On-Screen Text Overlay */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-aura-300 tracking-wider flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  Texto en Pantalla (Overlay Determinista)
                </span>
                {currentScene.safe_area_valid ? (
                  <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" /> Safe Area OK
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-0.5">
                    <ShieldAlert className="w-3 h-3" /> Safe Area Alerta
                  </span>
                )}
              </div>

              <textarea
                value={currentScene.on_screen_text || ''}
                onChange={(e) => onUpdateSceneText(currentScene.scene_number, e.target.value)}
                disabled={isReadOnly}
                rows={2}
                placeholder="Texto a sobreimprimir en el video..."
                className="w-full bg-dark-950 border border-dark-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500 font-sans resize-none"
              />

              {currentScene.safe_area_warning && (
                <p className="text-[11px] text-amber-300 leading-snug">
                  ⚠️ {currentScene.safe_area_warning}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
