import { ContentAsset } from '../../types/contentAsset';
import { Button } from '../common/Button';
import { 
  X, 
  Download, 
  ExternalLink, 
  Film, 
  Music, 
  FileText, 
  Image as ImageIcon 
} from 'lucide-react';

interface AssetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: ContentAsset | null;
}

export function AssetPreviewModal({ isOpen, onClose, asset }: AssetPreviewModalProps) {
  if (!isOpen || !asset) return null;

  const isImage = asset.mime_type.startsWith('image/');
  const isVideo = asset.mime_type.startsWith('video/');
  const isAudio = asset.mime_type.startsWith('audio/');
  const isPdf = asset.mime_type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-dark-900 border border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-dark-800 bg-dark-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-dark-800 flex items-center justify-center text-aura-400 shrink-0">
              {isImage ? (
                <ImageIcon className="w-4 h-4" />
              ) : isVideo ? (
                <Film className="w-4 h-4" />
              ) : isAudio ? (
                <Music className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate" title={asset.name}>
                {asset.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {asset.mime_type} • {(asset.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {asset.signed_url && (
              <>
                <a
                  href={asset.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={asset.signed_url}
                  download={asset.name}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                  title="Descargar archivo"
                >
                  <Download className="w-4 h-4" />
                </a>
              </>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Viewer Area */}
        <div className="flex-1 bg-dark-950 flex items-center justify-center p-4 min-h-[360px] max-h-[70vh] overflow-hidden">
          {isImage && asset.signed_url ? (
            <img
              src={asset.signed_url}
              alt={asset.name}
              className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg"
            />
          ) : isVideo && asset.signed_url ? (
            <video
              src={asset.signed_url}
              controls
              autoPlay
              className="max-w-full max-h-[65vh] rounded-xl shadow-2xl bg-black"
            />
          ) : isAudio && asset.signed_url ? (
            <div className="p-8 text-center space-y-6 w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                <Music className="w-8 h-8 animate-pulse" />
              </div>
              <audio src={asset.signed_url} controls autoPlay className="w-full" />
            </div>
          ) : isPdf && asset.signed_url ? (
            <iframe
              src={asset.signed_url}
              title={asset.name}
              className="w-full h-[65vh] rounded-xl border border-dark-800"
            />
          ) : (
            <div className="p-8 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-white">Vista previa no disponible en el navegador</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Podés descargar el archivo o abrirlo en una nueva pestaña para visualizarlo.
              </p>
              {asset.signed_url && (
                <div className="pt-2">
                  <a
                    href={asset.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-aura-600 hover:bg-aura-500 text-white text-xs font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Archivo
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-6 border-t border-dark-800 bg-dark-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Path: <strong className="font-mono text-slate-300">{asset.storage_path}</strong></span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
}
