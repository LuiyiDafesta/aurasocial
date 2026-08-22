import { MediaSlot } from '../../types/mediaSlot';
import { ContentAsset } from '../../types/contentAsset';
import { Button } from '../common/Button';
import { 
  Film, 
  Image as ImageIcon, 
  Tag, 
  Layers, 
  Music, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Trash2, 
  RefreshCw, 
  UserCheck, 
  UploadCloud 
} from 'lucide-react';

interface MediaSlotCardProps {
  slot: MediaSlot;
  resolvedAsset?: ContentAsset | null;
  onOpenPicker: (slot: MediaSlot) => void;
  onPreviewAsset: (asset: ContentAsset) => void;
  onClearSlot: (slot: MediaSlot) => void;
  onUploadForSlot?: (slot: MediaSlot) => void;
}

export function MediaSlotCard({
  slot,
  resolvedAsset,
  onOpenPicker,
  onPreviewAsset,
  onClearSlot,
  onUploadForSlot,
}: MediaSlotCardProps) {
  const isResolved = slot.status === 'resolved' && (slot.asset_id || resolvedAsset);
  const isManual = slot.resolution?.method === 'manual' || slot.resolution?.method === 'manual_upload';

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

  const assetName = resolvedAsset?.name || slot.resolution?.asset_name || 'Asset vinculado';
  const assetScope = resolvedAsset?.asset_scope || slot.resolution?.source_scope || 'brand';
  const assetScore = slot.resolution?.score;

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isResolved 
        ? isManual 
          ? 'bg-blue-950/20 border-blue-500/30' 
          : 'bg-emerald-950/20 border-emerald-500/30' 
        : 'bg-dark-900/90 border-dark-800 hover:border-dark-700'
    } space-y-3`}>
      
      {/* Top Slot Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-dark-950 border border-dark-800 text-slate-200">
            {getMediaIcon(slot.media_type)}
            <span className="capitalize">{slot.media_type.replace('_', ' ')}</span>
          </span>

          {slot.required ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Obligatorio
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Opcional
            </span>
          )}
        </div>

        {/* Status Badge */}
        {isResolved ? (
          isManual ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              🔵 SELECCIÓN MANUAL
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              🟢 RESUELTO
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            🟡 NECESITA ASSET
          </span>
        )}
      </div>

      {/* Semantic Query Requirement */}
      {slot.semantic_query && (
        <div className="text-xs text-slate-300 bg-dark-950/60 p-2.5 rounded-xl border border-dark-800/60">
          <span className="text-slate-400 font-medium">Requerimiento:</span>{' '}
          <em className="text-aura-200 font-normal">"{slot.semantic_query}"</em>
        </div>
      )}

      {/* Resolved Asset Details */}
      {isResolved ? (
        <div className="p-3 rounded-xl bg-dark-950/80 border border-dark-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-[200px] flex-1">
            <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
              <span>📦</span>
              <span className="truncate">{assetName}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Origen:</span>
              <span className="px-1.5 py-0.2 rounded bg-dark-900 border border-dark-800 text-slate-300 uppercase tracking-wider text-[10px] font-semibold">
                {assetScope === 'content' ? 'Contenido' : assetScope === 'campaign' ? 'Campaña' : assetScope === 'brand' ? 'Marca' : 'Local'}
              </span>
              {typeof assetScore === 'number' && (
                <span className="font-mono text-emerald-400 font-medium">
                  Score: {assetScore}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {resolvedAsset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPreviewAsset(resolvedAsset)}
                leftIcon={<Eye className="w-3.5 h-3.5 text-sky-400" />}
                className="text-xs text-slate-300 hover:text-white"
              >
                Ver
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenPicker(slot)}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-aura-400" />}
              className="text-xs border-dark-700 hover:border-aura-500/50 text-slate-200"
            >
              Cambiar
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClearSlot(slot)}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
              className="text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
              title="Quitar asset y volver a needs_asset"
            >
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-dark-950/80 border border-dashed border-dark-700/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-slate-300">
              Sin recurso asignado con suficiente confianza
            </div>
            {Array.isArray(slot.candidates) && slot.candidates.length > 0 && (
              <div className="text-[11px] text-amber-400 font-medium">
                {slot.candidates.length} candidato(s) evaluados disponibles para selección manual
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onUploadForSlot && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUploadForSlot(slot)}
                leftIcon={<UploadCloud className="w-3.5 h-3.5 text-sky-400" />}
                className="text-xs border-dark-700 hover:border-sky-500/50 text-slate-200"
              >
                Subir
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenPicker(slot)}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
            >
              Seleccionar Asset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
