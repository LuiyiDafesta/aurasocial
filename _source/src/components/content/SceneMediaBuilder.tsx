import { useState, useMemo } from 'react';
import { Scene, ContentItem } from '../../types/contentItem';
import { MediaSlot } from '../../types/mediaSlot';
import { ContentAsset } from '../../types/contentAsset';
import { MediaSlotCard } from './MediaSlotCard';
import { SlotAssetPickerModal } from './SlotAssetPickerModal';
import { AssetPreviewModal } from '../assets/AssetPreviewModal';
import { AssetUploadModal } from '../assets/AssetUploadModal';
import { 
  calculateSceneReadiness, 
  calculateContentReadiness,
  manuallyResolveMediaSlot,
  clearMediaSlotResolution
} from '../../services/mediaSourcingService';
import { extractMediaSlotsFromScenes } from '../../services/mediaSlotService';
import { 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Compass, 
  Monitor 
} from 'lucide-react';

interface SceneMediaBuilderProps {
  contentItem: ContentItem;
  contentAssets: ContentAsset[];
  onScenesUpdated?: (updatedScenes: Scene[]) => void;
  onRefreshAssets?: () => void;
}

export function SceneMediaBuilder({
  contentItem,
  contentAssets,
  onScenesUpdated,
  onRefreshAssets,
}: SceneMediaBuilderProps) {
  // Asegurar que las escenas tengan media_slots extraídos
  const rawScenes: Scene[] = Array.isArray(contentItem.scenes) ? contentItem.scenes : [];
  const [scenes, setScenes] = useState<Scene[]>(() => {
    return extractMediaSlotsFromScenes(rawScenes, contentItem.content_type, contentItem.platform);
  });

  // Modales
  const [selectedSlotForPicker, setSelectedSlotForPicker] = useState<{ slot: MediaSlot; scene: Scene } | null>(null);
  const [previewAsset, setPreviewAsset] = useState<ContentAsset | null>(null);
  const [uploadSlotTarget, setUploadSlotTarget] = useState<MediaSlot | null>(null);

  // Calcular Content Readiness global
  const contentReadiness = useMemo(() => {
    return calculateContentReadiness(scenes);
  }, [scenes]);

  // Manejador: Selección manual de un asset
  const handleSelectAsset = (asset: ContentAsset, slot: MediaSlot) => {
    const { scenes: updatedScenes } = manuallyResolveMediaSlot(
      scenes,
      slot.slot_id,
      asset,
      contentItem,
      null,
      'manual'
    );
    setScenes(updatedScenes);
    if (onScenesUpdated) onScenesUpdated(updatedScenes);
    setSelectedSlotForPicker(null);
  };

  // Manejador: Quitar asset de un slot
  const handleClearSlot = (slot: MediaSlot) => {
    const { scenes: updatedScenes } = clearMediaSlotResolution(scenes, slot.slot_id);
    setScenes(updatedScenes);
    if (onScenesUpdated) onScenesUpdated(updatedScenes);
  };



  return (
    <div className="bg-dark-900/90 border border-dark-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
      
      {/* Top Media Readiness Banner */}
      <div className="p-5 rounded-2xl bg-dark-950 border border-dark-800 flex items-center justify-between gap-4 flex-wrap shadow-inner">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
            contentReadiness.isReady 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              Media Plan & Scene Builder
            </div>
            <p className="text-xs text-slate-400">
              {contentReadiness.readyScenes} de {contentReadiness.totalScenes} escenas listas • {contentReadiness.resolvedRequiredSlots} de {contentReadiness.totalRequiredSlots} recursos obligatorios resueltos
            </p>
          </div>
        </div>

        <div>
          {contentReadiness.isReady ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              🟢 LISTO PARA RENDER
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950/40">
              <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
              🟡 REQUIERE {contentReadiness.missingRequiredSlots} RECURSO(S)
            </span>
          )}
        </div>
      </div>

      {/* Scene by Scene Workspace */}
      <div className="space-y-6">
        {scenes.map((scene) => {
          const sceneReadiness = calculateSceneReadiness(scene);

          return (
            <div
              key={scene.scene_number}
              className="p-5 rounded-2xl bg-dark-950/60 border border-dark-800/80 space-y-4 shadow-lg"
            >
              {/* Scene Header */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-dark-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-dark-900 border border-dark-700 text-white">
                    Escena {scene.scene_number}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {scene.duration_seconds}s
                  </span>
                </div>

                <div>
                  {sceneReadiness.isReady ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      🟢 Lista
                    </span>
                  ) : sceneReadiness.status === 'missing_one' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      🟡 Falta 1 recurso
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      🔴 Faltan {sceneReadiness.missingRequired} recursos
                    </span>
                  )}
                </div>
              </div>

              {/* Scene Direction Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-dark-900/60 p-2.5 rounded-xl border border-dark-800/60 space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Compass className="w-3 h-3 text-sky-400" />
                    Dirección Visual
                  </div>
                  <p className="text-slate-200 leading-relaxed">{scene.visual_direction}</p>
                </div>

                <div className="bg-dark-900/60 p-2.5 rounded-xl border border-dark-800/60 space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-emerald-400" />
                    Texto en Pantalla
                  </div>
                  <p className="text-emerald-200/90 font-medium italic leading-relaxed">
                    "{scene.on_screen_text || 'Sin texto en pantalla'}"
                  </p>
                </div>
              </div>

              {/* Slots List for this scene */}
              <div className="space-y-3 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-aura-400" />
                  Recursos Multimedia de la Escena ({scene.media_slots?.length || 0})
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {scene.media_slots?.map((slot) => {
                    const matchedAsset = contentAssets.find((a) => a.id === slot.asset_id) || null;

                    return (
                      <MediaSlotCard
                        key={slot.slot_id}
                        slot={slot}
                        resolvedAsset={matchedAsset}
                        onOpenPicker={(s) => setSelectedSlotForPicker({ slot: s, scene })}
                        onPreviewAsset={(asset) => setPreviewAsset(asset)}
                        onClearSlot={(s) => handleClearSlot(s)}
                        onUploadForSlot={(s) => setUploadSlotTarget(s)}
                      />
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal: Slot Asset Picker */}
      {selectedSlotForPicker && (
        <SlotAssetPickerModal
          isOpen={true}
          onClose={() => setSelectedSlotForPicker(null)}
          slot={selectedSlotForPicker.slot}
          scene={selectedSlotForPicker.scene}
          contentItem={contentItem}
          assets={contentAssets}
          onSelectAsset={handleSelectAsset}
          onOpenUpload={(slot) => {
            setUploadSlotTarget(slot);
            setSelectedSlotForPicker(null);
          }}
          onPreviewAsset={(asset) => setPreviewAsset(asset)}
        />
      )}

      {/* Modal: Asset Preview */}
      <AssetPreviewModal
        asset={previewAsset}
        isOpen={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
      />

      {/* Modal: Asset Upload Contextualizado al Slot */}
      {uploadSlotTarget && (
        <AssetUploadModal
          isOpen={true}
          onClose={() => setUploadSlotTarget(null)}
          workspaceId={contentItem.workspace_id || ''}
          brandId={contentItem.brand_id || ''}
          scope="content"
          contentItemId={contentItem.id}
          campaignId={contentItem.campaign_id || null}
          onAssetUploaded={() => {
            if (onRefreshAssets) onRefreshAssets();
            setUploadSlotTarget(null);
          }}
        />
      )}

    </div>
  );
}
