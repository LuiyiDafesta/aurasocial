import { ContentAsset } from '../../types/contentAsset';
import { formatInArgentina } from '../../lib/dateUtils';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { 
  Info, 
  X, 
  Copy, 
  Trash2, 
  Eye, 
  Database, 
  Calendar, 
  HardDrive, 
  Target, 
  Layers, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface AssetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: ContentAsset | null;
  onPreview: (asset: ContentAsset) => void;
  onDelete: (asset: ContentAsset) => void;
}

export function AssetDetailsModal({
  isOpen,
  onClose,
  asset,
  onPreview,
  onDelete,
}: AssetDetailsModalProps) {
  const { toast } = useToast();

  if (!isOpen || !asset) return null;

  const handleCopyLink = () => {
    if (asset.signed_url) {
      navigator.clipboard.writeText(asset.signed_url);
      toast('Enlace temporal copiado al portapapeles (Válido por 1 hora)', { type: 'success' });
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(asset.storage_path);
    toast('Ruta canónica copiada al portapapeles', { type: 'info' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
    }
    return `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString()} bytes)`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800 bg-dark-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-aura-500/10 border border-aura-500/25 flex items-center justify-center text-aura-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Detalles del Asset Multimedia
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                ID: {asset.id.substring(0, 13)}...
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          
          {/* Main Info */}
          <div className="space-y-1 bg-dark-950/70 p-4 rounded-2xl border border-dark-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Nombre del Archivo
            </span>
            <p className="text-sm font-bold text-white break-words">
              {asset.name}
            </p>
          </div>

          {/* Technical Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Scope */}
            <div className="p-3 bg-dark-950/60 rounded-xl border border-dark-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-aura-400" /> Alcance (Scope)
              </span>
              <p className="font-bold text-white uppercase">{asset.asset_scope}</p>
            </div>

            {/* Asset Type */}
            <div className="p-3 bg-dark-950/60 rounded-xl border border-dark-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                <Database className="w-3 h-3 text-pink-400" /> Tipo
              </span>
              <p className="font-bold text-white uppercase">{asset.asset_type}</p>
            </div>

            {/* MIME Type */}
            <div className="p-3 bg-dark-950/60 rounded-xl border border-dark-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Formato MIME
              </span>
              <p className="font-mono text-slate-200">{asset.mime_type}</p>
            </div>

            {/* Size */}
            <div className="p-3 bg-dark-950/60 rounded-xl border border-dark-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-amber-400" /> Tamaño
              </span>
              <p className="font-mono text-slate-200">{formatFileSize(asset.file_size_bytes)}</p>
            </div>
          </div>

          {/* Context Links */}
          {asset.campaigns && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
              <span className="text-[10px] uppercase font-bold flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Vinculado a Campaña
              </span>
              <p className="font-semibold text-white">{asset.campaigns.name}</p>
            </div>
          )}

          {asset.content_items && (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 space-y-1">
              <span className="text-[10px] uppercase font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Vinculado a Pieza de Contenido
              </span>
              <p className="font-semibold text-white">{asset.content_items.title}</p>
            </div>
          )}

          {/* Storage Canonical Path */}
          <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ruta Canónica de Storage
              </span>
              <button
                onClick={handleCopyPath}
                className="text-[11px] text-aura-400 hover:text-aura-300 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copiar Ruta
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-300 break-all bg-dark-900 p-2 rounded-lg border border-dark-800">
              {asset.storage_bucket}/{asset.storage_path}
            </p>
          </div>

          {/* Timestamps */}
          <div className="p-3 rounded-xl bg-dark-950/60 border border-dark-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Fecha de Subida
            </span>
            <p className="text-slate-200">
              {formatInArgentina(asset.created_at, 'dd/MM/yyyy HH:mm:ss')} (Argentina UTC-3)
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-dark-800 bg-dark-900/90 flex items-center justify-between gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onDelete(asset);
            }}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
            className="text-xs hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300"
          >
            Eliminar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              leftIcon={<Copy className="w-3.5 h-3.5 text-aura-400" />}
              className="text-xs"
            >
              Copiar Link
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onPreview(asset);
              }}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              className="text-xs bg-aura-600 hover:bg-aura-500 text-white font-semibold"
            >
              Ver Preview
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
