import { useState, useMemo } from 'react';
import { Scene, ContentItem } from '../../types/contentItem';
import { MediaSlot } from '../../types/mediaSlot';
import { ContentAsset, AssetScope } from '../../types/contentAsset';
import { 
  scoreAssetCandidate, 
  validateAssetCompatibility 
} from '../../services/mediaSourcingService';
import { Button } from '../common/Button';
import { 
  X, 
  Search, 
  Film, 
  Image as ImageIcon, 
  Tag, 
  Layers, 
  Music, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  UploadCloud, 
  Info,
  Compass
} from 'lucide-react';

interface SlotAssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: MediaSlot | null;
  scene: Scene | null;
  contentItem: ContentItem;
  assets: ContentAsset[];
  onSelectAsset: (asset: ContentAsset, slot: MediaSlot) => void;
  onOpenUpload: (slot: MediaSlot) => void;
  onPreviewAsset: (asset: ContentAsset) => void;
}

export function SlotAssetPickerModal({
  isOpen,
  onClose,
  slot,
  scene,
  contentItem,
  assets,
  onSelectAsset,
  onOpenUpload,
  onPreviewAsset,
}: SlotAssetPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | AssetScope>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'newest' | 'name'>('score');

  if (!isOpen || !slot || !scene) return null;

  // Evaluar compatibilidad y score de todos los assets cargados
  const evaluatedAssets = useMemo(() => {
    return assets.map((asset) => {
      const compat = validateAssetCompatibility(asset, slot, contentItem);
      const scoreResult = scoreAssetCandidate(asset, slot, contentItem);
      return {
        asset,
        isCompatible: compat.compatible,
        incompatibleReason: compat.reason,
        score: scoreResult.score,
        matchReason: scoreResult.reason,
      };
    });
  }, [assets, slot, contentItem]);

  // Candidatos recomendados por el resolver (compatibles y con score > 0)
  const recommendedCandidates = useMemo(() => {
    return evaluatedAssets
      .filter((item) => item.isCompatible && item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [evaluatedAssets]);

  // Filtrado de la biblioteca completa
  const filteredAssets = useMemo(() => {
    let list = evaluatedAssets;

    // Filtro por Tab de Scope
    if (activeTab !== 'all') {
      list = list.filter((item) => item.asset.asset_scope === activeTab);
    }

    // Filtro por Búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((item) => 
        item.asset.name.toLowerCase().includes(query) ||
        (item.asset.metadata?.tags && Array.isArray(item.asset.metadata.tags) && 
          item.asset.metadata.tags.some((t: string) => String(t).toLowerCase().includes(query)))
      );
    }

    // Ordenamiento
    return [...list].sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'newest') return new Date(b.asset.created_at).getTime() - new Date(a.asset.created_at).getTime();
      return a.asset.name.localeCompare(b.asset.name);
    });
  }, [evaluatedAssets, activeTab, searchQuery, sortBy]);

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
      case 'b_roll':
        return <Film className="w-3.5 h-3.5 text-pink-400" />;
      case 'image':
      case 'thumbnail':
        return <ImageIcon className="w-3.5 h-3.5 text-sky-400" />;
      case 'logo':
        return <Tag className="w-3.5 h-3.5 text-amber-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-purple-400" />;
      case 'background':
        return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-dark-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-dark-800 flex items-center justify-between bg-dark-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-aura-500/10 border border-aura-500/25 flex items-center justify-center text-aura-400">
              {getMediaIcon(slot.media_type)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Seleccionar Recurso Multimedia — Escena {scene.scene_number}
              </h2>
              <p className="text-xs text-slate-400">
                Slot: <strong className="text-slate-200 capitalize">{slot.media_type}</strong> {slot.required ? '(Obligatorio)' : '(Opcional)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scene & Slot Context Banner */}
        <div className="p-4 bg-dark-950/90 border-b border-dark-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3" />
              Dirección Visual de la Escena
            </div>
            <p className="text-slate-300 bg-dark-900/80 p-2 rounded-lg border border-dark-800 line-clamp-2">
              {scene.visual_direction}
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-aura-400 uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3 h-3" />
              Requerimiento Semántico del Slot
            </div>
            <p className="text-aura-100 bg-aura-950/30 p-2 rounded-lg border border-aura-800/40 font-medium italic line-clamp-2">
              "{slot.semantic_query || 'Cualquier recurso visual de apoyo'}"
            </p>
          </div>
        </div>

        {/* Modal Body with Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* Section: Recommended Candidates from Resolver */}
          {recommendedCandidates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Candidatos Recomendados por el Resolver ({recommendedCandidates.length})
                </h3>
                <span className="text-[11px] text-slate-400">Ordenados por coincidencia semántica</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                {recommendedCandidates.map(({ asset, score, matchReason }) => (
                  <div
                    key={asset.id}
                    className="p-3.5 rounded-2xl bg-dark-950 border border-amber-500/20 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 shadow-lg"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">{asset.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                          Score: {score}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="uppercase text-[9px] font-semibold px-1.5 py-0.2 rounded bg-dark-900 border border-dark-800 text-slate-300">
                          {asset.asset_scope}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">{matchReason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreviewAsset(asset)}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-sky-400" />}
                        className="text-xs text-slate-300 hover:text-white px-2"
                      >
                        Ver
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onSelectAsset(asset, slot)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-2.5"
                      >
                        Elegir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Full Asset Library */}
          <div className="space-y-4 pt-2 border-t border-dark-800">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-aura-400" />
                Explorar Biblioteca Completa ({filteredAssets.length})
              </h3>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenUpload(slot)}
                leftIcon={<UploadCloud className="w-3.5 h-3.5 text-sky-400" />}
                className="text-xs border-dark-700 hover:border-sky-500/50 text-slate-200"
              >
                + Subir nuevo para este slot
              </Button>
            </div>

            {/* Filters and Search Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-dark-950 p-2.5 rounded-2xl border border-dark-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'content', 'campaign', 'brand'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-aura-500/20 text-aura-300 border border-aura-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-dark-900'
                    }`}
                  >
                    {tab === 'all' ? 'Todos' : tab === 'content' ? 'Contenido' : tab === 'campaign' ? 'Campaña' : 'Marca'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o tag..."
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aura-500"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-dark-900 border border-dark-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-aura-500"
                >
                  <option value="score">Mejor score</option>
                  <option value="newest">Más recientes</option>
                  <option value="name">Nombre</option>
                </select>
              </div>
            </div>

            {/* Grid of Filtered Assets */}
            {filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-dark-950/50 rounded-2xl border border-dark-800">
                No se encontraron assets que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAssets.map(({ asset, isCompatible, incompatibleReason, score }) => (
                  <div
                    key={asset.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isCompatible 
                        ? 'bg-dark-950/80 border-dark-800 hover:border-dark-700' 
                        : 'bg-dark-950/40 border-rose-950/30 opacity-60'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-dark-900 border border-dark-800 text-slate-300">
                          {getMediaIcon(asset.asset_type)}
                          {asset.asset_type}
                        </span>

                        {isCompatible ? (
                          <span className="font-mono text-[10px] text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-950/40 border border-emerald-800/30">
                            Score: {score}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-rose-400 font-semibold px-1.5 py-0.2 rounded bg-rose-950/40 border border-rose-800/30">
                            Incompatible
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-white truncate" title={asset.name}>
                        {asset.name}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span className="capitalize">{asset.asset_scope}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(asset.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>

                      {!isCompatible && (
                        <div className="text-[10px] text-rose-300 bg-rose-950/30 p-1.5 rounded border border-rose-800/30">
                          {incompatibleReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dark-800/60">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreviewAsset(asset)}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-sky-400" />}
                        className="text-xs text-slate-400 hover:text-white px-2"
                      >
                        Preview
                      </Button>

                      <Button
                        variant={isCompatible ? "primary" : "outline"}
                        size="sm"
                        disabled={!isCompatible}
                        onClick={() => isCompatible && onSelectAsset(asset, slot)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        className={`text-xs ${
                          isCompatible 
                            ? 'bg-aura-600 hover:bg-aura-500 text-white font-semibold' 
                            : 'border-dark-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Seleccionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            La selección manual asigna el asset directamente al slot e inhabilita búsquedas automáticas.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
}
