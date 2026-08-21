import { ContentAsset } from '../../types/contentAsset';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { 
  FileText, 
  Film, 
  Music, 
  Copy, 
  Eye, 
  Trash2, 
  Info, 
  FolderTree, 
  Layers, 
  Target,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface AssetCardProps {
  asset: ContentAsset;
  onPreview: (asset: ContentAsset) => void;
  onViewDetails: (asset: ContentAsset) => void;
  onDelete: (asset: ContentAsset) => void;
  onSelect?: (asset: ContentAsset) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
}

export function AssetCard({
  asset,
  onPreview,
  onViewDetails,
  onDelete,
  onSelect,
  isSelectable = false,
  isSelected = false,
}: AssetCardProps) {
  const { toast } = useToast();

  const isImage = asset.mime_type.startsWith('image/');
  const isVideo = asset.mime_type.startsWith('video/');
  const isAudio = asset.mime_type.startsWith('audio/');
  const isPdf = asset.mime_type === 'application/pdf';

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (asset.signed_url) {
      navigator.clipboard.writeText(asset.signed_url);
      toast('Enlace temporal copiado al portapapeles (Válido por 1 hora)', { type: 'success' });
    } else {
      toast('No hay URL firmada disponible', { type: 'error' });
    }
  };

  const getScopeBadge = () => {
    switch (asset.asset_scope) {
      case 'brand':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Sparkles className="w-2.5 h-2.5 text-sky-400" />
            Marca
          </span>
        );
      case 'campaign':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate max-w-[140px]">
            <Target className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span className="truncate">{asset.campaigns?.name || 'Campaña'}</span>
          </span>
        );
      case 'content':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 truncate max-w-[140px]">
            <Layers className="w-2.5 h-2.5 text-purple-400 shrink-0" />
            <span className="truncate">{asset.content_items?.title || 'Contenido'}</span>
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => isSelectable && onSelect?.(asset)}
      className={`bg-dark-900 border rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-3.5 transition-all duration-200 group ${
        isSelected
          ? 'border-aura-500 ring-2 ring-aura-500/30 bg-aura-500/5'
          : 'border-dark-800 hover:border-dark-700'
      } ${isSelectable ? 'cursor-pointer' : ''}`}
    >
      {/* Preview Thumbnail Container */}
      <div 
        onClick={() => onPreview(asset)}
        className="relative aspect-video bg-dark-950 rounded-xl overflow-hidden border border-dark-800/80 flex items-center justify-center cursor-pointer group-hover:border-aura-500/30 transition-colors"
      >
        {isImage && asset.signed_url ? (
          <img
            src={asset.signed_url}
            alt={asset.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : isVideo ? (
          <div className="flex flex-col items-center justify-center space-y-1 text-pink-400">
            <Film className="w-8 h-8 opacity-80 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono text-slate-400">Video</span>
          </div>
        ) : isAudio ? (
          <div className="flex flex-col items-center justify-center space-y-1 text-emerald-400">
            <Music className="w-8 h-8 opacity-80 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono text-slate-400">Audio</span>
          </div>
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center space-y-1 text-rose-400">
            <FileText className="w-8 h-8 opacity-80 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono text-slate-400">PDF Document</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-1 text-slate-400">
            <FolderTree className="w-8 h-8 opacity-80" />
            <span className="text-[10px] font-mono text-slate-400">Archivo</span>
          </div>
        )}

        {/* Hover Quick Preview Pill */}
        <div className="absolute inset-0 bg-dark-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-dark-900/90 text-white text-xs font-semibold border border-dark-700 shadow-xl">
            <Eye className="w-3.5 h-3.5 text-aura-400" />
            Ver Preview
          </span>
        </div>
      </div>

      {/* Asset Info */}
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {getScopeBadge()}
          <span className="text-[10px] font-mono font-semibold text-slate-400 bg-dark-950 px-2 py-0.5 rounded border border-dark-800">
            {formatFileSize(asset.file_size_bytes)}
          </span>
        </div>

        <h4 className="text-xs font-bold text-white tracking-tight truncate group-hover:text-aura-300 transition-colors" title={asset.name}>
          {asset.name}
        </h4>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="uppercase text-aura-400/90 font-semibold">{asset.asset_type}</span>
          <span>{formatInArgentina(asset.created_at, 'dd/MM/yyyy')}</span>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-2 border-t border-dark-800/80 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyLink}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            title="Copiar URL firmada (1 hora)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(asset);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            title="Ver detalles técnicos"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(asset);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar asset"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {isSelectable && (
            <Button
              variant={isSelected ? "primary" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(asset);
              }}
              className="text-[11px] h-7 px-2.5"
            >
              {isSelected ? "Seleccionado" : "Seleccionar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
